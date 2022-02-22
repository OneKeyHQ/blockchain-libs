import BigNumber from 'bignumber.js';
import {
  NonWitnessUtxo,
  RedeemScript,
  WitnessUtxo,
} from 'bip174/src/lib/interfaces';
import * as BitcoinJS from 'bitcoinjs-lib';

import { check } from '../../../basic/precondtion';
import { verify } from '../../../secret';
import {
  AddressValidation,
  SignedTx,
  UnsignedTx,
} from '../../../types/provider';
import { Signer, Verifier } from '../../../types/secret';
import { BaseProvider } from '../../abc';

import { BlockBook } from './blockbook';
import { estimateVsize, loadOPReturn, PLACEHOLDER_VSIZE } from './sdk/vsize';

const validator = (
  pubkey: Buffer,
  msghash: Buffer,
  signature: Buffer,
): boolean => verify('secp256k1', pubkey, msghash, signature);

enum SupportedEncodings {
  p2pkh = 'P2PKH',
  p2sh$p2wpkh = 'P2SH_P2WPKH',
  p2wpkh = 'P2WPKH',
}

class Provider extends BaseProvider {
  // private _network: BitcoinJS.Network;

  get network(): BitcoinJS.Network {
    return BitcoinJS.networks.bitcoin; // todo
  }

  get blockbook(): Promise<BlockBook> {
    return this.clientSelector((client) => client instanceof BlockBook);
  }

  async pubkeyToAddress(
    verifier: Verifier,
    encoding?: string,
  ): Promise<string> {
    const pubkey = await verifier.getPubkey(true);
    const payment = await this.pubkeyToPayment(pubkey, encoding);

    const { address } = payment;
    check(typeof address === 'string' && address);
    return address as string;
  }

  async verifyAddress(address: string): Promise<AddressValidation> {
    let encoding: string | undefined = undefined;

    try {
      const decoded = BitcoinJS.address.fromBase58Check(address);
      if (
        decoded.version === this.network.pubKeyHash &&
        decoded.hash.length === 20
      ) {
        encoding = SupportedEncodings.p2pkh;
      } else if (
        decoded.version === this.network.scriptHash &&
        decoded.hash.length === 20
      ) {
        encoding = SupportedEncodings.p2sh$p2wpkh; // Cannot distinguish between legacy P2SH and P2SH_P2WPKH
      }
    } catch (e) {
      try {
        const decoded = BitcoinJS.address.fromBech32(address);
        if (
          decoded.version === 0x00 &&
          decoded.prefix === this.network.bech32 &&
          decoded.data.length === 20
        ) {
          encoding = SupportedEncodings.p2wpkh;
        }
      } catch (e) {
        // ignored
      }
    }

    return encoding
      ? {
          displayAddress: address,
          normalizedAddress: address,
          encoding,
          isValid: true,
        }
      : { isValid: false };
  }

  async buildUnsignedTx(unsignedTx: UnsignedTx): Promise<UnsignedTx> {
    const {
      inputs,
      outputs,
      payload: { opReturn },
    } = unsignedTx;
    let { feeLimit, feePricePerUnit } = unsignedTx;

    if (inputs.length > 0 && outputs.length > 0) {
      const inputAddressEncodings = await this.parseAddressEncodings(
        inputs.map((i) => i.address),
      );
      const outputAddressEncodings = await this.parseAddressEncodings(
        outputs.map((i) => i.address),
      );

      if (
        inputAddressEncodings.length === inputs.length &&
        outputAddressEncodings.length === outputs.length
      ) {
        const vsize = estimateVsize(
          inputAddressEncodings,
          outputAddressEncodings,
          opReturn,
        );
        feeLimit =
          feeLimit && feeLimit.gte(vsize) ? feeLimit : new BigNumber(vsize);
      }
    }

    feeLimit = feeLimit || new BigNumber(PLACEHOLDER_VSIZE);
    feePricePerUnit =
      feePricePerUnit ||
      (await this.blockbook
        .then((client) => client.getFeePricePerUnit())
        .then((fee) => fee.normal.price));

    return Object.assign({}, unsignedTx, {
      feeLimit,
      feePricePerUnit,
    });
  }

  async signTransaction(
    unsignedTx: UnsignedTx,
    signers: { [p: string]: Signer },
  ): Promise<SignedTx> {
    const psdt = await this.packTransaction(unsignedTx, signers);

    for (let i = 0; i < unsignedTx.inputs.length; ++i) {
      const address = unsignedTx.inputs[i].address;
      const signer = signers[address];
      const publicKey = await signer.getPubkey(true);

      await psdt.signInputAsync(i, {
        publicKey,
        sign: async (hash: Buffer) => {
          const [sig] = await signer.sign(hash);
          return sig;
        },
      });
    }
    psdt.validateSignaturesOfAllInputs(validator);
    psdt.finalizeAllInputs();

    const tx = psdt.extractTransaction();
    return {
      txid: tx.getId(),
      rawTx: tx.toHex(),
    };
  }

  private async pubkeyToPayment(
    pubkey: Buffer,
    encoding?: string,
  ): Promise<BitcoinJS.Payment> {
    let payment: BitcoinJS.Payment = {
      pubkey: pubkey,
      network: this.network,
    };

    switch (encoding) {
      case SupportedEncodings.p2pkh:
        payment = BitcoinJS.payments.p2pkh(payment);
        break;

      case SupportedEncodings.p2wpkh:
        payment = BitcoinJS.payments.p2wpkh(payment);
        break;

      case SupportedEncodings.p2sh$p2wpkh:
        payment = BitcoinJS.payments.p2sh({
          redeem: BitcoinJS.payments.p2wpkh(payment),
          network: this.network,
        });
        break;

      default:
        throw new Error(`Invalid encoding: ${encoding}`);
    }

    return payment;
  }

  private parseAddressEncodings(addresses: string[]): Promise<string[]> {
    return Promise.allSettled(
      addresses.map((address) => this.verifyAddress(address)),
    ).then(
      (results) =>
        results
          .filter((i) => i.status === 'fulfilled' && i.value.isValid)
          .map(
            (i) =>
              (i as PromiseFulfilledResult<AddressValidation>).value.encoding,
          ) as string[],
    );
  }

  private async packTransaction(
    unsignedTx: UnsignedTx,
    signers: { [p: string]: Signer },
  ): Promise<BitcoinJS.Psbt> {
    const {
      inputs,
      outputs,
      payload: { opReturn },
    } = unsignedTx;

    const [inputAddressesEncodings, nonWitnessPrevTxs] =
      await this.collectInfoForSign(unsignedTx);

    const psbt = new BitcoinJS.Psbt({ network: this.network });

    for (let i = 0; i < inputs.length; ++i) {
      const input = inputs[i];
      const encoding = inputAddressesEncodings[i];
      const mixin: {
        nonWitnessUtxo?: NonWitnessUtxo;
        witnessUtxo?: WitnessUtxo;
        redeemScript?: RedeemScript;
      } = {};

      switch (encoding) {
        case SupportedEncodings.p2pkh:
          mixin.nonWitnessUtxo = Buffer.from(
            nonWitnessPrevTxs[input.utxo!.txid],
          );
          break;
        case SupportedEncodings.p2wpkh:
          mixin.witnessUtxo = {
            script: (
              await this.pubkeyToPayment(
                await signers[input.address].getPubkey(true),
                encoding,
              )
            ).output!,
            value: input.utxo!.value.integerValue().toNumber(),
          };
          break;
        case SupportedEncodings.p2sh$p2wpkh:
          {
            const payment = await this.pubkeyToPayment(
              await signers[input.address].getPubkey(true),
              encoding,
            );
            mixin.witnessUtxo = {
              script: payment.output!,
              value: input.utxo!.value.integerValue().toNumber(),
            };
            mixin.redeemScript = payment.redeem!.output!;
          }
          break;
      }

      psbt.addInput({
        hash: input.utxo!.txid,
        index: input.utxo!.vout,
        ...mixin,
      });
    }

    outputs.forEach((output) => {
      psbt.addOutput({
        address: output.address,
        value: output.value.integerValue().toNumber(),
      });
    });

    if (typeof opReturn === 'string') {
      const embed = BitcoinJS.payments.embed({
        data: [loadOPReturn(opReturn)],
      });
      psbt.addOutput({
        script: embed.output!,
        value: 0,
      });
    }

    return psbt;
  }

  private async collectInfoForSign(
    unsignedTx: UnsignedTx,
  ): Promise<[string[], Record<string, string>]> {
    const { inputs, outputs } = unsignedTx;

    const inputAddressesEncodings = await this.parseAddressEncodings(
      inputs.map((i) => i.address),
    );
    check(
      inputAddressesEncodings.length === inputs.length,
      'Found invalid address from inputs',
    );

    const nonWitnessInputPrevTxids = Array.from(
      new Set(
        inputAddressesEncodings
          .map((encoding, index) => {
            if (encoding === SupportedEncodings.p2pkh) {
              return inputs[index].utxo!.txid;
            }
          })
          .filter((i) => !!i) as string[],
      ),
    );

    const blockbook = await this.blockbook;
    const nonWitnessPrevTxs: Record<string, string> = {};

    for (
      let i = 0, batchSize = 5;
      i < nonWitnessInputPrevTxids.length;
      i += batchSize
    ) {
      const batchTxids = nonWitnessInputPrevTxids.slice(i, i + batchSize);
      const txs = await Promise.all(
        batchTxids.map((txid) => blockbook.getRawTransaction(txid)),
      );
      batchTxids.forEach(
        (txid, index) => (nonWitnessPrevTxs[txid] = txs[index]),
      );
    }

    return [inputAddressesEncodings, nonWitnessPrevTxs];
  }
}

export { Provider };

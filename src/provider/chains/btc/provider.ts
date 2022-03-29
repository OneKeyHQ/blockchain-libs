import OneKeyConnect, {
  RefTransaction,
  TxInputType,
  TxOutputType,
} from '@onekeyfe/connect';
// @ts-ignore
import * as pathUtils from '@onekeyfe/connect/lib/utils/pathUtils';
import BigNumber from 'bignumber.js';
import {
  NonWitnessUtxo,
  RedeemScript,
  WitnessUtxo,
} from 'bip174/src/lib/interfaces';
import * as BitcoinJS from 'bitcoinjs-lib';
import bitcoinMessage from 'bitcoinjs-message';

import { check, checkIsDefined } from '../../../basic/precondtion';
import { verify } from '../../../secret';
import {
  AddressValidation,
  SignedTx,
  TxInput,
  TxOutput,
  TypedMessage,
  UnsignedTx,
  UTXO,
} from '../../../types/provider';
import { Signer, Verifier } from '../../../types/secret';
import { BaseProvider } from '../../abc';

import { BlockBook } from './blockbook';
import { getNetwork } from './sdk/networks';
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
  get network(): BitcoinJS.Network {
    return getNetwork(this.chainInfo.code);
  }

  get blockbook(): Promise<BlockBook> {
    return this.clientSelector((client) => client instanceof BlockBook);
  }

  async pubkeyToAddress(
    verifier: Verifier,
    encoding?: string,
  ): Promise<string> {
    const pubkey = await verifier.getPubkey(true);
    console.log('pub', pubkey.toString('hex'), encoding);
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

  async signMessage(
    { message }: TypedMessage,
    signer: Signer,
    address?: string,
  ): Promise<string> {
    check(address, '"Address" required');
    const validation = await this.verifyAddress(address as string);
    check(validation.isValid, 'Invalid Address');

    let signOptions: Record<string, unknown> | undefined = undefined;
    if (validation.encoding === SupportedEncodings.p2wpkh) {
      signOptions = { segwitType: 'p2wpkh' };
    } else if (validation.encoding === SupportedEncodings.p2sh$p2wpkh) {
      signOptions = { segwitType: 'p2sh(p2wpkh)' };
    }

    const sig = await bitcoinMessage.signAsync(
      message,
      {
        sign: async (digest: Uint8Array) => {
          const [signature, recovery] = await signer.sign(Buffer.from(digest));
          return { signature, recovery };
        },
      },
      true,
      this.network.messagePrefix,
      signOptions,
    );
    return sig.toString('base64');
  }

  async verifyMessage(
    address: string,
    { message }: TypedMessage,
    signature: string,
  ): Promise<boolean> {
    const validation = await this.verifyAddress(address);
    check(validation.isValid, 'Invalid Address');

    const checkSegwitAlways =
      validation.encoding === SupportedEncodings.p2wpkh ||
      validation.encoding === SupportedEncodings.p2sh$p2wpkh;

    return bitcoinMessage.verify(
      message,
      address,
      signature,
      this.network.messagePrefix,
      checkSegwitAlways,
    );
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
      await this.collectInfoForSoftwareSign(unsignedTx);

    const psbt = new BitcoinJS.Psbt({ network: this.network });

    for (let i = 0; i < inputs.length; ++i) {
      const input = inputs[i];
      const utxo = input.utxo as UTXO;
      check(utxo);

      const encoding = inputAddressesEncodings[i];
      const mixin: {
        nonWitnessUtxo?: NonWitnessUtxo;
        witnessUtxo?: WitnessUtxo;
        redeemScript?: RedeemScript;
      } = {};

      switch (encoding) {
        case SupportedEncodings.p2pkh:
          mixin.nonWitnessUtxo = Buffer.from(nonWitnessPrevTxs[utxo.txid]);
          break;
        case SupportedEncodings.p2wpkh:
          mixin.witnessUtxo = {
            script: checkIsDefined(
              await this.pubkeyToPayment(
                await signers[input.address].getPubkey(true),
                encoding,
              ),
            ).output as Buffer,
            value: utxo.value.integerValue().toNumber(),
          };
          break;
        case SupportedEncodings.p2sh$p2wpkh:
          {
            const payment = checkIsDefined(
              await this.pubkeyToPayment(
                await signers[input.address].getPubkey(true),
                encoding,
              ),
            );
            mixin.witnessUtxo = {
              script: payment.output as Buffer,
              value: utxo.value.integerValue().toNumber(),
            };
            mixin.redeemScript = payment.redeem?.output as Buffer;
          }
          break;
      }

      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
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
        script: checkIsDefined(embed.output),
        value: 0,
      });
    }

    return psbt;
  }

  private async collectInfoForSoftwareSign(
    unsignedTx: UnsignedTx,
  ): Promise<[string[], Record<string, string>]> {
    const { inputs } = unsignedTx;

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
              return checkIsDefined(inputs[index].utxo).txid;
            }
          })
          .filter((i) => !!i) as string[],
      ),
    );
    const nonWitnessPrevTxs = await this.collectTxs(nonWitnessInputPrevTxids);

    return [inputAddressesEncodings, nonWitnessPrevTxs];
  }

  private async collectTxs(txids: string[]): Promise<Record<string, string>> {
    const blockbook = await this.blockbook;
    const lookup: Record<string, string> = {};

    for (let i = 0, batchSize = 5; i < txids.length; i += batchSize) {
      const batchTxids = txids.slice(i, i + batchSize);
      const txs = await Promise.all(
        batchTxids.map((txid) => blockbook.getRawTransaction(txid)),
      );
      batchTxids.forEach((txid, index) => (lookup[txid] = txs[index]));
    }

    return lookup;
  }

  get hardwareCoinName(): string {
    const name = this.chainInfo.implOptions?.hardwareCoinName;
    check(
      typeof name === 'string' && name,
      `Please config hardwareCoinName for ${this.chainInfo.code}`,
    );
    return name;
  }

  async hardwareGetXpubs(
    paths: string[],
    showOnDevice: boolean,
  ): Promise<{ path: string; xpub: string }[]> {
    const resp = await this.wrapHardwareCall(() =>
      OneKeyConnect.getPublicKey({
        bundle: paths.map((path) => ({
          path,
          coin: this.hardwareCoinName,
          showOnTrezor: showOnDevice,
        })),
      }),
    );

    return resp.map((i) => ({
      path: i.serializedPath,
      xpub: i.xpub,
    }));
  }

  async hardwareGetAddress(
    path: string,
    showOnDevice: boolean,
    addressToVerify?: string,
  ): Promise<string> {
    const params = {
      path,
      coin: this.hardwareCoinName,
      showOnTrezor: showOnDevice,
    };

    typeof addressToVerify === 'string' &&
      Object.assign(params, { address: addressToVerify });

    const { address } = await this.wrapHardwareCall(() =>
      OneKeyConnect.getAddress(params),
    );
    return address;
  }

  async hardwareSignTransaction(
    unsignedTx: UnsignedTx,
    signers: Record<string, string>,
  ): Promise<SignedTx> {
    const { inputs, outputs } = unsignedTx;
    const prevTxids = Array.from(
      new Set(inputs.map((i) => (i.utxo as UTXO).txid)),
    );
    const prevTxs = await this.collectTxs(prevTxids);

    const { serializedTx } = await this.wrapHardwareCall(() =>
      OneKeyConnect.signTransaction({
        useEmptyPassphrase: true,
        coin: this.hardwareCoinName,
        inputs: inputs.map((i) => buildHardwareInput(i, signers[i.address])),
        outputs: outputs.map((o) => buildHardwareOutput(o)),
        refTxs: Object.values(prevTxs).map((i) => buildPrevTx(i)),
      }),
    );

    const tx = BitcoinJS.Transaction.fromHex(serializedTx);

    return { txid: tx.getId(), rawTx: serializedTx };
  }

  async hardwareSignMessage(
    { message }: TypedMessage,
    signer: string,
  ): Promise<string> {
    const { signature } = await this.wrapHardwareCall(() =>
      OneKeyConnect.signMessage({
        path: signer,
        message,
        coin: this.hardwareCoinName,
      }),
    );
    return signature as string;
  }

  async hardwareVerifyMessage(
    address: string,
    { message }: TypedMessage,
    signature: string,
  ): Promise<boolean> {
    const { message: resp } = await this.wrapHardwareCall(() =>
      OneKeyConnect.verifyMessage({
        address,
        signature,
        message,
        coin: this.hardwareCoinName,
      }),
    );

    return resp === 'Message verified';
  }
}

const buildPrevTx = (rawTx: string): RefTransaction => {
  const tx = BitcoinJS.Transaction.fromHex(rawTx);

  return {
    hash: tx.getId(),
    version: tx.version,
    inputs: tx.ins.map((i) => ({
      prev_hash: i.hash.reverse().toString('hex'),
      prev_index: i.index,
      script_sig: i.script.toString('hex'),
      sequence: i.sequence,
    })),
    bin_outputs: tx.outs.map((o) => ({
      amount: o.value,
      script_pubkey: o.script.toString('hex'),
    })),
    lock_time: tx.locktime,
  };
};

const buildHardwareInput = (input: TxInput, path: string): TxInputType => {
  const addressN = pathUtils.getHDPath(path);
  const scriptType = pathUtils.getScriptType(addressN);
  const utxo = input.utxo as UTXO;
  check(utxo);

  return {
    prev_index: utxo.vout,
    prev_hash: utxo.txid,
    amount: utxo.value.integerValue().toString(),
    address_n: addressN,
    script_type: scriptType,
  };
};

const buildHardwareOutput = (output: TxOutput): TxOutputType => {
  const { isCharge, bip44Path } = output.payload || {};

  if (isCharge && bip44Path) {
    const addressN = pathUtils.getHDPath(bip44Path);
    const scriptType = pathUtils.getScriptType(addressN);
    return {
      script_type: scriptType,
      address_n: addressN,
      amount: output.value.integerValue().toString(),
    };
  }

  return {
    script_type: 'PAYTOADDRESS',
    address: output.address,
    amount: output.value.integerValue().toString(),
  };
};

export { Provider, SupportedEncodings };

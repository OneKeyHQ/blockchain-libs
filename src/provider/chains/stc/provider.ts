import { arrayify, hexlify } from '@ethersproject/bytes';
import {
  bcs,
  crypto_hash,
  starcoin_types,
  encoding as stcEncoding,
  utils,
} from '@starcoin/starcoin';

import { check } from '../../../basic/precondtion';
import {
  AddressValidation,
  SignedTx,
  UnsignedTx,
} from '../../../types/provider';
import { Signer, Verifier } from '../../../types/secret';
import { BaseProvider } from '../../abc';

import { StcClient } from './starcoin';

class Provider extends BaseProvider {
  get starcoin(): Promise<StcClient> {
    return this.clientSelector((i) => i instanceof StcClient);
  }
  async buildUnsignedTx(unsignedTx: UnsignedTx): Promise<UnsignedTx> {
    const feePricePerUnit = unsignedTx.feePricePerUnit
      ? unsignedTx.feePricePerUnit
      : (await (await this.starcoin).getFeePricePerUnit()).normal.price;
    const txInput = unsignedTx.inputs[0];
    const txOutput = unsignedTx.outputs[0];
    const payload = unsignedTx.payload || {};
    let nonce = unsignedTx.nonce;
    let feeLimit = unsignedTx.feeLimit;
    if (txInput && txOutput) {
      const senderPublicKey = txInput.publicKey;
      if (!feeLimit) {
        check(senderPublicKey, 'senderPublicKey is required');
      }
      const fromAddr = txInput.address;
      let toAddr = txOutput.address;
      const amount = txOutput.value;
      const tokenAddress = txOutput.tokenAddress;
      if (toAddr.startsWith('stc')) {
        const riv = stcEncoding.decodeReceiptIdentifier(toAddr);
        toAddr = riv.accountAddress.startsWith('0x')
          ? riv.accountAddress
          : '0x' + riv.accountAddress;
      }
      if (typeof nonce === 'undefined') {
        nonce = (await (await this.starcoin).getAddresses([fromAddr]))[0]
          ?.nonce;
        check(typeof nonce !== 'undefined', 'nonce is not available');
      }
      payload.expirationTime =
        payload.expirationTime || Math.floor(Date.now() / 1000) + 60 * 60;
      const strTypeArgs = [tokenAddress ?? '0x1::STC::STC'];
      const tyArgs = utils.tx.encodeStructTypeTags(strTypeArgs);
      const functionId = '0x1::TransferScripts::peer_to_peer_v2';
      const amountSCSHex = (function () {
        const se = new bcs.BcsSerializer();
        se.serializeU128(BigInt(amount.toNumber()));
        return hexlify(se.getBytes());
      })();
      const args = [arrayify(toAddr), arrayify(amountSCSHex)];
      payload.scriptFn = utils.tx.encodeScriptFunction(
        functionId,
        tyArgs,
        args,
      );
      feeLimit =
        feeLimit ||
        (await (
          await this.starcoin
        ).estimateGasLimit({
          chain_id: this.chainInfo.implOptions.chainId,
          gas_unit_price: feePricePerUnit.toNumber(),
          sender: fromAddr,
          sender_public_key: senderPublicKey,
          sequence_number: nonce,
          max_gas_amount: 1000000,
          script: {
            code: functionId,
            type_args: strTypeArgs,
            args: [toAddr, '19950u128'],
          },
        }));
    }
    return {
      inputs: txInput ? [txInput] : [],
      outputs: txOutput ? [txOutput] : [],
      feeLimit,
      feePricePerUnit,
      nonce,
      payload,
    };
  }

  async pubkeyToAddress(verifier: Verifier, encoding = 'hex'): Promise<string> {
    let address = '';
    const pubkeyBytes = await verifier.getPubkey();
    if (encoding === 'hex') {
      address = stcEncoding.publicKeyToAddress(pubkeyBytes.toString('hex'));
    } else if (encoding === 'bech32') {
      address = stcEncoding.publicKeyToReceiptIdentifier(
        pubkeyBytes.toString('hex'),
      );
    } else {
      throw new Error('invalid encoding');
    }
    return address;
  }

  async signTransaction(
    unsignedTx: UnsignedTx,
    signers: { [p: string]: Signer },
  ): Promise<SignedTx> {
    const fromAddr = unsignedTx.inputs[0].address;
    const scriptFn = unsignedTx.payload.scriptFn;
    const gasLimit = unsignedTx.feeLimit;
    const gasPrice = unsignedTx.feePricePerUnit;
    const nonce = unsignedTx.nonce;
    const expirationTime = unsignedTx.payload.expirationTime;
    const chainId = this.chainInfo.implOptions.chainId;
    if (
      !fromAddr ||
      !scriptFn ||
      !gasLimit ||
      !gasPrice ||
      typeof nonce === 'undefined'
    ) {
      throw new Error('invalid unsignedTx');
    } else {
      const rawTxn = utils.tx.generateRawUserTransaction(
        fromAddr,
        scriptFn,
        gasLimit.toNumber(),
        gasPrice.toNumber(),
        nonce,
        expirationTime,
        chainId,
      );
      const hashSeedBytes = crypto_hash
        .createRawUserTransactionHasher()
        .get_salt();
      const rawUserTransactionBytes = (function () {
        const se = new bcs.BcsSerializer();
        rawTxn.serialize(se);
        return se.getBytes();
      })();
      const msgBytes = ((a, b) => {
        const tmp = new Uint8Array(a.length + b.length);
        tmp.set(a, 0);
        tmp.set(b, a.length);
        return tmp;
      })(hashSeedBytes, rawUserTransactionBytes);
      const [_signature, _] = await signers[fromAddr].sign(
        Buffer.from(msgBytes),
      );
      const senderPublicKey = unsignedTx.inputs[0].publicKey;
      check(
        typeof senderPublicKey !== 'undefined',
        'senderPublicKey is required',
      );
      const publicKey = new starcoin_types.Ed25519PublicKey(
        Buffer.from(senderPublicKey as string, 'hex'),
      );
      const signature = new starcoin_types.Ed25519Signature(_signature);
      const transactionAuthenticatorVariantEd25519 =
        new starcoin_types.TransactionAuthenticatorVariantEd25519(
          publicKey,
          signature,
        );
      const signedUserTransaction = new starcoin_types.SignedUserTransaction(
        rawTxn,
        transactionAuthenticatorVariantEd25519,
      );
      const se = new bcs.BcsSerializer();
      signedUserTransaction.serialize(se);
      const txid = crypto_hash
        .createUserTransactionHasher()
        .crypto_hash(se.getBytes());
      const rawTx = hexlify(se.getBytes());
      return { txid, rawTx: rawTx };
    }
  }
  async verifyAddress(address: string): Promise<AddressValidation> {
    let isValid = true;
    let encoding = undefined;
    let normalizeAddress = address;
    if (address.startsWith('stc')) {
      try {
        const riv = stcEncoding.decodeReceiptIdentifier(address);
        normalizeAddress = '0x' + riv.accountAddress;
        encoding = 'bech32';
      } catch (error) {
        isValid = false;
      }
    } else {
      try {
        const accountAddress = stcEncoding.addressToSCS(address);
        // in order to check invalid address length, because the auto padding 0 at head of address
        if (
          stcEncoding.addressFromSCS(accountAddress) ===
          (address.startsWith('0x') ? address : '0x' + address)
        ) {
          encoding = 'hex';
        } else {
          isValid = false;
        }
      } catch (error) {
        isValid = false;
      }
    }

    return {
      normalizedAddress: isValid ? normalizeAddress : undefined,
      displayAddress: isValid ? address : undefined,
      isValid,
      encoding,
    };
  }
}

export { Provider };

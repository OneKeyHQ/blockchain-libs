import { hexlify } from '@ethersproject/bytes';
import OneKeyConnect from '@onekeyfe/js-sdk';
import {
  bcs,
  crypto_hash,
  starcoin_types,
  encoding as stcEncoding,
  utils,
} from '@starcoin/starcoin';
import * as ethUtil from 'ethereumjs-util';

import { check } from '../../../basic/precondtion';
import {
  AddressValidation,
  SignedTx,
  TypedMessage,
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
    const fromAddr = txInput.address;
    let txPayload: starcoin_types.TransactionPayload;
    if (txInput && txOutput) {
      let toAddr = txOutput.address;
      const amount = txOutput.value;
      const tokenAddress = txOutput.tokenAddress;
      if (toAddr.startsWith('stc')) {
        const riv = stcEncoding.decodeReceiptIdentifier(toAddr);
        toAddr = riv.accountAddress.startsWith('0x')
          ? riv.accountAddress
          : '0x' + riv.accountAddress;
      }
      const typeArgs = [tokenAddress ?? '0x1::STC::STC'];
      const functionId = '0x1::TransferScripts::peer_to_peer_v2';
      const args = [toAddr, BigInt(amount.toNumber())];
      const nodeUrl = (await this.starcoin).rpc.url;
      const scriptFunction = (await utils.tx.encodeScriptFunctionByResolve(
        functionId,
        typeArgs,
        args,
        nodeUrl,
      )) as starcoin_types.TransactionPayload;
      payload.scriptFn = scriptFunction;
      txPayload = scriptFunction;
    } else if (payload.data) {
      txPayload = stcEncoding.bcsDecode(
        starcoin_types.TransactionPayload,
        payload.data,
      );
    } else {
      // should not be here
      throw new Error('invalid unsignedTx payload');
    }
    const senderPublicKey = txInput.publicKey || '';
    if (!feeLimit) {
      check(senderPublicKey, 'senderPublicKey is required');
    }
    if (typeof nonce === 'undefined') {
      nonce = (await (await this.starcoin).getAddresses([fromAddr]))[0]?.nonce;
      check(typeof nonce !== 'undefined', 'nonce is not available');
    }
    payload.expirationTime =
      payload.expirationTime || Math.floor(Date.now() / 1000) + 60 * 60;

    const maxGasAmount = 1000000;
    const chainId = this.chainInfo.implOptions.chainId;
    const gasUnitPrice =
      feePricePerUnit.toNumber() < 1 ? 1 : feePricePerUnit.toNumber();
    const expirationTimestampSecs =
      payload.expirationTime || Math.floor(Date.now() / 1000) + 60 * 60;
    const rawUserTransaction = utils.tx.generateRawUserTransaction(
      fromAddr,
      txPayload,
      maxGasAmount,
      gasUnitPrice,
      nonce as number | BigInt,
      expirationTimestampSecs,
      chainId,
    );

    const rawUserTransactionHex = stcEncoding.bcsEncode(rawUserTransaction);

    feeLimit =
      feeLimit ||
      (await (
        await this.starcoin
      ).estimateGasLimit(rawUserTransactionHex, senderPublicKey));

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
    const [rawTxn, rawUserTransactionBytes] = buildUnsignedRawTx(
      unsignedTx,
      this.chainInfo.implOptions.chainId,
    );
    const msgBytes = hashRawTx(rawUserTransactionBytes);

    const {
      inputs: [{ address: fromAddr, publicKey: senderPublicKey }],
    } = unsignedTx;
    check(
      typeof senderPublicKey !== 'undefined',
      'senderPublicKey is required',
    );

    const [signature] = await signers[fromAddr].sign(Buffer.from(msgBytes));
    return buildSignedTx(senderPublicKey as string, signature, rawTxn);
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

  async signMessage(
    { message }: TypedMessage,
    signer: Signer,
    address?: string,
  ): Promise<string> {
    const privateKey = await signer.getPrvkey();
    const { signature } = await utils.signedMessage.signMessage(
      message,
      privateKey.toString('hex'),
    );
    return signature;
  }

  async verifyMessage(
    publicKey: string, // require pubkey here!!
    { message }: TypedMessage,
    signature: string,
  ): Promise<boolean> {
    // starcoin sdk doesn't provide a direct method to verify message, need to
    // build up a signedMessage ourselves.
    const messageBytes = new Uint8Array(Buffer.from(message, 'utf8'));
    const signedMessageHex = await utils.signedMessage.generateSignedMessage(
      new starcoin_types.SigningMessage(messageBytes),
      parseInt(this.chainInfo.implOptions.chainId),
      publicKey,
      signature,
    );
    try {
      const address = await utils.signedMessage.recoverSignedMessageAddress(
        signedMessageHex,
      );
      return address === stcEncoding.publicKeyToAddress(publicKey);
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async hardwareGetXpubs(
    paths: string[],
    showOnDevice: boolean,
  ): Promise<{ path: string; xpub: string }[]> {
    const resp = await this.wrapHardwareCall(() =>
      OneKeyConnect.starcoinGetPublicKey({
        bundle: paths.map((path) => ({ path, showOnDevice })),
      }),
    );

    return resp.map((i) => ({
      path: i.serializedPath,
      xpub: i.publicKey,
    }));
  }

  async hardwareGetAddress(
    path: string,
    showOnDevice: boolean,
    addressToVerify?: string,
  ): Promise<string> {
    const params = {
      path,
      showOnDevice,
    };

    if (typeof addressToVerify === 'string') {
      Object.assign(params, {
        address: addressToVerify,
      });
    }
    const { address } = await this.wrapHardwareCall(() =>
      OneKeyConnect.starcoinGetAddress(params),
    );
    return address;
  }

  async hardwareSignTransaction(
    unsignedTx: UnsignedTx,
    signers: Record<string, string>,
  ): Promise<SignedTx> {
    const [rawTxn, rawUserTransactionBytes] = buildUnsignedRawTx(
      unsignedTx,
      this.chainInfo.implOptions.chainId,
    );

    const {
      inputs: [{ address: fromAddr, publicKey: senderPublicKey }],
    } = unsignedTx;
    check(
      typeof senderPublicKey !== 'undefined',
      'senderPublicKey is required',
    );

    const { signature } = await this.wrapHardwareCall(() =>
      OneKeyConnect.starcoinSignTransaction({
        path: signers[fromAddr],
        rawTx: Buffer.from(rawUserTransactionBytes).toString('hex'),
      }),
    );

    return buildSignedTx(
      senderPublicKey as string,
      Buffer.from(signature as string, 'hex'),
      rawTxn,
    );
  }

  async hardwareSignMessage(
    { message }: TypedMessage,
    signer: string,
  ): Promise<string> {
    const { signature } = await this.wrapHardwareCall(() =>
      OneKeyConnect.starcoinSignMessage({
        path: signer,
        message,
      }),
    );
    return ethUtil.addHexPrefix(signature as string);
  }

  async hardwareVerifyMessage(
    publicKey: string, // require pubkey here!!
    { message }: TypedMessage,
    signature: string,
  ): Promise<boolean> {
    const { message: resp } = await this.wrapHardwareCall(() =>
      OneKeyConnect.starcoinVerifyMessage({
        publicKey,
        message,
        signature,
      }),
    );
    return resp === 'Message verified';
  }
}

export const buildUnsignedRawTx = (
  unsignedTx: UnsignedTx,
  chainId: string,
): [starcoin_types.RawUserTransaction, Uint8Array] => {
  const fromAddr = unsignedTx.inputs[0].address;
  const { scriptFn, data } = unsignedTx.payload;

  const gasLimit = unsignedTx.feeLimit;
  const gasPrice = unsignedTx.feePricePerUnit;
  const nonce = unsignedTx.nonce;
  const expirationTime = unsignedTx.payload.expirationTime;

  if (
    !fromAddr ||
    !(scriptFn || data) ||
    !gasLimit ||
    !gasPrice ||
    typeof nonce === 'undefined'
  ) {
    throw new Error('invalid unsignedTx');
  }

  let txPayload: starcoin_types.TransactionPayload;
  if (scriptFn) {
    txPayload = scriptFn;
  } else {
    txPayload = stcEncoding.bcsDecode(starcoin_types.TransactionPayload, data);
  }

  const rawTxn = utils.tx.generateRawUserTransaction(
    fromAddr,
    txPayload,
    gasLimit.toNumber(),
    gasPrice.toNumber() < 1 ? 1 : gasPrice.toNumber(),
    nonce,
    expirationTime,
    Number(chainId),
  );

  const serializer = new bcs.BcsSerializer();
  rawTxn.serialize(serializer);

  return [rawTxn, serializer.getBytes()];
};

const hashRawTx = (rawUserTransactionBytes: Uint8Array): Uint8Array => {
  const hashSeedBytes = crypto_hash.createRawUserTransactionHasher().get_salt();
  return Uint8Array.of(...hashSeedBytes, ...rawUserTransactionBytes);
};

export const buildSignedTx = (
  senderPublicKey: string,
  rawSignature: Buffer,
  rawTxn: starcoin_types.RawUserTransaction,
) => {
  const publicKey = new starcoin_types.Ed25519PublicKey(
    Buffer.from(senderPublicKey as string, 'hex'),
  );
  const signature = new starcoin_types.Ed25519Signature(rawSignature);
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

  return { txid, rawTx };
};

export { Provider };

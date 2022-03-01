import bchaddr from 'bchaddrjs';
import bitcoinMessage from 'bitcoinjs-message';

import { check } from '../../../basic/precondtion';
import {
  AddressValidation,
  SignedTx,
  TypedMessage,
  UnsignedTx,
} from '../../../types/provider';
import { Signer, Verifier } from '../../../types/secret';
import { Provider as BTCProvider } from '../btc';
import { SupportedEncodings } from '../btc/provider';

class Provider extends BTCProvider {
  async pubkeyToAddress(
    verifier: Verifier,
    encoding?: string,
  ): Promise<string> {
    const legacyAddress = await super.pubkeyToAddress(
      verifier,
      SupportedEncodings.p2pkh,
    );
    return bchaddr.toCashAddress(legacyAddress);
  }

  async verifyAddress(address: string): Promise<AddressValidation> {
    const isValid = bchaddr.isCashAddress(address);
    return isValid
      ? {
          displayAddress: address,
          normalizedAddress: address,
          encoding: SupportedEncodings.p2pkh,
          isValid: true,
        }
      : { isValid: false };
  }

  processUnsignedTxBeforeSign(unsignedTx: UnsignedTx): UnsignedTx {
    return Object.assign({}, unsignedTx, {
      inputs: unsignedTx.inputs.map((i) => ({
        ...i,
        address: bchaddr.toLegacyAddress(i.address),
      })),
      outputs: unsignedTx.outputs.map((o) => ({
        ...o,
        address: bchaddr.toLegacyAddress(o.address),
      })),
    });
  }

  async signTransaction(
    unsignedTx: UnsignedTx,
    signers: { [p: string]: Signer },
  ): Promise<SignedTx> {
    unsignedTx = this.processUnsignedTxBeforeSign(unsignedTx);
    return super.signTransaction(unsignedTx, signers);
  }

  async verifyMessage(
    address: string,
    { message }: TypedMessage,
    signature: string,
  ): Promise<boolean> {
    const validation = await this.verifyAddress(address);
    check(validation.isValid, 'Invalid Address');

    address = bchaddr.toLegacyAddress(address);

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
}

export { Provider };

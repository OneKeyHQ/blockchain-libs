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
import AddressEncodings from '../btc/sdk/addressEncodings';

class Provider extends BTCProvider {
  async pubkeyToAddress(
    verifier: Verifier,
    encoding?: string,
  ): Promise<string> {
    const legacyAddress = await super.pubkeyToAddress(
      verifier,
      AddressEncodings.P2PKH,
    );
    return bchaddr.toCashAddress(legacyAddress);
  }

  async verifyAddress(address: string): Promise<AddressValidation> {
    const isValid = bchaddr.isCashAddress(address);
    return isValid
      ? {
          displayAddress: address,
          normalizedAddress: address,
          encoding: AddressEncodings.P2PKH,
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
      validation.encoding === AddressEncodings.P2WPKH ||
      validation.encoding === AddressEncodings.P2SH_P2WPKH;

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

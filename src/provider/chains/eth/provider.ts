import {
  AddressValidation,
  SignedTx,
  UnsignedTx,
} from '../../../types/provider';
import { Signer, Verifier } from '../../../types/secret';
import { AbsProvider } from '../../abc';

export default class ETHProvider extends AbsProvider {
  buildUnsignedTx(unsignedTx: UnsignedTx | undefined): Promise<UnsignedTx> {
    return Promise.resolve({
      inputs: [],
      outputs: [],
    });
  }

  pubkeyToAddress(
    verifier: Verifier,
    encoding: string | undefined,
  ): Promise<string> {
    return Promise.resolve('');
  }

  signTransaction(
    unsignedTx: UnsignedTx,
    signers: { [p: string]: Signer },
  ): Promise<SignedTx> {
    return Promise.resolve({ txid: '', rawTx: '' });
  }

  verifyAddress(address: string): Promise<AddressValidation> {
    return Promise.resolve({
      normalizedAddress: '',
      displayAddress: '',
      isValid: false,
    });
  }
}

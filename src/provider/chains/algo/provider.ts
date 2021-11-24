import BigNumber from 'bignumber.js';

import { check } from '../../../basic/precondtion';
import {
  AddressValidation,
  SignedTx,
  UnsignedTx,
} from '../../../types/provider';
import { Signer, Verifier } from '../../../types/secret';
import { BaseProvider } from '../../abc';

import { Algod } from './algod';
import * as sdk from './sdk';

const ASSET_ID_END_BOUNDARY = new BigNumber('0x10000000000000000');

class Provider extends BaseProvider {
  get algod(): Promise<Algod> {
    return this.clientSelector((i) => i instanceof Algod);
  }

  verifyAddress(address: string): Promise<AddressValidation> {
    const isValid = sdk.isValidAddress(address);
    const normalizedAddress = isValid ? address : undefined;
    return Promise.resolve({
      isValid,
      normalizedAddress,
      displayAddress: normalizedAddress,
    });
  }

  verifyTokenAddress(address: string): Promise<AddressValidation> {
    const assetId = new BigNumber(address);
    const isValid =
      assetId.isFinite() && assetId.gte(0) && assetId.lt(ASSET_ID_END_BOUNDARY);
    const normalizedAddress = isValid ? address : undefined;
    return Promise.resolve({
      isValid,
      normalizedAddress,
      displayAddress: normalizedAddress,
    });
  }

  async pubkeyToAddress(
    verifier: Verifier,
    encoding: string | undefined,
  ): Promise<string> {
    const pubkey = await verifier.getPubkey(false);
    return sdk.encodeAddress(new Uint8Array(pubkey));
  }

  async buildUnsignedTx(unsignedTx: UnsignedTx): Promise<UnsignedTx> {
    const [input] = unsignedTx.inputs;
    const [output] = unsignedTx.outputs;
    const payload = unsignedTx.payload || {};

    if (input && output) {
      if (
        !payload.suggestedParamsExpiredAt ||
        payload.suggestedParamsExpiredAt <= Date.now()
      ) {
        payload.suggestedParams = await this.algod.then((i) =>
          i.getSuggestedParams(),
        );
        payload.suggestedParamsExpiredAt = Date.now() + 10 * 60 * 1000; // expired at 10 mins
      }
    }

    return Object.assign(unsignedTx, {
      feeLimit: new BigNumber(1000),
      feePricePerUnit: new BigNumber(1),
      payload,
    });
  }

  async signTransaction(
    unsignedTx: UnsignedTx,
    signers: { [p: string]: Signer },
  ): Promise<SignedTx> {
    const [input] = unsignedTx.inputs;
    const [output] = unsignedTx.outputs;
    const { suggestedParams, suggestedParamsExpiredAt } = unsignedTx.payload;
    check(
      suggestedParams &&
        suggestedParamsExpiredAt &&
        suggestedParamsExpiredAt < Date.now(),
      'Please refresh suggestedParams',
    );

    const tx = !output.tokenAddress
      ? sdk.makePaymentTxnWithSuggestedParams(
          input.address,
          output.address,
          output.value.integerValue().toNumber(),
          undefined,
          undefined,
          suggestedParams,
          undefined,
        )
      : sdk.makeAssetTransferTxnWithSuggestedParams(
          input.address,
          output.address,
          undefined,
          undefined,
          output.value.integerValue().toNumber(),
          undefined,
          Number(output.tokenAddress),
          suggestedParams,
          undefined,
        );

    const [signature] = await signers[input.address].sign(tx.bytesToSign());
    const signedTx = {
      sig: signature,
      txn: tx.get_obj_for_encoding(),
    };
    return {
      txid: tx.txID(),
      rawTx: Buffer.from(sdk.encodeObj(signedTx)).toString('base64'),
    };
  }
}
export { Provider };

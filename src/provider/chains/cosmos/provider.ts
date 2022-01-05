import BigNumber from 'bignumber.js';
import { SignDoc } from 'cosmjs-types/cosmos/tx/v1beta1/tx';

import { checkIsDefined } from '../../../basic/precondtion';
import {
  AddressValidation,
  SignedTx,
  UnsignedTx,
} from '../../../types/provider';
import { Signer, Verifier } from '../../../types/secret';
import { BaseProvider } from '../../abc';

import { isValidAddress, pubkeyToAddress } from './sdk/address';
import { sha256 } from './sdk/hash';
import {
  fastMakeSignDoc,
  makeMsgExecuteContract,
  makeMsgSend,
  makeSignBytes,
  makeTxRawBytes,
  ProtoMsgObj,
} from './sdk/signing';
import { GAS_STEP_MULTIPLIER, Tendermint } from './tendermint';

const DEFAULT_GAS_LIMIT = new BigNumber(80000);

class Provider extends BaseProvider {
  get addressPrefix(): string {
    return checkIsDefined(
      this.chainInfo.implOptions?.addressPrefix,
      "Please config 'addressPrefix' in 'implOptions'",
    );
  }

  get tendermint(): Promise<Tendermint> {
    return this.clientSelector((i) => i instanceof Tendermint);
  }

  async pubkeyToAddress(
    verifier: Verifier,
    encoding: string | undefined,
  ): Promise<string> {
    const pubkey = await verifier.getPubkey(true);
    return pubkeyToAddress(this.chainInfo.curve, this.addressPrefix, pubkey);
  }

  async verifyAddress(address: string): Promise<AddressValidation> {
    const isValid = isValidAddress(address, this.addressPrefix);

    return {
      displayAddress: isValid ? address : undefined,
      normalizedAddress: isValid ? address : undefined,
      isValid,
    };
  }

  async verifyTokenAddress(address: string): Promise<AddressValidation> {
    const validation = await this.verifyAddress(address);
    if (validation.isValid) {
      return {
        ...validation,
        encoding: 'CW20',
      };
    }

    const isValid = address.length >= 3 && address.length <= 128;
    return {
      displayAddress: isValid ? address : undefined,
      normalizedAddress: isValid ? address : undefined,
      isValid,
      encoding: isValid ? 'NativeToken' : undefined,
    };
  }

  async buildUnsignedTx(unsignedTx: UnsignedTx): Promise<UnsignedTx> {
    const feeLimit: BigNumber =
      unsignedTx.feeLimit ||
      this.chainInfo.implOptions?.gasLimits?.[unsignedTx.type || 'transfer'] ||
      DEFAULT_GAS_LIMIT;
    const feePricePerUnit: BigNumber =
      BigNumber.isBigNumber(unsignedTx.feePricePerUnit) &&
      unsignedTx.feePricePerUnit.isFinite() &&
      unsignedTx.feePricePerUnit.gte(0)
        ? unsignedTx.feePricePerUnit
        : await this.tendermint
            .then((i) => i.getFeePricePerUnit())
            .then((i) => i.normal.price);

    const payload = unsignedTx.payload || {};
    const [input] = unsignedTx.inputs || [];
    let accountNumber: Number | undefined = payload.accountNumber;
    let nonce: Number | undefined = unsignedTx.nonce;

    if (
      input &&
      (!Number.isFinite(accountNumber) ||
        !Number.isFinite(nonce) ||
        accountNumber! < 0 ||
        nonce! < 0)
    ) {
      const accountInfo = await this.tendermint.then((i) =>
        i.getAddress(input.address),
      );
      nonce = accountInfo.nonce;
      accountNumber = accountInfo.accountNumber;
    }

    return Object.assign({}, unsignedTx, {
      feeLimit: new BigNumber(feeLimit),
      feePricePerUnit: new BigNumber(feePricePerUnit),
      nonce: Number.isFinite(nonce) && nonce! >= 0 ? nonce : undefined,
      payload: {
        accountNumber:
          Number.isFinite(accountNumber) && accountNumber! >= 0
            ? accountNumber
            : undefined,
      },
    });
  }

  async signTransaction(
    unsignedTx: UnsignedTx,
    signers: { [p: string]: Signer },
  ): Promise<SignedTx> {
    const signer = signers[unsignedTx.inputs[0].address];
    const pubkey = await signer.getPubkey(true);
    const signDoc = Provider.packUnsignedTx(
      unsignedTx,
      pubkey,
      this.chainInfo!.implOptions!.mainCoinDenom,
      this.chainInfo!.implOptions!.chainId,
    );

    const signBytes = makeSignBytes(signDoc);
    const [signature] = await signer.sign(Buffer.from(sha256(signBytes)));

    const rawTx = makeTxRawBytes(signDoc.bodyBytes, signDoc.authInfoBytes, [
      signature,
    ]);
    const txid = sha256(rawTx);

    return {
      txid: Buffer.from(txid).toString('hex').toUpperCase(),
      rawTx: Buffer.from(rawTx).toString('base64'),
    };
  }

  static packUnsignedTx(
    unsignedTx: UnsignedTx,
    pubkey: Buffer,
    mainCoinDenom: string,
    chainId: string,
  ): SignDoc {
    const { feeLimit, feePricePerUnit, nonce, payload } = unsignedTx;
    const { memo, accountNumber } = payload;

    const msg = Provider.packMsgObj(unsignedTx);

    const feeAmount: BigNumber = feePricePerUnit!.lte(0)
      ? new BigNumber(0)
      : feePricePerUnit!.gte(GAS_STEP_MULTIPLIER)
      ? feeLimit!
      : feePricePerUnit!.multipliedBy(feeLimit!).div(GAS_STEP_MULTIPLIER);

    return fastMakeSignDoc(
      [msg],
      memo,
      feeLimit!.integerValue().toString(),
      feeAmount.integerValue().toString(),
      pubkey,
      mainCoinDenom,
      chainId,
      accountNumber,
      nonce!,
    );
  }

  static packMsgObj(unsignedTx: UnsignedTx): ProtoMsgObj {
    const { inputs, outputs, type } = unsignedTx;
    const [input] = inputs;
    const [output] = outputs;

    if (type === undefined || type === 'transfer') {
      return makeMsgSend(
        input.address,
        output.address,
        output.value.integerValue().toString(),
        output.tokenAddress!,
      );
    } else if (type === 'cw20_transfer') {
      return makeMsgExecuteContract(input.address, output.tokenAddress!, {
        transfer: {
          amount: output.value.integerValue().toString(),
          recipient: output.address,
        },
      });
    }

    throw new Error(`Invalid type: ${type} on unsignedTx`);
  }
}

export { Provider };

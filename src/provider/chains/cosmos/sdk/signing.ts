import { MsgSend } from 'cosmjs-types/cosmos/bank/v1beta1/tx';
import { Coin } from 'cosmjs-types/cosmos/base/v1beta1/coin';
import { PubKey } from 'cosmjs-types/cosmos/crypto/ed25519/keys';
import { SignMode } from 'cosmjs-types/cosmos/tx/signing/v1beta1/signing';
import {
  AuthInfo,
  SignDoc,
  SignerInfo,
  TxBody,
  TxRaw,
} from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import { Any } from 'cosmjs-types/google/protobuf/any';
import Long from 'long';

const MsgProtoRegistry = {
  '/cosmos.bank.v1beta1.MsgSend': MsgSend,
};

export type ProtoMsgObj = {
  typeUrl: keyof typeof MsgProtoRegistry;
  value: any;
};

function makeTxBodyBytes(
  body: Partial<Omit<TxBody, 'messages'>> & { messages: ProtoMsgObj[] },
): Uint8Array {
  return TxBody.encode(
    TxBody.fromPartial({
      ...body,
      messages: body.messages.map((msg) => {
        const proto = MsgProtoRegistry[msg.typeUrl];

        return {
          typeUrl: msg.typeUrl,
          value: proto.encode(proto.fromPartial(msg.value)).finish(),
        };
      }),
    } as never),
  ).finish();
}

/**
 * Create signer infos from the provided signers.
 *
 * This implementation does not support different signing modes for the different signers.
 */
function makeSignerInfos(
  signers: ReadonlyArray<{ readonly pubkey: any; readonly sequence: number }>,
  signMode: SignMode,
): SignerInfo[] {
  return signers.map(
    ({ pubkey, sequence }): SignerInfo => ({
      publicKey: pubkey,
      modeInfo: {
        single: { mode: signMode },
      },
      sequence: Long.fromNumber(sequence),
    }),
  );
}

/**
 * Creates and serializes an AuthInfo document.
 *
 * This implementation does not support different signing modes for the different signers.
 */
function makeAuthInfoBytes(
  signers: ReadonlyArray<{ readonly pubkey: any; readonly sequence: number }>,
  feeAmount: readonly Coin[],
  gasLimit: number,
  signMode = SignMode.SIGN_MODE_DIRECT,
): Uint8Array {
  const authInfo = {
    signerInfos: makeSignerInfos(signers, signMode),
    fee: {
      amount: [...feeAmount],
      gasLimit: Long.fromNumber(gasLimit),
    },
  };
  return AuthInfo.encode(AuthInfo.fromPartial(authInfo)).finish();
}

function encodePubkey(pubkey: Uint8Array): Any {
  const pubkeyProto = PubKey.fromPartial({
    key: pubkey,
  });
  return Any.fromPartial({
    typeUrl: '/cosmos.crypto.secp256k1.PubKey',
    value: Uint8Array.from(PubKey.encode(pubkeyProto).finish()),
  });
}

function makeSignDoc(
  bodyBytes: Uint8Array,
  authInfoBytes: Uint8Array,
  chainId: string,
  accountNumber: number,
): SignDoc {
  return {
    bodyBytes: bodyBytes,
    authInfoBytes: authInfoBytes,
    chainId: chainId,
    accountNumber: Long.fromNumber(accountNumber),
  };
}

export function makeSignBytes({
  accountNumber,
  authInfoBytes,
  bodyBytes,
  chainId,
}: SignDoc): Uint8Array {
  const signDoc = SignDoc.fromPartial({
    authInfoBytes: authInfoBytes,
    bodyBytes: bodyBytes,
    chainId: chainId,
    accountNumber: accountNumber,
  });
  return SignDoc.encode(signDoc).finish();
}

export function fastMakeSignDoc(
  messages: ProtoMsgObj[],
  memo: string,
  gasLimit: string,
  feeAmount: string,
  pubkey: Uint8Array,
  mainCoinDenom: string,
  chainId: string,
  accountNumber: number,
  nonce: number,
): SignDoc {
  const bodyBytes = makeTxBodyBytes({
    messages,
    memo,
  });

  const encodePub = encodePubkey(pubkey);
  const encodePub2 = {};
  const authBytes = makeAuthInfoBytes(
    [{ pubkey: encodePub, sequence: nonce }],
    [
      {
        amount: feeAmount,
        denom: mainCoinDenom,
      },
    ],
    Number(gasLimit),
  );
  return makeSignDoc(bodyBytes, authBytes, chainId, accountNumber);
}

export function makeMsgSend(
  fromAddress: string,
  toAddress: string,
  value: string,
  denom: string,
): ProtoMsgObj {
  return {
    typeUrl: '/cosmos.bank.v1beta1.MsgSend',
    value: {
      fromAddress,
      toAddress,
      amount: [
        {
          amount: value,
          denom: denom,
        },
      ],
    },
  };
}

export function makeTxRawBytes(
  bodyBytes: Uint8Array,
  authInfoBytes: Uint8Array,
  signatures: Uint8Array[],
): Uint8Array {
  return TxRaw.encode(
    TxRaw.fromPartial({
      bodyBytes,
      authInfoBytes,
      signatures,
    }),
  ).finish();
}

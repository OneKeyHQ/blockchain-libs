import * as signUtil from '@metamask/eth-sig-util';
import * as ethUtil from 'ethereumjs-util';

import { check } from '../../../../basic/precondtion';

enum MessageTypes {
  ETH_SIGN = 0,
  PERSONAL_SIGN = 1,
  TYPE_DATA_V1 = 2,
  TYPE_DATA_V3 = 3,
  TYPE_DATA_V4 = 4,
}

const hashMessage = (messageType: MessageTypes, message: string): string => {
  switch (messageType) {
    case MessageTypes.ETH_SIGN:
      return ethUtil.addHexPrefix(message);
    case MessageTypes.PERSONAL_SIGN:
      return ethUtil.addHexPrefix(
        ethUtil.hashPersonalMessage(Buffer.from(message)).toString('hex'),
      );
    case MessageTypes.TYPE_DATA_V1:
      return ethUtil.addHexPrefix(
        signUtil.typedSignatureHash(JSON.parse(message)),
      );
    case MessageTypes.TYPE_DATA_V3:
      return ethUtil.addHexPrefix(
        signUtil.TypedDataUtils.eip712Hash(
          JSON.parse(message),
          signUtil.SignTypedDataVersion.V3,
        ).toString('hex'),
      );
    case MessageTypes.TYPE_DATA_V4:
      return ethUtil.addHexPrefix(
        signUtil.TypedDataUtils.eip712Hash(
          JSON.parse(message),
          signUtil.SignTypedDataVersion.V4,
        ).toString('hex'),
      );

    default:
      throw new Error(`Invalid messageType: ${messageType}`);
  }
};

const eip712PreHash = (
  messageType: MessageTypes,
  message: string,
): [string, string | undefined] => {
  check(
    messageType === MessageTypes.TYPE_DATA_V3 ||
      messageType === MessageTypes.TYPE_DATA_V4,
    'Only supports V3 and V4',
  );

  const version =
    messageType === MessageTypes.TYPE_DATA_V3
      ? signUtil.SignTypedDataVersion.V3
      : signUtil.SignTypedDataVersion.V4;
  const typedData = JSON.parse(message);

  const sanitizedData = signUtil.TypedDataUtils.sanitizeData(typedData);
  const domainHash = signUtil.TypedDataUtils.hashStruct(
    'EIP712Domain',
    sanitizedData.domain,
    sanitizedData.types,
    version,
  );
  const messageHash =
    sanitizedData.primaryType !== 'EIP712Domain'
      ? signUtil.TypedDataUtils.hashStruct(
          sanitizedData.primaryType as string,
          sanitizedData.message,
          sanitizedData.types,
          version,
        )
      : undefined;

  return [
    ethUtil.addHexPrefix(domainHash.toString('hex')),
    messageHash && ethUtil.addHexPrefix(messageHash.toString('hex')),
  ];
};

export { MessageTypes, hashMessage, eip712PreHash };

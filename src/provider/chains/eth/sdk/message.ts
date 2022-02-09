import * as signUtil from 'eth-sig-util';
import * as ethUtil from 'ethereumjs-util';

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
        signUtil.TypedDataUtils.sign(JSON.parse(message), false).toString(
          'hex',
        ),
      );
    case MessageTypes.TYPE_DATA_V4:
      return ethUtil.addHexPrefix(
        signUtil.TypedDataUtils.sign(JSON.parse(message), true).toString('hex'),
      );

    default:
      throw new Error(`Invalid messageType: ${messageType}`);
  }
};

export { MessageTypes, hashMessage };

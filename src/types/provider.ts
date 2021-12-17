import BigNumber from 'bignumber.js';

type ClientInfo = {
  bestBlockNumber: number;
  isReady: boolean;
};

type AddressInfo = {
  balance: BigNumber;
  existing: boolean;
  nonce?: number;
};

enum TransactionStatus {
  NOT_FOUND = 0,
  PENDING = 1,
  INVALID = 2,
  CONFIRM_AND_SUCCESS = 10,
  CONFIRM_BUT_FAILED = 11,
}

// enum BroadcastReceiptCode {
//   UNKNOWN = 0,
//   UNEXPECTED_FAILED = 1,
//
//   SUCCESS = 100,
//   ALREADY_KNOWN = 101,
//   NONCE_TOO_LOW = 102,
//
//   ETH_RBF_UNDERPRICE = 201,
//   ETH_GAS_PRICE_TOO_LOW = 202,
//   ETH_GAS_LIMIT_EXCEEDED = 203,
// }
//
// type BroadcastReceipt = {
//   isSuccess: boolean;
//   receiptCode: BroadcastReceiptCode;
// };

type EstimatedPrice = {
  price: BigNumber;
  waitingBlock?: number;
  payload?: { [key: string]: any };
};

type FeePricePerUnit = {
  normal: EstimatedPrice;
  others?: Array<EstimatedPrice>;
};

type PartialTokenInfo = {
  decimals: number;
  name: string;
  symbol: string;
};

type AddressValidation = {
  isValid: boolean;
  normalizedAddress?: string;
  displayAddress?: string;
  encoding?: string;
};

type UTXO = {
  txid: string;
  vout: number;
  value: BigNumber;
};

type TxInput = {
  address: string;
  value: BigNumber;
  tokenAddress?: string;
  utxo?: UTXO;
  publicKey?: string; // used in stc
};

type TxOutput = {
  address: string;
  value: BigNumber;
  tokenAddress?: string;
  payload?: { [key: string]: any };
};

type UnsignedTx = {
  inputs: TxInput[];
  outputs: TxOutput[];
  nonce?: number;
  feeLimit?: BigNumber;
  feePricePerUnit?: BigNumber;
  payload: { [key: string]: any };
};

type SignedTx = {
  txid: string;
  rawTx: string;
};

export {
  ClientInfo,
  AddressInfo,
  TransactionStatus,
  // BroadcastReceiptCode,
  // BroadcastReceipt,
  EstimatedPrice,
  FeePricePerUnit,
  PartialTokenInfo,
  AddressValidation,
  UTXO,
  TxInput,
  TxOutput,
  UnsignedTx,
  SignedTx,
};

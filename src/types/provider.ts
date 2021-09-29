import BigNumber from 'bignumber.js';

type ClientInfo = {
  bestBlockNumber: number;
  isReady: boolean;
};

type AddressInfo = {
  address: string;
  balance: BigNumber;
  existing: boolean;
  nonce?: number;
};

enum TransactionStatus {
  UNKNOWN = 0,
  PENDING = 1,
  CONFIRM_AND_SUCCESS = 10,
  CONFIRM_BUT_FAILED = 11,
}

enum BroadcastReceiptCode {
  UNKNOWN = 0,
  UNEXPECTED_FAILED = 1,

  SUCCESS = 100,
  ALREADY_KNOWN = 101,
  NONCE_TOO_LOW = 102,

  ETH_RBF_UNDERPRICE = 201,
  ETH_GAS_PRICE_TOO_LOW = 202,
  ETH_GAS_LIMIT_EXCEEDED = 203,
}

type BroadcastReceipt = {
  isSuccess: boolean;
  receiptCode: BroadcastReceiptCode;
};

type EstimatedPrice = {
  price: BigNumber;
  waitingBlock?: number;
};

type FeePricePerUnit = {
  normal: EstimatedPrice;
  others?: Array<EstimatedPrice>;
};

type TokenInfo = {
  tokenAddress: string;
  decimals: string;
  name: string;
  symbol: string;
};

type AddressValidation = {
  normalizedAddress: string;
  displayAddress: string;
  isValid: boolean;
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
  BroadcastReceiptCode,
  BroadcastReceipt,
  EstimatedPrice,
  FeePricePerUnit,
  TokenInfo,
  AddressValidation,
  UTXO,
  TxInput,
  TxOutput,
  UnsignedTx,
  SignedTx,
};

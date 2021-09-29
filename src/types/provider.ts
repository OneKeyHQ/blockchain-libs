import BigNumber from 'bignumber.js';

export type ClientInfo = {
  bestBlockNumber: number;
  isReady: boolean;
};

export type AddressInfo = {
  address: string;
  balance: BigNumber;
  existing: boolean;
  nonce?: number;
};

export enum TransactionStatus {
  UNKNOWN = 0,
  PENDING = 1,
  CONFIRM_AND_SUCCESS = 10,
  CONFIRM_BUT_FAILED = 11,
}

export enum BroadcastReceiptCode {
  UNKNOWN = 0,
  UNEXPECTED_FAILED = 1,

  SUCCESS = 100,
  ALREADY_KNOWN = 101,
  NONCE_TOO_LOW = 102,

  ETH_RBF_UNDERPRICE = 201,
  ETH_GAS_PRICE_TOO_LOW = 202,
  ETH_GAS_LIMIT_EXCEEDED = 203,
}

export type BroadcastReceipt = {
  isSuccess: boolean;
  receiptCode: BroadcastReceiptCode;
};

export type EstimatedPrice = {
  price: BigNumber;
  seconds?: number;
};

export type FeePricePerUnit = {
  normal: EstimatedPrice;
  others?: Array<EstimatedPrice>;
};

export type TokenInfo = {
  tokenAddress: string;
  decimals: string;
  name: string;
  symbol: string;
};

export type AddressValidation = {
  normalizedAddress: string;
  displayAddress: string;
  isValid: boolean;
  encoding?: string;
};

export type UTXO = {
  txid: string;
  vout: number;
  value: BigNumber;
};

export type TxInput = {
  address: string;
  value: BigNumber;
  tokenAddress?: string;
  utxo?: UTXO;
};

export type TxOutput = {
  address: string;
  value: BigNumber;
  tokenAddress?: string;
  payload?: { [key: string]: any };
};

export type UnsignedTx = {
  inputs: TxInput[];
  outputs: TxOutput[];
  nonce?: number;
  feeLimit?: BigNumber;
  feePricePerUnit?: BigNumber;
  payload?: { [key: string]: any };
};

export type SignedTx = {
  txid: string;
  rawTx: string;
};

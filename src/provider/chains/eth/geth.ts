import BigNumber from 'bignumber.js';

import {
  AddressInfo,
  BroadcastReceipt,
  BroadcastReceiptCode,
  ClientInfo,
  FeePricePerUnit,
  TransactionStatus,
} from '../../../types/provider';
import { AbsClient } from '../../abc';

export class Geth extends AbsClient {
  broadcastTransaction(rawTx: string): Promise<BroadcastReceipt> {
    return Promise.resolve({
      isSuccess: false,
      receiptCode: BroadcastReceiptCode.UNEXPECTED_FAILED,
    });
  }

  getAddress(address: string): Promise<AddressInfo> {
    return Promise.resolve({
      address: '',
      balance: new BigNumber(1),
      existing: false,
    });
  }

  getFeePricePerUnit(): Promise<FeePricePerUnit> {
    return Promise.resolve({ normal: { price: new BigNumber(1) } });
  }

  getInfo(): Promise<ClientInfo> {
    return Promise.resolve({ bestBlockNumber: 0, isReady: false });
  }

  getTransactionStatus(txid: string): Promise<TransactionStatus> {
    return Promise.resolve(TransactionStatus.UNKNOWN);
  }
}

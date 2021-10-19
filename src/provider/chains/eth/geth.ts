import BigNumber from 'bignumber.js';

import {
  AddressInfo,
  BroadcastReceipt,
  BroadcastReceiptCode,
  ClientInfo,
  FeePricePerUnit,
  TransactionStatus,
} from '../../../types/provider';
import { BaseClient } from '../../abc';

class Geth extends BaseClient {
  broadcastTransaction(rawTx: string): Promise<boolean> {
    return Promise.resolve(false);
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

export { Geth };

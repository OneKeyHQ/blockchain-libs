import BigNumber from 'bignumber.js';

import { ResponseError } from '../../../basic/request/exceptions';
import { RestfulRequest } from '../../../basic/request/restful';
import {
  AddressInfo,
  ClientInfo,
  FeePricePerUnit,
  TransactionStatus,
} from '../../../types/provider';
import { SimpleClient } from '../../abc';

const MIN_SAT_PER_BYTE = 1;
const BTC_PER_KBYTES__TO__SAT_PER_BYTE = Math.pow(10, 5);

class BlockBook extends SimpleClient {
  readonly restful: RestfulRequest;

  constructor(url: string) {
    super();
    this.restful = new RestfulRequest(url);
  }

  async getInfo(): Promise<ClientInfo> {
    const resp: any = await this.restful.get('/api/v2').then((i) => i.json());
    const bestBlockNumber = Number(resp.backend.blocks);

    return {
      bestBlockNumber,
      isReady: Number.isFinite(bestBlockNumber) && bestBlockNumber > 0,
    };
  }

  async getAddress(address: string): Promise<AddressInfo> {
    const resp: any = await this.restful
      .get(`/api/v2/address/${address}`, {
        details: 'basic',
      })
      .then((i) => i.json());
    const unconfirmedBalance = Number(resp.unconfirmedBalance || 0);

    return {
      balance: new BigNumber(Number(resp.balance || 0) + unconfirmedBalance),
      existing: Number(resp.txs || 0) > 0,
    };
  }

  async estimateFee(waitingBlock: number): Promise<number> {
    const resp = await this.restful
      .get(`/api/v2/estimatefee/${waitingBlock}`)
      .then((i) => i.json());

    return Math.max(
      MIN_SAT_PER_BYTE,
      (Number(resp.result || 0) * BTC_PER_KBYTES__TO__SAT_PER_BYTE) as never,
    );
  }

  async getFeePricePerUnit(): Promise<FeePricePerUnit> {
    const [normalResp, fastResp, slowResp] = await Promise.allSettled([
      this.estimateFee(5),
      this.estimateFee(1),
      this.estimateFee(20),
    ]);

    const isFulfilledFee = (resp?: PromiseSettledResult<number>) =>
      resp &&
      resp.status === 'fulfilled' &&
      Number.isFinite(resp.value) &&
      resp.value > 0;

    const normal: number = isFulfilledFee(normalResp)
      ? (normalResp as PromiseFulfilledResult<number>).value
      : MIN_SAT_PER_BYTE;

    const fast = isFulfilledFee(fastResp)
      ? (fastResp as PromiseFulfilledResult<number>).value
      : Math.max(MIN_SAT_PER_BYTE, normal * 1.6);

    const slow = isFulfilledFee(slowResp)
      ? (slowResp as PromiseFulfilledResult<number>).value
      : Math.max(MIN_SAT_PER_BYTE, normal * 0.6);

    return {
      normal: { price: new BigNumber(normal), waitingBlock: 5 },
      others: [
        { price: new BigNumber(slow), waitingBlock: 20 },
        { price: new BigNumber(fast), waitingBlock: 1 },
      ],
    };
  }

  async getTransactionStatus(txid: string): Promise<TransactionStatus> {
    try {
      const resp = await this.restful
        .get(`/api/v2/tx/${txid}`)
        .then((i) => i.json());
      const confirmations = Number(resp.confirmations);
      return Number.isFinite(confirmations) && confirmations > 0
        ? TransactionStatus.CONFIRM_AND_SUCCESS
        : TransactionStatus.PENDING;
    } catch (e) {
      if (e instanceof ResponseError && e.response) {
        const error = await e.response.json();
        if (error.error?.includes('not found')) {
          return TransactionStatus.NOT_FOUND;
        }
      }
      throw e;
    }
  }

  async getRawTransaction(txid: string): Promise<string> {
    const resp = await this.restful
      .get(`/api/v2/tx/${txid}`)
      .then((i) => i.json());

    return resp.hex;
  }

  async broadcastTransaction(rawTx: string): Promise<boolean> {
    try {
      const resp = await this.restful
        .get(`/api/v2/sendtx/${rawTx}`)
        .then((i) => i.json());

      const txid = resp.result;
      return typeof txid === 'string' && txid.length === 64;
    } catch (e) {
      if (e instanceof ResponseError && e.response) {
        const error = await e.response.json();

        if (
          typeof error.error === 'string' &&
          error.error.includes('Transaction already in block chain')
        ) {
          throw new Error('Transaction already in block');
        }
      }

      throw e;
    }
  }
}

export { BlockBook };

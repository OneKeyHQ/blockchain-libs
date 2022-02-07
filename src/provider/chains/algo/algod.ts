import { Buffer } from 'buffer';

import BigNumber from 'bignumber.js';

import { check, checkIsDefined } from '../../../basic/precondtion';
import { ResponseError } from '../../../basic/request/exceptions';
import { RestfulRequest } from '../../../basic/request/restful';
import { CoinInfo } from '../../../types/chain';
import {
  AddressInfo,
  ClientInfo,
  FeePricePerUnit,
  TransactionStatus,
} from '../../../types/provider';
import { SimpleClient } from '../../abc';

import { SuggestedParams } from './sdk';

const ONE_MIN_IN_NANO_SECONDS = 60 * 1e9;

class Algod extends SimpleClient {
  readonly restful: RestfulRequest;
  private readonly _indexer?: RestfulRequest;

  constructor(url: string, indexer?: { url: string; apiKey?: string }) {
    super();

    this.restful = new RestfulRequest(url);
    this._indexer = indexer
      ? new RestfulRequest(
          indexer.url,
          indexer.apiKey ? { 'x-api-key': indexer.apiKey } : undefined,
        )
      : undefined;
  }

  get indexer(): RestfulRequest {
    return checkIsDefined(this._indexer, 'Please config indexer first');
  }

  async getInfo(): Promise<ClientInfo> {
    const resp: any = await this.restful
      .get('/v2/status')
      .then((i) => i.json());

    const bestBlockNumber = Number(resp['last-round']) || 0;
    const isReady =
      bestBlockNumber > 0 &&
      Number(resp['catchup-time']) === 0 &&
      Number(resp['time-since-last-round']) < ONE_MIN_IN_NANO_SECONDS;

    return {
      isReady,
      bestBlockNumber,
    };
  }

  async getAddress(address: string): Promise<AddressInfo> {
    const resp: any = await this.restful
      .get(`/v2/accounts/${address}`)
      .then((i) => i.json());
    const balance = new BigNumber(resp.amount || 0);
    const assets = resp.assets || [];

    return {
      balance,
      existing: balance.gt(0) || (Array.isArray(assets) && assets.length > 0),
    };
  }

  async getBalance(
    address: string,
    coin: Partial<CoinInfo>,
  ): Promise<BigNumber> {
    const resp: any = await this.restful
      .get(`/v2/accounts/${address}`)
      .then((i) => i.json());

    let balance: BigNumber;

    if (typeof coin?.tokenAddress === 'undefined') {
      balance = new BigNumber(resp.amount || 0);
    } else {
      const targetAssetId = Number(coin.tokenAddress);
      const assets: Array<any> = resp.assets || [];
      const asset = assets.find((i) => i['asset-id'] === targetAssetId);
      balance = new BigNumber(asset?.amount || 0);
    }

    return balance;
  }

  getFeePricePerUnit(): Promise<FeePricePerUnit> {
    return Promise.resolve({
      normal: { price: new BigNumber(1), waitingBlock: 10 },
    });
  }

  async getTransactionStatus(txid: string): Promise<TransactionStatus> {
    const is404Error = (e: any) =>
      e instanceof ResponseError && e.response?.status === 404;

    try {
      return await this.getPendingTransactionStatus(txid);
    } catch (e) {
      if (is404Error(e)) {
        try {
          return await this.getConfirmedTransactionStatus(txid);
        } catch (e) {
          if (is404Error(e)) {
            return TransactionStatus.NOT_FOUND;
          }
          throw e;
        }
      }

      throw e;
    }
  }

  async getPendingTransactionStatus(txid: string): Promise<TransactionStatus> {
    const pendingTx: any = await this.restful
      .get(`/v2/transactions/pending/${txid}`)
      .then((i) => i.json());

    const confirmedBlock = Number(pendingTx['confirmed-round'] || 0);
    if (Number.isFinite(confirmedBlock) && confirmedBlock > 0) {
      return TransactionStatus.CONFIRM_AND_SUCCESS;
    } else if (pendingTx['pool-error']) {
      return TransactionStatus.INVALID;
    } else {
      return TransactionStatus.PENDING;
    }
  }

  async getConfirmedTransactionStatus(
    txid: string,
  ): Promise<TransactionStatus> {
    const resp: any = await this.indexer
      .get(`/v2/transactions/${txid}`)
      .then((i) => i.json());
    check(Number(resp?.transaction['confirmed-round']) > 0, 'Illegal state');
    return TransactionStatus.CONFIRM_AND_SUCCESS;
  }

  async broadcastTransaction(rawTx: string): Promise<boolean> {
    const resp: any = await this.restful.post(
      '/v2/transactions',
      Buffer.from(rawTx, 'base64').toString('hex'),
      false,
      { 'Content-Type': 'application/x-binary' },
    );
    return Boolean(typeof resp?.txid === 'string' && resp.txid);
  }

  async getSuggestedParams(): Promise<SuggestedParams> {
    const resp = await this.restful
      .get('/v2/transactions/params')
      .then((i) => i.json());

    return {
      flatFee: false,
      fee: Number(resp['fee'] || 0),
      firstRound: Number(resp['last-round']),
      lastRound: Number(resp['last-round']) + 1000,
      genesisID: resp['genesis-id'],
      genesisHash: resp['genesis-hash'],
    };
  }
}

export { Algod };

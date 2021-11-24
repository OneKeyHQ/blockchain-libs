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
import { BaseClient } from '../../abc';

import { SuggestedParams } from './sdk';

const ONE_MIN_IN_NANO_SECONDS = 60 * 1e9;

class Algod extends BaseClient {
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

  async getAddresses(
    addresses: Array<string>,
  ): Promise<Array<AddressInfo | undefined>> {
    const resp = await Promise.allSettled(
      addresses.map((i) =>
        this.restful.get(`/v2/accounts/${i}`).then((i) => i.json()),
      ),
    );

    return resp.map((i) => {
      if (i.status === 'fulfilled') {
        const balance = new BigNumber(i.value.amount || 0);
        const assets = i.value.assets || [];

        if (balance.isFinite() && balance.gte(0)) {
          return {
            balance,
            existing:
              balance.gt(0) || (Array.isArray(assets) && assets.length > 0),
          };
        }
      }

      return undefined;
    });
  }

  async getBalances(
    requests: Array<{ address: string; coin: Partial<CoinInfo> }>,
  ): Promise<Array<BigNumber | undefined>> {
    const resp = await Promise.allSettled(
      requests.map((i) =>
        this.restful.get(`/v2/accounts/${i.address}`).then((i) => i.json()),
      ),
    );

    return resp.map((i, index) => {
      if (i.status === 'fulfilled') {
        const request = requests[index];
        let balance;

        if (typeof request.coin?.tokenAddress === 'undefined') {
          balance = new BigNumber(i.value.amount || 0);
        } else {
          const targetAssetId = Number(request.coin.tokenAddress);
          const assets: Array<any> = i.value.assets || [];
          const asset = assets.find((i) => i['asset-id'] === targetAssetId);
          balance = new BigNumber(asset?.amount || 0);
        }

        if (balance && balance.isFinite() && balance.gte(0)) {
          return balance;
        }
      }

      return undefined;
    });
  }

  getFeePricePerUnit(): Promise<FeePricePerUnit> {
    return Promise.resolve({
      normal: { price: new BigNumber(1), waitingBlock: 10 },
    });
  }

  async getTransactionStatuses(
    txids: Array<string>,
  ): Promise<Array<TransactionStatus | undefined>> {
    const is404Error = (e: any) =>
      e instanceof ResponseError && e.response?.status === 404;

    const statuses = await Promise.allSettled(
      txids.map((i) =>
        this.getPendingTransactionStatus(i) // in transaction pool or recently confirmed?
          .catch((e) =>
            is404Error(e)
              ? this.getConfirmedTransactionStatus(i) // or has confirmed historically by indexer
              : undefined,
          )
          .catch((e) =>
            is404Error(e) ? TransactionStatus.NOT_FOUND : undefined,
          ),
      ),
    );
    return statuses.map((i) =>
      i.status === 'fulfilled' ? i.value : undefined,
    );
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

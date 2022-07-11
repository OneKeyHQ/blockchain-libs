import BigNumber from 'bignumber.js';
import { BroadcastMode } from 'cosmjs-types/cosmos/tx/v1beta1/service';

import { NotImplementedError } from '../../../basic/exceptions';
import { checkIsDefined } from '../../../basic/precondtion';
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

const MINUTES_30 = 30 * 60 * 1000;

type CosmosAddressInfo = AddressInfo & {
  accountNumber: number | undefined;
};

const GAS_STEP_MULTIPLIER = 10000;
const DEFAULT_GAS_PRICE_STEP = {
  low: 100, // general step * GAS_STEP_MULTIPLIER, 0.01 * 10000 = 100
  normal: 250,
  high: 400,
};

class Tendermint extends SimpleClient {
  readonly restful: RestfulRequest;

  constructor(url: string) {
    super();
    this.restful = new RestfulRequest(url);
  }

  get mainCoinDenom(): string {
    return checkIsDefined(
      this.chainInfo?.implOptions?.mainCoinDenom,
      "Please config 'mainCoinDenom' in 'implOptions'",
    );
  }

  async getInfo(): Promise<ClientInfo> {
    const resp: any = await this.restful
      .get('/blocks/latest')
      .then((i) => i.json());

    const bestBlockNumber = Number(resp['block']['header']['height']);
    const bestBlockTime = new Date(resp['block']['header']['time']).getTime();
    const isReady =
      isFinite(bestBlockNumber) &&
      bestBlockNumber > 0 &&
      Date.now() - bestBlockTime <= MINUTES_30;

    return { bestBlockNumber, isReady };
  }

  async getAddress(address: string): Promise<CosmosAddressInfo> {
    let existing: boolean;
    let nonce = 0;
    let accountNumber: number | undefined;
    let balance: BigNumber = new BigNumber(0);

    try {
      const accountInfo: any = await this.restful
        .get(`/cosmos/auth/v1beta1/accounts/${address}`)
        .then((i) => i.json());
      existing = true;
      nonce = Number(accountInfo.account?.sequence || 0);
      accountNumber = Number(accountInfo.account?.['account_number']);
    } catch (e) {
      if (e instanceof ResponseError && e.response?.status === 404) {
        existing = false;
        accountNumber = undefined;
      } else {
        throw e;
      }
    }

    if (existing) {
      try {
        [balance] = await this.getNativeTokenBalances(address, [
          {
            tokenAddress: this.mainCoinDenom,
          },
        ]);
      } catch (e) {
        console.debug(`Error in get balance. address: ${address}, error: `, e);
      }
    }

    return {
      balance,
      existing,
      nonce,
      accountNumber,
    };
  }

  async getBalances(
    requests: Array<{ address: string; coin: Partial<CoinInfo> }>,
  ): Promise<Array<BigNumber | undefined>> {
    type OrderedRequest = typeof requests[number] & { order: number };

    const [nativeTokenRequests, cw20Requests] = requests.reduce<
      OrderedRequest[][]
    >(
      (acc, cur, index) => {
        Object.assign(cur, { order: index });

        if (cur.coin.options?.isCW20) {
          acc[1].push(cur as never);
        } else {
          acc[0].push(cur as never);
        }
        return acc;
      },
      [[], []],
    );

    const cw20Balances: Array<{ order: number; value: BigNumber | undefined }> =
      await Promise.all(
        cw20Requests.map((req) =>
          this.getCW20Balance(req.address, req.coin).then(
            (value) => value,
            (reason) => {
              console.debug('Error getting CW20 balances', reason);
              return undefined;
            },
          ),
        ),
      ).then((results) =>
        results.map((v, index) => ({
          order: cw20Requests[index].order,
          value: v,
        })),
      );

    const compressedNativeTokenRequests: [string, OrderedRequest[]][] =
      Object.entries(
        nativeTokenRequests.reduce<Record<string, OrderedRequest[]>>(
          (acc, cur) => {
            if (!acc[cur.address]) {
              acc[cur.address] = [];
            }
            acc[cur.address].push(cur);
            return acc;
          },
          {},
        ),
      );
    const nativeTokenBalances: Array<{
      order: number;
      value: BigNumber | undefined;
    }> = await Promise.all(
      compressedNativeTokenRequests.map(([address, reqs]) =>
        this.getNativeTokenBalances(
          address,
          reqs.map((r) => r.coin),
        ).then(
          (value) => value,
          (reason) => {
            console.debug('Error getting native token balances', reason);
            return [];
          },
        ),
      ),
    ).then((results) =>
      results.reduce<
        Array<{
          order: number;
          value: BigNumber | undefined;
        }>
      >((acc, cur, index) => {
        const [_address, reqs] = compressedNativeTokenRequests[index];
        cur = cur || Array(reqs.length).fill(undefined);
        acc.push(
          ...cur.map((v, subIndex) => ({
            value: v,
            order: reqs[subIndex].order,
          })),
        );

        return acc;
      }, []),
    );

    return [...cw20Balances, ...nativeTokenBalances]
      .sort((a, b) => a.order - b.order)
      .map((i) => i.value);
  }

  async getNativeTokenBalances(
    address: string,
    coins: Partial<CoinInfo>[],
  ): Promise<BigNumber[]> {
    const rawResult: Array<any> = await this.restful
      .get(`/bank/balances/${address}`)
      .then((i) => i.json())
      .then((i) => i.result || []);
    const balanceInfo = rawResult.reduce<Record<string, BigNumber>>(
      (acc, cur) => {
        acc[cur.denom] = new BigNumber(cur.amount);
        return acc;
      },
      {},
    );

    return coins.map(({ tokenAddress }) =>
      tokenAddress && tokenAddress in balanceInfo
        ? balanceInfo[tokenAddress]
        : new BigNumber(0),
    );
  }

  async getCW20Balance(address: string, coin: Partial<CoinInfo>) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const result: any = await this.queryContract(coin.tokenAddress!, {
      balance: { address },
    });
    return new BigNumber(result?.balance ?? 0);
  }

  async queryContract(
    contractAddress: string,
    query: unknown,
    others: object = {},
  ): Promise<unknown> {
    return this.restful
      .get(`/terra/wasm/v1beta1/contracts/${contractAddress}/store`, {
        ...others,
        query_msg: Buffer.from(JSON.stringify(query), 'utf-8').toString(
          'base64',
        ),
      })
      .then((i) => i.json())
      .then((i) => i.query_result);
  }

  getBalance(address: string, coin: Partial<CoinInfo>): Promise<BigNumber> {
    return Promise.reject(NotImplementedError);
  }

  getFeePricePerUnit(): Promise<FeePricePerUnit> {
    const gasPriceStep: typeof DEFAULT_GAS_PRICE_STEP =
      this.chainInfo?.implOptions?.gasPriceStep || DEFAULT_GAS_PRICE_STEP;

    return Promise.resolve({
      normal: { price: new BigNumber(gasPriceStep['normal']) },
      others: Object.entries(gasPriceStep)
        .filter(([key]) => key !== 'normal')
        .map(([, price]) => ({ price: new BigNumber(price) })),
    });
  }

  async getTransactionStatus(txid: string): Promise<TransactionStatus> {
    let tx: any;

    try {
      tx = await this.restful
        .get(`/cosmos/tx/v1beta1/txs/${txid}`)
        .then((i) => i.json());
    } catch (e) {
      if (e instanceof ResponseError && e.response?.status === 400) {
        return TransactionStatus.NOT_FOUND;
      }

      throw e;
    }

    const confirmedHeight = Number(tx['tx_response']?.height);
    const isSuccess = tx['tx_response']?.code === 0;
    if (Number.isFinite(confirmedHeight) && confirmedHeight > 0) {
      return isSuccess
        ? TransactionStatus.CONFIRM_AND_SUCCESS
        : TransactionStatus.CONFIRM_BUT_FAILED;
    }

    return TransactionStatus.PENDING;
  }

  async broadcastTransaction(rawTx: string): Promise<string> {
    const data = {
      mode: BroadcastMode.BROADCAST_MODE_SYNC,
      tx_bytes: rawTx,
    };
    const resp: any = await this.restful
      .post('/cosmos/tx/v1beta1/txs', data, true)
      .then((i) => i.json());

    return resp.tx_response.txhash;
  }
}

export { Tendermint, GAS_STEP_MULTIPLIER };

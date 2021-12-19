import BigNumber from 'bignumber.js';
import { BroadcastMode } from 'cosmjs-types/cosmos/tx/v1beta1/service';

import { checkIsDefined } from '../../../basic/precondtion';
import { ResponseError } from '../../../basic/request/exceptions';
import { RestfulRequest } from '../../../basic/request/restful';
import { CoinInfo } from '../../../types/chain';
import {
  AddressInfo,
  ClientInfo,
  EstimatedPrice,
  FeePricePerUnit,
  TransactionStatus,
} from '../../../types/provider';
import { BaseRestfulClient } from '../../abc';

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

class Tendermint extends BaseRestfulClient {
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
        balance = await this.getBalance(address, {
          tokenAddress: this.mainCoinDenom,
        });
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

  async getBalance(
    address: string,
    coin: Partial<CoinInfo>,
  ): Promise<BigNumber> {
    const balanceInfo = await this.restful
      .get(`/cosmos/bank/v1beta1/balances/${address}`)
      .then((i) => i.json()); // fixme pagination support

    let balance = new BigNumber(0);
    if (Array.isArray(balanceInfo.balances)) {
      const [info] = balanceInfo.balances.filter(
        (i: any) => i.denom === coin.tokenAddress,
      );
      info && (balance = new BigNumber(info.amount));
    }

    return balance;
  }

  getFeePricePerUnit(): Promise<FeePricePerUnit> {
    const gasPriceStep: typeof DEFAULT_GAS_PRICE_STEP =
      this.chainInfo?.implOptions?.gasPriceStep || DEFAULT_GAS_PRICE_STEP;

    const asEstimatedPrice = (
      step: keyof typeof DEFAULT_GAS_PRICE_STEP,
      waitingBlock: number,
    ): EstimatedPrice => ({
      price: new BigNumber(gasPriceStep[step]),
      waitingBlock,
    });

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

  async broadcastTransaction(rawTx: string): Promise<boolean> {
    const data = {
      mode: BroadcastMode.BROADCAST_MODE_SYNC,
      tx_bytes: rawTx,
    };
    const resp: any = await this.restful
      .post('/cosmos/tx/v1beta1/txs', data, true)
      .then((i) => i.json());

    return (
      typeof resp?.tx_response?.txhash === 'string' &&
      resp.tx_response.txhash.length === 64
    );
  }
}

export { Tendermint, GAS_STEP_MULTIPLIER };

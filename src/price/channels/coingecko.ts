import BigNumber from 'bignumber.js';
import { Response } from 'cross-fetch';

import { chunked } from '../../basic/array-plus';
import { RestfulRequest } from '../../basic/request/restful';
import { CoinInfo } from '../../types/chain';
import { Price, PriceChannel } from '../interfaces';

const PRESET_COINGECKO_IDS = {
  ethereum: 'eth',
  binancecoin: 'bsc',
  'huobi-token': 'heco',
  okexchain: 'okt',
};

class Coingecko implements PriceChannel {
  static readonly FIATS = new Set([
    'cny',
    'usd',
    'jpy',
    'krw',
    'gbp',
    'eur',
    'hkd',
    'myr',
    'aud',
    'inr',
  ]);
  readonly restfulReq: RestfulRequest;

  constructor() {
    this.restfulReq = new RestfulRequest('https://fiat.onekey.so');
  }

  async fetchApi(
    path: string,
    params?: Record<string, any>,
  ): Promise<Response> {
    let realPath = path;
    if (path === '/api/v3/coins/markets') {
      realPath = '/market/list';
    } else if (path.startsWith('/api/v3/')) {
      realPath = path.substring(8);
    }
    return this.restfulReq.get(realPath, params);
  }

  async fetchBTCPrices(): Promise<Array<Price>> {
    const resp: any = await this.fetchApi('/exchange_rates').then((i) =>
      i.json(),
    );
    const rates = resp?.rates || {};
    return Object.entries(rates)
      .filter(
        ([unit, rate]: [string, any]) =>
          typeof rate === 'object' &&
          rate.type === 'fiat' &&
          Coingecko.FIATS.has(unit),
      )
      .map(([unit, rate]: [string, any]) => ({
        coin: 'btc',
        unit,
        value: new BigNumber(rate.value),
      }));
  }

  async fetchCGKIdsPrices(
    cgkIds: Record<string, string>,
    unit = 'btc',
  ): Promise<Array<Price>> {
    const resp: Array<any> =
      (await this.fetchApi('/market/list', {
        ids: Object.keys(cgkIds).join(','),
        vs_currency: unit,
      }).then((i) => i.json())) || [];

    return resp
      .filter((i) => typeof i === 'object' && i.id && i.id in cgkIds)
      .map((i) => ({
        coin: cgkIds[i.id],
        unit,
        value: new BigNumber(i.current_price),
      }));
  }

  async fetchERC20Prices(
    coins: Array<CoinInfo>,
    unit = 'btc',
  ): Promise<Array<Price>> {
    const tokenAddress2Code = coins.reduce((acc, cur) => {
      acc[(cur.tokenAddress as string).toLowerCase()] = cur.code;
      return acc;
    }, {} as Record<string, string>);

    const prices: Array<Price> = [];

    for (const tokenAddresses of chunked(Object.keys(tokenAddress2Code), 100)) {
      const resp =
        (await this.fetchApi('/simple/token_price/ethereum', {
          contract_addresses: tokenAddresses.join(','),
          vs_currencies: unit,
        }).then((i) => i.json())) || {};

      prices.push(
        ...Object.entries(resp)
          .filter(
            ([address, rate]: [string, any]) =>
              typeof address &&
              typeof rate === 'object' &&
              address.toLowerCase() in tokenAddress2Code,
          )
          .map(([address, rate]: [string, any]) => ({
            coin: tokenAddress2Code[address.toLowerCase()],
            unit,
            value: new BigNumber(rate[unit]),
          })),
      );
    }

    return prices;
  }

  async pricing(coins: Array<CoinInfo>): Promise<Array<Price>> {
    const prices = [];

    try {
      const btcPrices = await this.fetchBTCPrices();
      prices.push(...btcPrices);
    } catch (e) {
      console.error('Error in fetching prices of btc. error: ', e);
    }

    const cgkIds = PRESET_COINGECKO_IDS;
    if (cgkIds) {
      try {
        const cgkIdsPrices = await this.fetchCGKIdsPrices(cgkIds);
        prices.push(...cgkIdsPrices);
      } catch (e) {
        console.error('Error in fetching prices of preset ckg ids. error: ', e);
      }
    }

    const erc20Coins = coins.filter(
      (i) => i.chainCode === 'eth' && i.tokenAddress,
    );
    if (erc20Coins.length > 0) {
      try {
        const erc20Prices = await this.fetchERC20Prices(erc20Coins);
        prices.push(...erc20Prices);
      } catch (e) {
        console.error('Error in fetching prices of ERC20. error: ', e);
      }
    }

    return prices.filter((i) => i.value.isFinite() && i.value.gt(0));
  }
}

export { Coingecko };

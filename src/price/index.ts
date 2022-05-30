import BigNumber from 'bignumber.js';

import { ProviderController } from '../provider';
import { CoinInfo } from '../types/chain';
import { StorageLike } from '../types/external-config';

import { Coingecko } from './channels/coingecko';
import { UniswapV2, UniswapV3 } from './channels/uniswap';
import { PriceChannel } from './interfaces';

const UNISWAPV2_CONFIG = {
  eth: {
    router_address: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
    base_token_address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    media_token_addresses: [
      '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
      '0xdac17f958d2ee523a2206206994597c13d831ec7',
    ],
  },
};

const UNISWAPV3_CONFIG = {
  eth: {
    quoter_address: '0xb27308f9f90d607463bb33ea1bebb41c27ce5ab6',
    base_token_address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    media_token_addresses: [
      '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
      '0xdac17f958d2ee523a2206206994597c13d831ec7',
    ],
  },
};

class PriceController {
  private static readonly PRICE_CACHE_TIMEOUT = 5 * 60 * 1000;
  readonly providerController: ProviderController;
  readonly storage: StorageLike;
  private readonly priceCache: { [k: string]: [BigNumber, number] } = {};

  constructor(providerController: ProviderController, storage: StorageLike) {
    this.providerController = providerController;
    this.storage = storage;
  }

  private _channels?: Array<PriceChannel>;

  get channels(): Array<PriceChannel> {
    if (!this._channels) {
      this._channels = this.initChannels();
    }

    return this._channels;
  }

  static generateSearchPaths(
    coin: CoinInfo,
    unit: string,
  ): Array<Array<string>> {
    const paths = [[coin.code, unit]];

    if (coin.code === 'btc' || unit === 'btc') {
      return paths;
    }

    paths.push([coin.code, 'btc', unit]);

    if (coin.chainCode && ![coin.code, unit, 'btc'].includes(coin.chainCode)) {
      paths.push([coin.code, coin.chainCode, unit]);
      paths.push([coin.code, coin.chainCode, 'btc', unit]);
    }

    return paths;
  }

  static splitPathsToPairs(paths: Array<Array<string>>): Array<string> {
    const pairs: Set<string> = new Set();

    for (const path of paths) {
      if (path.length < 2) {
        continue;
      }

      for (let i = 0, end = path.length - 1; i < end; ++i) {
        const [codeA, codeB] = path.slice(i, i + 2);
        if (codeA !== codeB) {
          pairs.add(`${codeA}-${codeB}`);
          pairs.add(`${codeB}-${codeA}`);
        }
      }
    }

    return Array.from(pairs.values());
  }

  initChannels(): Array<PriceChannel> {
    return [
      new Coingecko(),
      new UniswapV2(UNISWAPV2_CONFIG, this.providerController),
      new UniswapV3(UNISWAPV3_CONFIG, this.providerController),
    ];
  }

  async pricing(coins: Array<CoinInfo>): Promise<void> {
    if (coins.length <= 0) {
      return;
    }

    const cache: { [k: string]: Array<BigNumber> } = {};
    for (const channel of this.channels) {
      try {
        const prices = await channel.pricing(coins);

        for (const price of prices) {
          const pair = `${price.coin}-${price.unit}`.toUpperCase();
          if (typeof cache[pair] === 'undefined') {
            cache[pair] = [];
          }

          cache[pair].push(price.value);
        }
      } catch (e) {
        console.error(
          `Error in running channel. channel: ${channel.constructor.name}, error: `,
          e,
        );
      }
    }

    const results = Promise.all(
      Object.entries(cache)
        .map(
          ([pair, values]) =>
            [pair, BigNumber.sum(...values).div(values.length)] as [
              string,
              BigNumber,
            ],
        )
        .filter(([_, value]) => value.isFinite() && value.gt(0))
        .map(([pair, value]) =>
          this.storage.set(`PRICE-${pair}`, value.toString()).then(
            (value) => ({ status: 'fulfilled', value }),
            (reason) => ({ status: 'rejected', reason }),
          ),
        ),
    );

    console.debug('results of pricing: ', results);
  }

  async getPrice(
    coin: CoinInfo,
    unit: string,
    orDefault: number | BigNumber = 0,
  ): Promise<BigNumber> {
    const pair = `${coin.code}-${unit}`;
    let [value, expiredAt] = this.priceCache[pair] || [];

    if (value && expiredAt && expiredAt >= Date.now()) {
      return value;
    }
    delete this.priceCache[pair];

    value = await this.getPriceNoCache(coin, unit, orDefault);
    expiredAt = Date.now() + PriceController.PRICE_CACHE_TIMEOUT;
    this.priceCache[pair] = [value, expiredAt];
    return value;
  }

  async getPriceNoCache(
    coin: CoinInfo,
    unit: string,
    orDefault: number | BigNumber = 0,
  ): Promise<BigNumber> {
    if (coin.code === unit) {
      return new BigNumber(1);
    }

    orDefault = new BigNumber(orDefault);

    const paths = PriceController.generateSearchPaths(coin, unit);
    const pairs = PriceController.splitPathsToPairs(paths);
    if (pairs.length <= 0) {
      return orDefault;
    }

    const cachedPrices = (await this.storage.get(
      pairs.map((i) => `PRICE-${i}`.toUpperCase()),
    )) as Array<string | undefined>;
    if (cachedPrices.length !== pairs.length) {
      console.error(
        `The length of the price returned from storage does not match the length of the pair. ${cachedPrices.length} !== ${pairs.length}`,
      );
      return orDefault;
    }

    const pricesOfPairs = cachedPrices.reduce((acc, cur, index) => {
      if (typeof cur === 'string' && !!cur) {
        const value = new BigNumber(cur);
        if (value.isFinite() && value.gt(0)) {
          acc[pairs[index]] = value;
        }
      }

      return acc;
    }, {} as { [k: string]: BigNumber });

    let price = new BigNumber(0);
    for (const path of paths) {
      if (path.length < 2) {
        continue;
      }

      price = new BigNumber(1);
      for (let i = 0, end = path.length - 1; i < end; ++i) {
        const [codeA, codeB] = path.slice(i, i + 2);
        let rate;
        if (codeA === codeB) {
          rate = 1;
        } else {
          rate = pricesOfPairs[`${codeA}-${codeB}`];
          if (!rate || rate.lte(0)) {
            const revertedRate = pricesOfPairs[`${codeB}-${codeA}`];
            if (revertedRate && revertedRate.gt(0)) {
              rate = new BigNumber(1).div(revertedRate);
            }
          }

          rate =
            rate && rate.isFinite() && rate.gte(0) ? rate : new BigNumber(0);
        }

        price = price.multipliedBy(rate);
        if (!price.isFinite() || price.lte(0)) {
          // invalid path, try next
          break;
        }
      }

      if (price.isFinite() && price.gt(0)) {
        // got price already
        break;
      }
    }

    return price.isFinite() && price.gte(0) ? price : orDefault;
  }
}

export { PriceController };

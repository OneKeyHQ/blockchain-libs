import BigNumber from 'bignumber.js';

import { CoinInfo } from '../types/chain';

type Price = {
  coin: string;
  unit: string;
  value: BigNumber;
};

interface PriceChannel {
  pricing(coins: Array<CoinInfo>): Promise<Array<Price>>;
}

export { PriceChannel, Price };

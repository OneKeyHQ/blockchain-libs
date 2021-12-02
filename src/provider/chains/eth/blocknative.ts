import BigNumber from 'bignumber.js';

import { RestfulRequest } from '../../../basic/request/restful';
import { FeePricePerUnit } from '../../../types/provider';

const GWEI_MULTIPLIER = new BigNumber(1).shiftedBy(9);

class BlockNative {
  readonly restful: RestfulRequest;

  constructor() {
    this.restful = new RestfulRequest('https://blocknative-api.herokuapp.com');
  }

  async getFeePricePerUnit(): Promise<FeePricePerUnit> {
    type RawPrice = {
      price: number;
      maxPriorityFeePerGas: number;
      maxFeePerGas: number;
    };

    const resp: {
      estimatedPrices: Array<RawPrice>;
    } = await this.restful.get('/data').then((i) => i.json());

    const [fast, , normal, , slow] = resp.estimatedPrices;
    const convert = (price: RawPrice, waitingBlock: number) => ({
      price: new BigNumber(price.price).multipliedBy(GWEI_MULTIPLIER),
      waitingBlock,
      payload: {
        maxPriorityFeePerGas: new BigNumber(
          price.maxPriorityFeePerGas,
        ).multipliedBy(GWEI_MULTIPLIER),
        maxFeePerGas: new BigNumber(price.maxFeePerGas).multipliedBy(
          GWEI_MULTIPLIER,
        ),
      },
    });

    return {
      normal: convert(normal, 4),
      others: [convert(slow, 40), convert(fast, 1)],
    };
  }
}

export { BlockNative };

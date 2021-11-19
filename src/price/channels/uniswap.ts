import * as console from 'console';

import { defaultAbiCoder } from '@ethersproject/abi';
import { hexConcat } from '@ethersproject/bytes';
import BigNumber from 'bignumber.js';

import { groupBy } from '../../basic/array-plus';
import { toBigIntHex } from '../../basic/bignumber-plus';
import { ProviderController } from '../../provider';
import { Geth } from '../../provider/chains/eth';
import { CoinInfo } from '../../types/chain';
import { Price, PriceChannel } from '../interfaces';

const BASE_TOKEN_DECIMALS_MULTIPLY = new BigNumber(1).shiftedBy(18);

abstract class ABCUniswap implements PriceChannel {
  static BATCH_SIZE = 50;
  readonly config: Record<string, Record<string, any>>;
  readonly providerController: ProviderController;

  constructor(
    config: Record<string, Record<string, any>>,
    providerController: ProviderController,
  ) {
    this.config = config;
    this.providerController = providerController;
  }

  async pricing(coins: Array<CoinInfo>): Promise<Array<Price>> {
    const prices: Array<Price> = [];

    for (const [chainCode, partCoins] of Object.entries(
      groupBy(coins, (i) => i.chainCode),
    )) {
      if (typeof this.config[chainCode] !== 'object') {
        continue;
      }

      const configPerChain = this.config[chainCode];

      const wbtcConfig = configPerChain['wbtc'];
      if (typeof wbtcConfig === 'string' && wbtcConfig.includes('@')) {
        const [wbtcTokenAddress, wbtcDecimals] = wbtcConfig.split('@');
        partCoins.push({
          code: 'btc', // Query wbtc/eth as the price of btc
          chainCode: chainCode,
          decimals: parseInt(wbtcDecimals),
          tokenAddress: wbtcTokenAddress,
        });
      }

      const baseTokenAddress: string = configPerChain['base_token_address']; // also called wrapped token address, like WETH, WBNB etc.
      const mediaTokenAddresses: Array<string> =
        configPerChain['media_token_addresses']; // like WBTC, USDT, BUSD etc.

      const quotePaths: Array<Array<string>> = [];
      const refCoins: Array<{ coin: CoinInfo; quoteCount: number }> = [];

      for (const coin of partCoins) {
        if (!coin.tokenAddress) {
          continue;
        } else if (coin.tokenAddress === baseTokenAddress) {
          prices.push({
            coin: coin.code,
            value: new BigNumber(1),
            unit: chainCode,
          });
          continue;
        }

        if (mediaTokenAddresses.includes(coin.tokenAddress)) {
          quotePaths.push([coin.tokenAddress, baseTokenAddress]);
          refCoins.push({ coin, quoteCount: 1 });
        } else {
          const paths = [
            [coin.tokenAddress, baseTokenAddress],
            ...mediaTokenAddresses.map((media) => [
              coin.tokenAddress as string,
              media,
              baseTokenAddress,
            ]),
          ];
          quotePaths.push(...paths);
          refCoins.push({ coin, quoteCount: paths.length });
        }
      }

      const calls = [];
      const batchRefCoins = [];
      const lastIndex = refCoins.length - 1;
      const quoteContract = this.getContract(configPerChain);

      for (const [index, ref] of Object.entries(refCoins)) {
        calls.push(
          ...quotePaths
            .splice(0, ref.quoteCount)
            .map((path) => this.encodeCallData(ref.coin, path)),
        );
        batchRefCoins.push(ref);

        if (
          parseInt(index) < lastIndex &&
          calls.length < ABCUniswap.BATCH_SIZE
        ) {
          continue;
        }

        try {
          const priceBNs: Array<BigNumber | undefined> =
            await this.callContract(chainCode, quoteContract, calls);

          for (const i of batchRefCoins) {
            const bns: Array<BigNumber> = priceBNs
              .splice(0, i.quoteCount)
              .filter(
                (bn) => typeof bn !== 'undefined' && bn.isFinite() && bn.gt(0),
              )
              .map((bn) => bn as BigNumber);
            const priceBN = BigNumber.max(new BigNumber(0), ...bns);
            prices.push({
              coin: i.coin.code,
              unit: i.coin.chainCode,
              value: priceBN,
            });
          }
        } catch (e) {
          console.error(
            `Error in batching quote prices. coins: ${batchRefCoins.map(
              (i) => i.coin.code,
            )}`,
            e,
          );
        } finally {
          calls.splice(0, calls.length);
          batchRefCoins.splice(0, batchRefCoins.length);
        }
      }
    }

    return prices;
  }

  async callContract(
    chainCode: string,
    contract: string,
    calls: Array<string>,
  ): Promise<Array<BigNumber | undefined>> {
    const client = (await this.providerController.getClient(
      chainCode,
      (i) => i instanceof Geth,
    )) as Geth;

    const resp = await client.batchEthCall(
      calls.map((i) => ({ to: contract, data: i })),
    );

    return resp.map((i) => {
      if (typeof i === 'undefined') {
        return undefined;
      }
      const [value] = defaultAbiCoder.decode(['uint256'], '0x' + i.slice(-64));
      const bn = new BigNumber(value.toString());
      return bn.isFinite() ? bn.div(BASE_TOKEN_DECIMALS_MULTIPLY) : undefined;
    });
  }

  abstract getContract(configPerChain: Record<string, any>): string;
  abstract encodeCallData(coin: CoinInfo, path: Array<string>): string;
}

class UniswapV2 extends ABCUniswap {
  getContract(configPerChain: Record<string, any>): string {
    return configPerChain['router_address'];
  }

  encodeCallData(coin: CoinInfo, path: Array<string>): string {
    // https://docs.uniswap.org/protocol/V2/reference/smart-contracts/library#getamountsout
    const methodID = '0xd06ca61f'; //  keccak256(Buffer.from("getAmountsOut(uint256,address[])")).slice(0, 10)
    const amountIn = toBigIntHex(new BigNumber(1).shiftedBy(coin.decimals));
    const encodedParams = defaultAbiCoder.encode(
      ['uint256', 'address[]'],
      [amountIn, path],
    );
    return hexConcat([methodID, encodedParams]);
  }
}

class UniswapV3 extends ABCUniswap {
  getContract(configPerChain: Record<string, any>): string {
    return configPerChain['quoter_address'];
  }

  encodeCallData(coin: CoinInfo, path: Array<string>): string {
    // https://docs.uniswap.org/protocol/reference/periphery/interfaces/IQuoter#quoteexactinput
    const methodID = '0xcdca1753'; // keccak256(Buffer.from("quoteExactInput(bytes,uint256)")).slice(0, 10)
    const amountIn = toBigIntHex(new BigNumber(1).shiftedBy(coin.decimals));
    const pathHex = '0x' + path.map((i) => i.slice(2)).join('000bb8');
    const encodedParams = defaultAbiCoder.encode(
      ['bytes', 'uint256'],
      [pathHex, amountIn],
    );
    return hexConcat([methodID, encodedParams]);
  }
}

export { UniswapV2, UniswapV3 };

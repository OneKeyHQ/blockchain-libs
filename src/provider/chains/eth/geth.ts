import { defaultAbiCoder } from '@ethersproject/abi';
import BigNumber from 'bignumber.js';

import { fromBigIntHex } from '../../../basic/bignumber-plus';
import { check } from '../../../basic/precondtion';
import { JsonRPCRequest } from '../../../basic/request/json-rpc';
import { CoinInfo } from '../../../types/chain';
import {
  AddressInfo,
  ClientInfo,
  EstimatedPrice,
  FeePricePerUnit,
  PartialTokenInfo,
  TransactionStatus,
} from '../../../types/provider';
import { BaseClient } from '../../abc';

import { MmFee } from './mm-fee';

type EIP1559Price = {
  maxPriorityFeePerGas: BigNumber;
  maxFeePerGas: BigNumber;
  waitingBlock?: number;
};

type EIP1559Fee = {
  baseFee: BigNumber;
  normal: EIP1559Price;
  others?: Array<EIP1559Price>;
};

class Geth extends BaseClient {
  static readonly __LAST_BLOCK__ = 'latest';
  private _mmFee!: MmFee;
  readonly rpc: JsonRPCRequest;

  constructor(url: string) {
    super();
    this.rpc = new JsonRPCRequest(url);
  }

  get mmFee(): MmFee {
    if (!this._mmFee) {
      this._mmFee = new MmFee(Number(this.chainInfo?.implOptions?.chainId));
    }

    return this._mmFee;
  }

  async getInfo(): Promise<ClientInfo> {
    const latestBlock: any = await this.rpc.call('eth_getBlockByNumber', [
      Geth.__LAST_BLOCK__,
      false,
    ]);
    const bestBlockNumber = parseInt(latestBlock.number, 16);
    const isReady = !isNaN(bestBlockNumber) && bestBlockNumber > 0;

    return { bestBlockNumber, isReady };
  }

  async getAddresses(
    addresses: Array<string>,
  ): Promise<Array<AddressInfo | undefined>> {
    const calls = addresses.reduce((acc: Array<any>, cur) => {
      acc.push(['eth_getBalance', [cur, Geth.__LAST_BLOCK__]]);
      acc.push(['eth_getTransactionCount', [cur, Geth.__LAST_BLOCK__]]);

      return acc;
    }, []);

    const resp: Array<any> = await this.rpc.batchCall(
      calls,
      undefined,
      undefined,
      true,
    );
    const result = [];

    for (let i = 0, count = resp.length; i < count; i += 2) {
      const [balanceHex, nonceHex] = resp.slice(i, i + 2);
      let info = undefined;

      if (
        typeof balanceHex !== 'undefined' &&
        typeof nonceHex !== 'undefined'
      ) {
        const balance = fromBigIntHex(balanceHex);
        const nonce = parseInt(nonceHex, 16);
        if (!balance.isNaN() && !isNaN(nonce)) {
          info = {
            balance,
            nonce,
            existing: balance.gt(0) || nonce > 0,
          };
        }
      }

      result.push(info);
    }

    return result;
  }

  async getBalances(
    requests: Array<{ address: string; coin: Partial<CoinInfo> }>,
  ): Promise<Array<BigNumber | undefined>> {
    const calls: Array<any> = requests.map((i) =>
      i.coin?.tokenAddress
        ? [
            'eth_call',
            [
              {
                to: i.coin.tokenAddress,
                data:
                  '0x70a08231000000000000000000000000' +
                  i.address.toLowerCase().slice(2),
              },
              Geth.__LAST_BLOCK__,
            ],
          ]
        : ['eth_getBalance', [i.address, Geth.__LAST_BLOCK__]],
    );

    const resp: Array<string | undefined> = await this.rpc.batchCall(
      calls,
      undefined,
      undefined,
      true,
    );
    return resp.map((i) => {
      let balance = undefined;

      if (typeof i !== 'undefined') {
        balance = fromBigIntHex(i.slice(0, 66));

        if (balance.isNaN()) {
          balance = undefined;
        }
      }

      return balance;
    });
  }

  async getTransactionStatuses(
    txids: Array<string>,
  ): Promise<Array<TransactionStatus | undefined>> {
    const calls = txids.reduce((acc: Array<any>, cur) => {
      acc.push(['eth_getTransactionByHash', [cur]]);
      acc.push(['eth_getTransactionReceipt', [cur]]);
      return acc;
    }, []);

    const resp: Array<any> = await this.rpc.batchCall(
      calls,
      undefined,
      undefined,
      true,
    );

    const result = [];
    for (let i = 0, count = resp.length; i < count; i += 2) {
      const [tx, receipt] = resp.slice(i, i + 2);
      let status = undefined;

      if (typeof tx !== 'undefined' && typeof receipt !== 'undefined') {
        if (!tx) {
          status = TransactionStatus.NOT_FOUND;
        } else if (!receipt) {
          status = TransactionStatus.PENDING;
        } else {
          status =
            receipt.status === '0x1'
              ? TransactionStatus.CONFIRM_AND_SUCCESS
              : TransactionStatus.CONFIRM_BUT_FAILED;
        }
      }

      result.push(status);
    }

    return result;
  }

  async getTokenInfos(
    tokenAddresses: Array<string>,
  ): Promise<Array<PartialTokenInfo | undefined>> {
    const data = ['0x95d89b41', '0x06fdde03', '0x313ce567']; // method_selector of symbol, name and decimals
    const calls = tokenAddresses.reduce((acc: any, cur) => {
      const item = data
        .map((i) => ({ to: cur, data: i }))
        .map((i) => ['eth_call', [i, Geth.__LAST_BLOCK__]]);
      acc.push(...item);
      return acc;
    }, []);

    const resp: Array<any> = await this.rpc.batchCall(
      calls,
      undefined,
      undefined,
      true,
    );
    const tokens: Array<PartialTokenInfo | undefined> = [];

    for (let i = 0, count = resp.length; i < count; i += 3) {
      const [symbolHex, nameHex, decimalsHex] = resp.slice(i, i + 3);

      if (
        typeof symbolHex === 'undefined' ||
        typeof nameHex === 'undefined' ||
        typeof decimalsHex === 'undefined'
      ) {
        tokens.push(undefined);
        continue;
      }

      try {
        const [symbol] = defaultAbiCoder.decode(['string'], symbolHex);
        const [name] = defaultAbiCoder.decode(['string'], nameHex);
        const decimals = parseInt(decimalsHex, 16);
        check(!isNaN(decimals));

        tokens.push({
          symbol,
          name,
          decimals,
        });
      } catch (e) {
        console.error(e);
        tokens.push(undefined);
      }
    }

    return tokens;
  }

  async getFeePricePerUnit(): Promise<FeePricePerUnit> {
    if (this.chainInfo?.implOptions?.EIP1559Enabled === true) {
      const eip1559Fee = await this.estimateEIP1559FeeStrategy();
      const toLegacy = (price: EIP1559Price): EstimatedPrice => ({
        price: eip1559Fee.baseFee.plus(price.maxPriorityFeePerGas),
        payload: price,
      });

      return {
        normal: toLegacy(eip1559Fee.normal),
        others: eip1559Fee.others?.map(toLegacy),
      };
    }

    const gasPriceHex: string = await this.rpc.call('eth_gasPrice', []);
    const gasPrice = fromBigIntHex(gasPriceHex);

    const slow =
      gasPrice.isFinite() && gasPrice.gt(1) ? gasPrice : new BigNumber(1);
    const normal = slow.multipliedBy(1.25).integerValue(BigNumber.ROUND_CEIL);
    const fast = normal.multipliedBy(1.2).integerValue(BigNumber.ROUND_CEIL); // 1.25 * 1.2 = 1.5

    return {
      normal: { price: normal },
      others: [{ price: slow }, { price: fast }],
    };
  }

  async estimateEIP1559FeeStrategy(): Promise<EIP1559Fee> {
    try {
      if (
        this.chainInfo?.implOptions?.EIP1559Enabled === true &&
        this.chainInfo?.implOptions?.preferMetamask === true
      ) {
        return this.mmFee.estimateEIP1559Fee();
      }
    } catch (e) {
      console.error('Failed to estimate EIP1559 fee for MM', e);
    }

    return this.estimateEIP1559Fee();
  }

  async estimateEIP1559Fee(): Promise<EIP1559Fee> {
    const [latestBlock, feeHistory] = await this.rpc.batchCall([
      ['eth_getBlockByNumber', ['pending', false]],
      ['eth_feeHistory', [20, 'pending', [5, 25, 80]]],
    ]);

    const baseFee = new BigNumber(latestBlock.baseFeePerGas);
    const avg = (nums: number[]) => {
      nums = nums.filter((i) => i > 0);
      return new BigNumber(
        Math.round(nums.reduce((a, c) => a + c) / nums.length),
      );
    };

    const slow = avg(feeHistory.reward.map((i: string[]) => Number(i[0])));
    const normal = avg(feeHistory.reward.map((i: string[]) => Number(i[1])));
    const fast = avg(feeHistory.reward.map((i: string[]) => Number(i[2])));

    return {
      baseFee: baseFee,
      normal: {
        maxPriorityFeePerGas: normal,
        maxFeePerGas: baseFee.multipliedBy(1.25).plus(normal).integerValue(),
      },
      others: [
        {
          maxPriorityFeePerGas: slow,
          maxFeePerGas: baseFee.multipliedBy(1.13).plus(slow).integerValue(),
        },
        {
          maxPriorityFeePerGas: fast,
          maxFeePerGas: baseFee.multipliedBy(1.3).plus(fast).integerValue(),
        },
      ],
    };
  }

  async broadcastTransaction(rawTx: string): Promise<boolean> {
    const txid: any = await this.rpc.call('eth_sendRawTransaction', [rawTx]);
    return typeof txid === 'string' && txid.length === 66;
  }

  estimateGasLimit(
    fromAddress: string,
    toAddress: string,
    value: string,
    data?: string,
  ): Promise<string> {
    return this.rpc.call('eth_estimateGas', [
      {
        from: fromAddress,
        to: toAddress,
        value: value,
        data: data || '0x',
      },
    ]);
  }

  async isContract(address: string): Promise<boolean> {
    let code: string = await this.rpc.call('eth_getCode', [
      address,
      Geth.__LAST_BLOCK__,
    ]);

    if (code && code.startsWith('0x')) {
      code = code.slice(2);
    }

    return code.length > 0;
  }

  async batchEthCall(
    calls: Array<{ to: string; data: string }>,
  ): Promise<Array<string>> {
    return this.rpc.batchCall(
      calls.map((i) => ['eth_call', [i, Geth.__LAST_BLOCK__]]),
    );
  }
}

export { Geth, EIP1559Price, EIP1559Fee };

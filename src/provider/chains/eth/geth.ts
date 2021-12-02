import { defaultAbiCoder } from '@ethersproject/abi';
import BigNumber from 'bignumber.js';

import { fromBigIntHex } from '../../../basic/bignumber-plus';
import { check } from '../../../basic/precondtion';
import { JsonRPCRequest } from '../../../basic/request/json-rpc';
import { CoinInfo } from '../../../types/chain';
import {
  AddressInfo,
  ClientInfo,
  FeePricePerUnit,
  PartialTokenInfo,
  TransactionStatus,
} from '../../../types/provider';
import { BaseClient } from '../../abc';

import * as EIP1559Fee from './sdk/eip1559-fee';

class Geth extends BaseClient {
  static readonly __LAST_BLOCK__ = 'latest';
  readonly rpc: JsonRPCRequest;

  constructor(url: string) {
    super();
    this.rpc = new JsonRPCRequest(url);
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
    const gasPriceHex: string = await this.rpc.call('eth_gasPrice', []);
    const gasPrice = fromBigIntHex(gasPriceHex);

    const slow =
      gasPrice.isFinite() && gasPrice.gt(1) ? gasPrice : new BigNumber(1);
    const normal = slow.multipliedBy(1.25).integerValue(BigNumber.ROUND_CEIL);
    const fast = normal.multipliedBy(1.2).integerValue(BigNumber.ROUND_CEIL); // 1.25 * 1.2 = 1.5

    const fee: any = {
      normal: { price: normal, waitingBlock: 4 },
      others: [
        { price: slow, waitingBlock: 40 },
        { price: fast, waitingBlock: 1 },
      ],
    };

    if (this.chainInfo?.implOptions?.EIP1559Enabled === true) {
      const eip1559Fee = await this.getFeePriceForEIP1559();
      fee.normal.payload = eip1559Fee.normal.payload;
      fee.others[0].payload = eip1559Fee.others?.[0].payload;
      fee.others[1].payload = eip1559Fee.others?.[1].payload;
    }

    return fee;
  }

  async getFeePriceForEIP1559(): Promise<FeePricePerUnit> {
    const [latestBlock, feeHistory] = await this.rpc.batchCall([
      ['eth_getBlockByNumber', ['latest', false]],
      ['eth_feeHistory', [10, 'latest', [5]]],
    ]);
    const baseFee = new BigNumber(latestBlock.baseFeePerGas);
    const fast = EIP1559Fee.estimateFee(baseFee, feeHistory);
    const normal = {
      maxFeePerGas: fast.maxFeePerGas.multipliedBy(0.8),
      maxPriorityFeePerGas: fast.maxPriorityFeePerGas.multipliedBy(0.8),
    };
    const slow = {
      maxFeePerGas: fast.maxFeePerGas.multipliedBy(0.5),
      maxPriorityFeePerGas: fast.maxPriorityFeePerGas.multipliedBy(0.5),
    };

    const placeholder = new BigNumber(0);
    return {
      normal: {
        price: placeholder,
        waitingBlock: 1,
        payload: normal,
      },
      others: [
        { price: placeholder, waitingBlock: 40, payload: slow },
        { price: placeholder, waitingBlock: 1, payload: fast },
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

export { Geth };

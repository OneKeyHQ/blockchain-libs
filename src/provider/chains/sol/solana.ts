import BigNumber from 'bignumber.js';

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

class Solana extends BaseClient {
  readonly rpc: JsonRPCRequest;
  constructor(url: string) {
    super();
    this.rpc = new JsonRPCRequest(url);
  }
  async broadcastTransaction(rawTx: string): Promise<boolean> {
    let isSuccess = true;
    try {
      this.rpc.call('sendTransaction', [rawTx, { encoding: 'base64' }]);
    } catch (error) {
      isSuccess = false;
    }
    return isSuccess;
  }

  async getInfo(): Promise<ClientInfo> {
    const [epochInfo, ok] = await this.rpc.batchCall([
      ['getEpochInfo', []],
      ['getHealth', []],
    ]);
    const slot = epochInfo.absoluteSlot;
    const isReady = ok === 'ok';
    return {
      bestBlockNumber: slot,
      isReady,
    };
  }

  async getAddresses(
    addresses: string[],
  ): Promise<Array<AddressInfo | undefined>> {
    const calls: Array<any> = addresses.map((address) => [
      'getAccountInfo',
      [address, { encoding: 'jsonParsed' }],
    ]);
    const resp: Array<{ [key: string]: any } | undefined> =
      await this.rpc.batchCall(calls);
    const result: Array<AddressInfo | undefined> = [];
    for (const accountInfo of resp) {
      let balance = new BigNumber(0);
      let existing = false;
      if (typeof accountInfo !== 'undefined') {
        if (accountInfo?.value !== null) {
          balance = new BigNumber(accountInfo.value.lamports);
          existing = true;
        }
        result.push({
          balance,
          existing,
        });
      } else {
        result.push(undefined);
      }
    }
    return result;
  }

  async getBalances(
    requests: { address: string; coin: Partial<CoinInfo> }[],
  ): Promise<(BigNumber | undefined)[]> {
    const calls: Array<any> = requests.map((request) =>
      request.coin?.tokenAddress
        ? [
            'getTokenAccountsByOwner',
            [
              request.address,
              { mint: request.coin.tokenAddress },
              { encoding: 'jsonParsed' },
            ],
          ]
        : ['getAccountInfo', [request.address, { encoding: 'jsonParsed' }]],
    );
    const resps: Array<{ [key: string]: any } | undefined> =
      await this.rpc.batchCall(calls);
    const result: Array<BigNumber | undefined> = [];
    resps.forEach((resp, i) => {
      if (typeof resp !== 'undefined') {
        let balance = new BigNumber(0);
        if (requests[i].coin?.tokenAddress) {
          for (const tokenAccount of resp.value) {
            const info = tokenAccount.account.data.parsed.info;
            if (info.owner === requests[i].address) {
              balance = BigNumber.sum(balance, info.tokenAmount.amount);
            } else {
              //TODO: send sentry warnings
            }
          }
        } else {
          if (resp.value !== null) {
            balance = new BigNumber(resp.value.lamports);
          }
        }
        result.push(balance);
      } else {
        result.push(undefined);
      }
    });
    return result;
  }

  async getAccountInfo(
    address: string,
  ): Promise<{ [key: string]: any } | null> {
    const response: { [key: string]: any } = await this.rpc.call(
      'getAccountInfo',
      [address, { encoding: 'jsonParsed' }],
    );
    return response.value;
  }

  async getFeePricePerUnit(): Promise<FeePricePerUnit> {
    const [feePerSig] = await this.getFees();
    return {
      normal: {
        price: new BigNumber(feePerSig),
      },
    };
  }

  async getFees(): Promise<[number, string]> {
    const feeInfo: { [key: string]: any } = await this.rpc.call('getFees');
    const feePerSig = feeInfo.value.feeCalculator.lamportsPerSignature;
    const recentBlockhash = feeInfo.value.blockhash;
    return [feePerSig, recentBlockhash];
  }

  async getTransactionStatuses(
    txids: string[],
  ): Promise<Array<TransactionStatus | undefined>> {
    const calls: Array<any> = txids.map((txid) => [
      'getTransaction',
      [txid, 'jsonParsed'],
    ]);
    const result = [];
    const resp: Array<{ [key: string]: any } | undefined> =
      await this.rpc.batchCall(calls);
    for (const tx of resp) {
      if (typeof tx !== 'undefined') {
        if (tx === null) {
          result.push(TransactionStatus.NOT_FOUND);
        } else {
          result.push(
            tx.meta.err === null
              ? TransactionStatus.CONFIRM_AND_SUCCESS
              : TransactionStatus.CONFIRM_BUT_FAILED,
          );
        }
      } else {
        result.push(undefined);
      }
    }

    return result;
  }
  async getTokenInfos(
    tokenAddresses: Array<string>,
  ): Promise<Array<PartialTokenInfo | undefined>> {
    const calls: any = tokenAddresses.map((address) => [
      'getAccountInfo',
      [address, { encoding: 'jsonParsed' }],
    ]);
    const resp: Array<{ [key: string]: any } | undefined> =
      await this.rpc.batchCall(calls);
    const tokenInfos: Array<PartialTokenInfo | undefined> = [];
    resp.forEach((tokenInfo, i) => {
      if (typeof tokenInfo !== 'undefined') {
        if (
          tokenInfo.value !== null &&
          tokenInfo.value.data.parsed.type === 'mint'
        ) {
          const accountInfo = tokenInfo.value.data.parsed;
          const decimals = accountInfo.info.decimals;
          const name = tokenAddresses[i].slice(0, 4);
          tokenInfos.push({
            name,
            symbol: name.toUpperCase(),
            decimals,
          });
        } else {
          console.error('invalid token address');
          tokenInfos.push(undefined);
        }
      } else {
        tokenInfos.push(undefined);
      }
    });

    return tokenInfos;
  }
}
export { Solana };

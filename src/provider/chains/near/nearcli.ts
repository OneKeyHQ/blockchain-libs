import BigNumber from 'bignumber.js';
import * as borsh from 'borsh';

import { JsonPRCResponseError } from '../../../basic/request/exceptions';
import { JsonRPCRequest } from '../../../basic/request/json-rpc';
import { CoinInfo } from '../../../types/chain';
import {
  AddressInfo,
  ClientInfo,
  FeePricePerUnit,
  TransactionStatus,
} from '../../../types/provider';
import { SimpleClient } from '../../abc';

type NearAccessKey = {
  type: 'FullAccess' | 'FunctionCall';
  pubkey: string;
  pubkeyHex: string;
  nonce: number;
  functionCall?: {
    allowance: string;
    receiverId: string;
    methodNames: string[];
  };
};

function parseJsonFromRawResponse(response: Uint8Array): any {
  return JSON.parse(Buffer.from(response).toString());
}

function bytesJsonStringify(input: any): Buffer {
  return Buffer.from(JSON.stringify(input));
}

export type GasCostConfig = {
  send_sir: number;
  send_not_sir: number;
  execution: number;
};

class NearCli extends SimpleClient {
  readonly rpc: JsonRPCRequest;

  constructor(
    url: string,
    readonly defaultFinality: 'optimistic' | 'final' = 'optimistic',
  ) {
    super();
    this.rpc = new JsonRPCRequest(url);
  }

  async getInfo(): Promise<ClientInfo> {
    const { blockNumber } = await this.getBestBlock();
    const isReady = Number.isFinite(blockNumber) && blockNumber > 0;

    return {
      bestBlockNumber: blockNumber,
      isReady,
    };
  }

  async getTxCostConfig(): Promise<Record<string, GasCostConfig>> {
    const resp: any = await this.rpc.call('EXPERIMENTAL_protocol_config', {
      finality: this.defaultFinality,
    });
    const {
      runtime_config: {
        transaction_costs: {
          action_receipt_creation_config,
          action_creation_config: { transfer_cost },
        },
      },
    } = resp;

    return {
      action_receipt_creation_config,
      transfer_cost,
    };
  }

  async getBestBlock(): Promise<{ blockNumber: number; blockHash: string }> {
    const resp: any = await this.rpc.call('status', []);
    return {
      blockNumber: Number(resp.sync_info.latest_block_height),
      blockHash: resp.sync_info.latest_block_hash,
    };
  }

  async getAddress(address: string): Promise<AddressInfo> {
    try {
      const balanceInfo: any = await this.rpc.call('query', {
        request_type: 'view_account',
        account_id: address,
        finality: this.defaultFinality,
      });
      const balance = new BigNumber(balanceInfo.amount);
      const accessKeys = await this.getAccessKeys(address);
      const fullAccessKeys = accessKeys.filter((i) => i.type === 'FullAccess');
      const [{ nonce }] =
        fullAccessKeys.length > 0 ? fullAccessKeys : accessKeys;

      return {
        existing: true,
        balance,
        nonce: Number.isFinite(nonce) && nonce > 0 ? nonce : undefined,
      };
    } catch (e) {
      if (e instanceof JsonPRCResponseError && e.response) {
        try {
          const error: any = await e.response.json();
          if (error?.cause?.name === 'UNKNOWN_ACCOUNT') {
            return {
              existing: false,
              balance: new BigNumber(0),
            };
          }
        } catch (e) {
          // ignored
        }
      }

      throw e;
    }
  }

  async getAccessKeys(address: string): Promise<NearAccessKey[]> {
    const info: any = await this.rpc.call('query', {
      request_type: 'view_access_key_list',
      account_id: address,
      finality: this.defaultFinality,
    });

    return info.keys.map((key: any) => {
      const permission = key.access_key.permission;
      const isFullAccessKey = permission === 'FullAccess';

      return {
        type: isFullAccessKey ? 'FullAccess' : 'FunctionCall',
        pubkey: key.public_key,
        pubkeyHex: borsh
          .baseDecode(key.public_key.split(':')[1] || '')
          .toString('hex'),
        nonce: key.access_key.nonce + 1,
        functionCall: !isFullAccessKey
          ? {
              allowance: permission.FunctionCall.allowance,
              receiverId: permission.FunctionCall.receiver_id,
              methodNames: permission.FunctionCall.method_names,
            }
          : undefined,
      };
    });
  }

  async getBalance(
    address: string,
    coin: Partial<CoinInfo>,
  ): Promise<BigNumber> {
    if (coin?.tokenAddress) {
      const tokenBalanceStr: string = await this.callContract(
        coin.tokenAddress,
        'ft_balance_of',
        { account_id: address },
      );
      return new BigNumber(tokenBalanceStr);
    } else {
      const balanceInfo: any = await this.rpc.call('query', {
        request_type: 'view_account',
        account_id: address,
        finality: this.defaultFinality,
      });
      return new BigNumber(balanceInfo.amount);
    }
  }

  async getFeePricePerUnit(): Promise<FeePricePerUnit> {
    const resp: any = await this.rpc.call('gas_price', [null]);
    const normalPrice = new BigNumber(resp.gas_price);

    return {
      normal: {
        price: normalPrice,
      },
    };
  }

  async getTransactionStatus(txid: string): Promise<TransactionStatus> {
    try {
      const resp: any = await this.rpc.call('tx', [
        txid,
        'dontcare', // required tx signer actually, but I found that just filling in any string works fine
      ]);

      if (typeof resp.status === 'object' && 'SuccessValue' in resp.status) {
        return TransactionStatus.CONFIRM_AND_SUCCESS;
      } else {
        return TransactionStatus.CONFIRM_BUT_FAILED;
      }
    } catch (e) {
      if (e instanceof JsonPRCResponseError && e.response) {
        try {
          const error: any = await e.response.json();
          if (error?.cause?.name === 'UNKNOWN_TRANSACTION') {
            return TransactionStatus.NOT_FOUND;
          }
        } catch (e) {
          // ignored
        }
      }

      throw e;
    }
  }

  async callContract(
    contract: string,
    methodName: string,
    args: any = {},
    { parse = parseJsonFromRawResponse, stringify = bytesJsonStringify } = {},
  ): Promise<any> {
    const serializedArgs = stringify(args).toString('base64');
    const result: any = await this.rpc.call('query', {
      request_type: 'call_function',
      finality: this.defaultFinality,
      method_name: methodName,
      account_id: contract,
      args_base64: serializedArgs,
    });

    return (
      result.result &&
      result.result.length > 0 &&
      parse(Buffer.from(result.result))
    );
  }

  async broadcastTransaction(rawTx: string): Promise<string> {
    const tx: any = await this.rpc.call('broadcast_tx_commit', [rawTx]);
    return tx.transaction.hash;
  }
}

export { NearCli, NearAccessKey };

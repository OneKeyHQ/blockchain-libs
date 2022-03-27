import { Success, Unsuccessful } from '@onekeyfe/connect';
import BigNumber from 'bignumber.js';

import { HardwareError, NotImplementedError } from '../basic/exceptions';
import { check } from '../basic/precondtion';
import { ChainInfo, CoinInfo } from '../types/chain';
import {
  AddressInfo,
  AddressValidation,
  ClientInfo,
  FeePricePerUnit,
  PartialTokenInfo,
  SignedTx,
  TransactionStatus,
  TypedMessage,
  UnsignedTx,
  UTXO,
} from '../types/provider';
import { Signer, Verifier } from '../types/secret';

abstract class BaseClient {
  chainInfo?: ChainInfo;

  setChainInfo(chainInfo: ChainInfo) {
    this.chainInfo = chainInfo;
  }

  abstract getInfo(): Promise<ClientInfo>;

  abstract getAddresses(
    addresses: Array<string>,
  ): Promise<Array<AddressInfo | undefined>>;

  abstract getBalances(
    requests: Array<{ address: string; coin: Partial<CoinInfo> }>,
  ): Promise<Array<BigNumber | undefined>>;

  abstract getTransactionStatuses(
    txids: Array<string>,
  ): Promise<Array<TransactionStatus | undefined>>;

  abstract getFeePricePerUnit(): Promise<FeePricePerUnit>;

  abstract broadcastTransaction(rawTx: string): Promise<string>;

  getTokenInfos(
    tokenAddresses: Array<string>,
  ): Promise<Array<PartialTokenInfo | undefined>> {
    return Promise.reject(NotImplementedError);
  }

  getUTXOs(addresses: Array<string>): Promise<{ [address: string]: UTXO[] }> {
    return Promise.reject(NotImplementedError);
  }
}

abstract class SimpleClient extends BaseClient {
  async batchCall2SingleCall<T, R>(
    inputs: T[],
    handler: (input: T) => Promise<R | undefined>,
  ): Promise<Array<R | undefined>> {
    const outputs = await Promise.allSettled(inputs.map(handler));
    check(
      inputs.length === outputs.length,
      `Batch call ${inputs.length} requests, but received ${outputs.length} results`,
    );

    return outputs.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.debug(
          `Error in Calling ${handler.name}. `,
          ' input: ',
          inputs[index],
          ', reason',
          result.reason,
        );
      }
    });
  }

  async getAddresses(
    addresses: Array<string>,
  ): Promise<Array<AddressInfo | undefined>> {
    return this.batchCall2SingleCall(addresses, (i) => this.getAddress(i));
  }

  abstract getAddress(address: string): Promise<AddressInfo>;

  getBalances(
    requests: Array<{ address: string; coin: Partial<CoinInfo> }>,
  ): Promise<Array<BigNumber | undefined>> {
    return this.batchCall2SingleCall(requests, (i) =>
      this.getBalance(i.address, i.coin),
    );
  }

  getBalance(address: string, coin: Partial<CoinInfo>): Promise<BigNumber> {
    return this.getAddress(address).then((res) => res.balance);
  }

  getTransactionStatuses(
    txids: Array<string>,
  ): Promise<Array<TransactionStatus | undefined>> {
    return this.batchCall2SingleCall(txids, (i) =>
      this.getTransactionStatus(i),
    );
  }

  abstract getTransactionStatus(txid: string): Promise<TransactionStatus>;

  getTokenInfos(
    tokenAddresses: Array<string>,
  ): Promise<Array<PartialTokenInfo | undefined>> {
    return this.batchCall2SingleCall(tokenAddresses, (i) =>
      this.getTokenInfo(i),
    );
  }

  getTokenInfo(tokenAddress: string): Promise<PartialTokenInfo | undefined> {
    return Promise.reject(NotImplementedError);
  }

  async getUTXOs(
    addresses: Array<string>,
  ): Promise<{ [address: string]: UTXO[] }> {
    const result = await this.batchCall2SingleCall(addresses, (i) =>
      this.getUTXO(i),
    );
    return result.reduce<{ [address: string]: UTXO[] }>((acc, utxos, index) => {
      const curAddress = addresses[index];
      acc[curAddress] = utxos || [];
      return acc;
    }, {});
  }

  getUTXO(address: string): Promise<UTXO[]> {
    return Promise.reject(NotImplementedError);
  }
}

type ClientFilter = <T extends BaseClient>(client: T) => boolean;

abstract class BaseProvider {
  readonly chainInfo: ChainInfo;
  readonly clientSelector: <T extends BaseClient>(
    filter?: ClientFilter,
  ) => Promise<T>;

  constructor(
    chainInfo: ChainInfo,
    clientSelector: <T extends BaseClient>(filter?: ClientFilter) => Promise<T>,
  ) {
    this.chainInfo = chainInfo;
    this.clientSelector = clientSelector;
  }

  abstract pubkeyToAddress(
    verifier: Verifier,
    encoding?: string,
  ): Promise<string>;

  abstract verifyAddress(address: string): Promise<AddressValidation>;

  abstract buildUnsignedTx(unsignedTx: UnsignedTx): Promise<UnsignedTx>;

  abstract signTransaction(
    unsignedTx: UnsignedTx,
    signers: { [p: string]: Signer },
  ): Promise<SignedTx>;

  verifyTokenAddress(address: string): Promise<AddressValidation> {
    return this.verifyAddress(address);
  }

  signMessage(
    message: TypedMessage,
    signer: Signer,
    address?: string,
  ): Promise<string> {
    return Promise.reject(NotImplementedError);
  }

  verifyMessage(
    address: string,
    message: TypedMessage,
    signature: string,
  ): Promise<boolean> {
    return Promise.reject(NotImplementedError);
  }

  async wrapHardwareCall<T>(
    callee: () => Promise<Unsuccessful | Success<T>>,
  ): Promise<T> {
    const resp = await callee();
    if (!resp.success) {
      throw new HardwareError(resp.payload);
    }

    return resp.payload;
  }

  hardwareGetXpubs(
    paths: string[],
    showOnDevice: boolean,
  ): Promise<{ path: string; xpub: string }[]> {
    return Promise.reject(NotImplementedError);
  }

  hardwareGetAddress(
    path: string,
    showOnDevice: boolean,
    addressToVerify?: string,
  ): Promise<string> {
    return Promise.reject(NotImplementedError);
  }

  hardwareSignTransaction(
    unsignedTx: UnsignedTx,
    signers: Record<string, string>,
  ): Promise<SignedTx> {
    return Promise.reject(NotImplementedError);
  }

  hardwareSignMessage(message: TypedMessage, signer: string): Promise<string> {
    return Promise.reject(NotImplementedError);
  }

  hardwareVerifyMessage(
    address: string,
    message: TypedMessage,
    signature: string,
  ): Promise<boolean> {
    return Promise.reject(NotImplementedError);
  }
}

export { BaseClient, SimpleClient, BaseProvider, ClientFilter };

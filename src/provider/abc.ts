import BigNumber from 'bignumber.js';

import { NotImplementedError } from '../basic/exceptions';
import { ChainInfo, CoinInfo } from '../types/chain';
import {
  AddressInfo,
  AddressValidation,
  ClientInfo,
  FeePricePerUnit,
  PartialTokenInfo,
  SignedTx,
  TransactionStatus,
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

  abstract broadcastTransaction(rawTx: string): Promise<boolean>;

  getTokenInfos(
    tokenAddresses: Array<string>,
  ): Promise<Array<PartialTokenInfo | undefined>> {
    return Promise.reject(NotImplementedError);
  }

  getUTXOs(addresses: Array<string>): Promise<{ [address: string]: UTXO[] }> {
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
    message: string,
    signer: Signer,
    address?: string,
  ): Promise<string> {
    return Promise.reject(NotImplementedError);
  }

  verifyMessage(
    address: string,
    message: string,
    signature: string,
  ): Promise<boolean> {
    return Promise.reject(NotImplementedError);
  }
}

export { BaseClient, BaseProvider, ClientFilter };

import BigNumber from 'bignumber.js';

import { checkIsDefined } from '../basic/precondtion';
import { createAnyPromise, createDelayPromise } from '../basic/promise-plus';
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

import { BaseClient, BaseProvider, ClientFilter } from './abc';

const IMPLS: { [key: string]: any } = {
  eth: require('./chains/eth'),
};

class ProviderController {
  private clientsCache: { [chainCoin: string]: Array<BaseClient> } = {};
  private lastClientCache: { [chainCoin: string]: [BaseClient, number] } = {};

  chainSelector: (chainCoin: string) => ChainInfo;

  constructor(chainSelector: (chainCoin: string) => ChainInfo) {
    this.chainSelector = chainSelector;
  }

  async getClient(
    chainCoin: string,
    filter?: ClientFilter,
  ): Promise<BaseClient> {
    filter = filter || (() => true);
    const [lastClient, expiredAt] = this.lastClientCache[chainCoin] || [];

    if (
      typeof lastClient !== undefined &&
      expiredAt <= Date.now() &&
      filter(lastClient)
    ) {
      return Promise.resolve(lastClient);
    }

    let clients = this.clientsCache[chainCoin];

    if (!clients || clients.length === 0) {
      const chainInfo = this.chainSelector(chainCoin);

      const module: any = this.requireChainImpl(chainInfo.impl);
      clients = chainInfo.clients
        .map((config) => [module[config.name], config])
        .filter(([clazz, _]) => typeof clazz != 'undefined')
        .map(([clazz, config]) => new clazz(...config.args));

      for (const client of clients) {
        client.setChainInfo(chainInfo);
      }
      this.clientsCache[chainCoin] = clients;
    }

    let client: BaseClient | undefined = undefined;

    try {
      client = await Promise.race([
        createAnyPromise(
          clients.filter(filter).map(async (candidate) => {
            const info = await candidate.getInfo();

            if (!info.isReady) {
              throw Error(
                `${candidate.constructor.name}<${candidate}> is not ready.`,
              );
            }

            return candidate;
          }),
        ),
        createDelayPromise(10000, undefined),
      ]);
    } catch (e) {
      console.error(e);
    }

    if (typeof client === 'undefined') {
      throw Error('No available client');
    }

    this.lastClientCache[chainCoin] = [client, Date.now() + 300000]; // Expired at 5 minutes
    return client;
  }

  getProvider(chainCoin: string): Promise<BaseProvider> {
    const chainInfo = this.chainSelector(chainCoin);
    const { Provider } = this.requireChainImpl(chainInfo.impl);

    return Promise.resolve(
      new Provider(chainInfo, (filter?: ClientFilter) =>
        this.getClient(chainCoin, filter),
      ),
    );
  }

  requireChainImpl(impl: string): any {
    return checkIsDefined(IMPLS[impl]);
  }

  getInfo(chainCoin: string): Promise<ClientInfo> {
    return this.getClient(chainCoin).then((client) => client.getInfo());
  }

  getAddresses(
    chainCoin: string,
    address: Array<string>,
  ): Promise<Array<AddressInfo | undefined>> {
    return this.getClient(chainCoin).then((client) =>
      client.getAddresses(address),
    );
  }

  async getBalances(
    chainCoin: string,
    requests: Array<{ address: string; coin: Partial<CoinInfo> }>,
  ): Promise<Array<BigNumber | undefined>> {
    return this.getClient(chainCoin).then((client) =>
      client.getBalances(requests),
    );
  }

  getTransactionStatuses(
    chainCoin: string,
    txids: Array<string>,
  ): Promise<Array<TransactionStatus | undefined>> {
    return this.getClient(chainCoin).then((client) =>
      client.getTransactionStatuses(txids),
    );
  }

  getFeePricePerUnit(chainCoin: string): Promise<FeePricePerUnit> {
    return this.getClient(chainCoin).then((client) =>
      client.getFeePricePerUnit(),
    );
  }

  broadcastTransaction(chainCoin: string, rawTx: string): Promise<boolean> {
    return this.getClient(chainCoin).then((client) =>
      client.broadcastTransaction(rawTx),
    );
  }

  getTokenInfos(
    chainCoin: string,
    tokenAddresses: Array<string>,
  ): Promise<Array<PartialTokenInfo | undefined>> {
    return this.getClient(chainCoin).then((client) =>
      client.getTokenInfos(tokenAddresses),
    );
  }

  getUTXOs(
    chainCoin: string,
    address: Array<string>,
  ): Promise<{ [address: string]: Array<UTXO> }> {
    return this.getClient(chainCoin).then((provider) =>
      provider.getUTXOs(address),
    );
  }

  buildUnsignedTx(
    chainCoin: string,
    unsignedTx: UnsignedTx,
  ): Promise<UnsignedTx> {
    return this.getProvider(chainCoin).then((provider) =>
      provider.buildUnsignedTx(unsignedTx),
    );
  }

  pubkeyToAddress(
    chainCoin: string,
    verifier: Verifier,
    encoding: string | undefined,
  ): Promise<string> {
    return this.getProvider(chainCoin).then((provider) =>
      provider.pubkeyToAddress(verifier, encoding),
    );
  }

  signTransaction(
    chainCoin: string,
    unsignedTx: UnsignedTx,
    signers: { [p: string]: Signer },
  ): Promise<SignedTx> {
    return this.getProvider(chainCoin).then((provider) =>
      provider.signTransaction(unsignedTx, signers),
    );
  }

  verifyAddress(
    chainCoin: string,
    address: string,
  ): Promise<AddressValidation> {
    return this.getProvider(chainCoin).then((provider) =>
      provider.verifyAddress(address),
    );
  }

  verifyTokenAddress(
    chainCoin: string,
    address: string,
  ): Promise<AddressValidation> {
    return this.getProvider(chainCoin).then((provider) =>
      provider.verifyTokenAddress(address),
    );
  }

  signMessage(
    chainCoin: string,
    message: string,
    signer: Signer,
    address?: string,
  ): Promise<string> {
    return this.getProvider(chainCoin).then((provider) =>
      provider.signMessage(message, signer, address),
    );
  }

  verifyMessage(
    chainCoin: string,
    address: string,
    message: string,
    signature: string,
  ): Promise<boolean> {
    return this.getProvider(chainCoin).then((provider) =>
      provider.verifyMessage(address, message, signature),
    );
  }
}

export { ProviderController };

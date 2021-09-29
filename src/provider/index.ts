import assert from 'assert';

import BigNumber from 'bignumber.js';

import { ChainInfo, CoinInfo } from '../types/chain';
import {
  AddressInfo,
  AddressValidation,
  BroadcastReceipt,
  ClientInfo,
  FeePricePerUnit,
  SignedTx,
  TokenInfo,
  TransactionStatus,
  UnsignedTx,
  UTXO,
} from '../types/provider';
import { Signer, Verifier } from '../types/secret';

import { AbsClient, AbsProvider } from './abc';

export class ProviderController {
  chainSelector: (chainCoin: string) => ChainInfo;

  constructor(chainSelector: (chainCoin: string) => ChainInfo) {
    this.chainSelector = chainSelector;
  }

  getClient(chainCoin: string, prefer?: string): Promise<AbsClient> {
    const chainInfo = this.chainSelector(chainCoin);
    const [client] = prefer
      ? chainInfo.clients.filter((i) => i.name == prefer)
      : chainInfo.clients; // todo switch automatically

    assert(
      client,
      `Client Not Found. chainCoin: ${chainCoin}, prefer: ${prefer}`,
    );

    /* eslint @typescript-eslint/no-var-requires: "off" */
    const clientClass = require(`./chains/${chainCoin}/${client.name}`).default;
    return Promise.resolve(new clientClass(...client.args));
  }

  getProvider(chainCoin: string): Promise<AbsProvider> {
    const chainInfo = this.chainSelector(chainCoin);

    /* eslint @typescript-eslint/no-var-requires: "off" */
    const providerClass = require(`./chains/${chainCoin}/provider`).default;

    return Promise.resolve(
      new providerClass(chainInfo, (prefer?: string) =>
        this.getClient(chainCoin, prefer),
      ),
    );
  }

  getInfo(chainCoin: string): Promise<ClientInfo> {
    return this.getClient(chainCoin).then((client) => client.getInfo());
  }

  getAddress(chainCoin: string, address: string): Promise<AddressInfo> {
    return this.getClient(chainCoin).then((client) =>
      client.getAddress(address),
    );
  }

  getBalance(
    chainCoin: string,
    address: string,
    coin: CoinInfo,
  ): Promise<BigNumber> {
    return this.getClient(chainCoin).then((client) =>
      client.getBalance(address, coin),
    );
  }

  getFeePricePerUnit(chainCoin: string): Promise<FeePricePerUnit> {
    return this.getClient(chainCoin).then((client) =>
      client.getFeePricePerUnit(),
    );
  }

  broadcastTransaction(
    chainCoin: string,
    rawTx: string,
  ): Promise<BroadcastReceipt> {
    return this.getClient(chainCoin).then((client) =>
      client.broadcastTransaction(rawTx),
    );
  }

  getTransactionStatus(
    chainCoin: string,
    txid: string,
  ): Promise<TransactionStatus> {
    return this.getClient(chainCoin).then((client) =>
      client.getTransactionStatus(txid),
    );
  }

  getTokenInfo(
    chainCoin: string,
    tokenAddresses: string[],
  ): Promise<Array<TokenInfo | undefined>> {
    return this.getClient(chainCoin).then((client) =>
      client.getTokenInfo(tokenAddresses),
    );
  }

  async batchGetAddresses(
    chainCoin: string,
    addresses: string[],
  ): Promise<Array<AddressInfo | undefined>> {
    return this.getClient(chainCoin).then((client) =>
      client.batchGetAddresses(addresses),
    );
  }

  getUTXOs(
    chainCoin: string,
    address: Array<string>,
  ): Promise<{ [address: string]: UTXO }> {
    return this.getClient(chainCoin).then((provider) =>
      provider.getUTXOs(address),
    );
  }

  async batchGetBalances(
    chainCoin: string,
    calls: ReadonlyArray<{ address: string; coin: CoinInfo }>,
  ): Promise<Array<BigNumber | undefined>> {
    return this.getClient(chainCoin).then((client) =>
      client.batchGetBalances(calls),
    );
  }

  buildUnsignedTx(
    chainCoin: string,
    unsignedTx: UnsignedTx | undefined,
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

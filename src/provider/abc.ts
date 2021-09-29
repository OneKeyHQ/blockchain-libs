import BigNumber from 'bignumber.js';

import { NotImplementedError } from '../basic/exceptions';
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

export abstract class AbsClient {
  abstract broadcastTransaction(rawTx: string): Promise<BroadcastReceipt>;

  abstract getInfo(): Promise<ClientInfo>;

  abstract getAddress(address: string): Promise<AddressInfo>;

  abstract getFeePricePerUnit(): Promise<FeePricePerUnit>;

  abstract getTransactionStatus(txid: string): Promise<TransactionStatus>;

  getBalance(address: string, coin: CoinInfo): Promise<BigNumber> {
    if (!coin?.tokenAddress) {
      return this.getAddress(address).then((address) => address.balance);
    }

    throw NotImplementedError;
  }

  batchGetAddresses(
    addresses: string[],
  ): Promise<Array<AddressInfo | undefined>> {
    return Promise.all(
      addresses.map((address) =>
        this.getAddress(address).catch((e) => {
          console.error(
            `Error in getting address, use undefined as the default value. 
            address: ${address}, error: ${e}`,
          );
          return undefined;
        }),
      ),
    );
  }

  batchGetBalances(
    calls: ReadonlyArray<{ address: string; coin: CoinInfo }>,
  ): Promise<Array<BigNumber | undefined>> {
    return Promise.all(
      calls.map(({ address, coin }) =>
        this.getBalance(address, coin).catch((e) => {
          console.error(
            `Error in getting balance, use undefined as the default value.  
             address: ${address}, coin: ${coin}, error: ${e}`,
          );
          return undefined;
        }),
      ),
    );
  }

  getTokenInfo(
    tokenAddresses: string[],
  ): Promise<Array<TokenInfo | undefined>> {
    return Promise.reject(NotImplementedError);
  }

  getUTXOs(address: Array<string>): Promise<{ [address: string]: UTXO }> {
    return Promise.reject(NotImplementedError);
  }
}

export abstract class AbsProvider {
  readonly chainInfo: ChainInfo;
  readonly clientSelector: (prefer?: string) => AbsClient;

  protected constructor(
    chainInfo: ChainInfo,
    clientSelector: (prefer?: string) => AbsClient,
  ) {
    this.chainInfo = chainInfo;
    this.clientSelector = clientSelector;
  }

  get client(): AbsClient {
    return this.clientSelector();
  }

  abstract pubkeyToAddress(
    verifier: Verifier,
    encoding: string | undefined,
  ): Promise<string>;

  abstract verifyAddress(address: string): Promise<AddressValidation>;

  abstract buildUnsignedTx(
    unsignedTx: UnsignedTx | undefined,
  ): Promise<UnsignedTx>;

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
    return Promise.reject('Not supported');
  }

  verifyMessage(
    address: string,
    message: string,
    signature: string,
  ): Promise<boolean> {
    return Promise.reject('Not supported');
  }
}

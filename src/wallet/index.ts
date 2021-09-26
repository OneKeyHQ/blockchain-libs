import { StorageLike, Wallet } from '../types';

export class WalletController {
  private readonly storage: StorageLike;

  constructor(storage: StorageLike) {
    this.storage = storage;
  }

  private async getWalletIds(): Promise<Array<number>> {
    return (await this.storage.get(['WALLET_IDS']))[0] || [];
  }

  async getWallets(): Promise<ReadonlyArray<Wallet>> {
    const walletIds: Array<number> = await this.getWalletIds();
    return await this.storage.get(walletIds.map((id) => `WALLET_${id}`));
  }

  async createWallet(): Promise<Wallet> {
    const walletIds: Array<number> = await this.getWalletIds();
    const lastId = walletIds.length > 0 ? walletIds[walletIds.length - 1] : -1;

    const id = lastId + 1;
    const wallet = {
      id,
      createdTime: Date.now(),
      modifiedTime: Date.now(),
    };

    await this.storage.set(`WALLET_${id}`, wallet);
    await this.storage.set('WALLET_IDS', [...walletIds, id]);

    return wallet;
  }
}

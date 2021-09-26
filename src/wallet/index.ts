import { StorageManager, Wallet } from '../interfaces';

class WalletManager {
  // @ts-ignore
  private readonly storageManager: StorageManager;

  constructor(storageManager: StorageManager) {
    this.storageManager = storageManager;
  }

  getAllWallets(): Promise<ReadonlyArray<Wallet>> {
    return Promise.resolve([
      { name: 'fake_wallet_1' },
      { name: 'fake_wallet_2' },
    ]);
  }
}

export { Wallet, WalletManager };

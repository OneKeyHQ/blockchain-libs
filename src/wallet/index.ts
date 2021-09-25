import { StorageManager, Wallet } from '../interfaces';

class WalletManager {
  readonly storageManager: StorageManager;

  constructor(storageManager: StorageManager) {
    this.storageManager = storageManager;
  }

  get_all_wallets(): Promise<ReadonlyArray<Wallet>> {
    return Promise.resolve([
      { name: 'fake_wallet_1' },
      { name: 'fake_wallet_2' },
    ]);
  }
}

export { Wallet, WalletManager };

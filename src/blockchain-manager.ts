import { StorageManager } from './interfaces';
import { WalletManager } from './wallet';

class BlockChainManager {
  readonly walletManager: WalletManager;

  constructor(storageManager: StorageManager) {
    this.walletManager = new WalletManager(storageManager);
  }
}

export { BlockChainManager };

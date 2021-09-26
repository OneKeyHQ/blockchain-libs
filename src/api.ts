import { ApiConfig } from './interfaces';
import { WalletManager } from './wallet';

class BlockchainApi {
  private readonly walletManager: WalletManager;

  constructor(config: ApiConfig) {
    this.walletManager = new WalletManager(config.storageManager);
  }

  getAllWallets() {
    return this.walletManager.getAllWallets();
  }
}

export { BlockchainApi };

import { ApiConfig } from './interfaces';
import { WalletManager } from './wallet';

class BlockchainApi {
  readonly walletManager: WalletManager;

  constructor(config: ApiConfig) {
    this.walletManager = new WalletManager(config.storageManager);
  }

  get_all_wallets() {
    return this.walletManager.get_all_wallets();
  }
}

export { BlockchainApi };

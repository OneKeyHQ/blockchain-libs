import { ExternalConfig } from './types/external-config';
import { WalletController } from './wallet';

class BlockchainEngine {
  private readonly wallet: WalletController;

  constructor(config: ExternalConfig) {
    this.wallet = new WalletController(config.storage);
  }

  getWallets() {
    return this.wallet.getWallets();
  }

  createWallet() {
    return this.wallet.createWallet();
  }
}

export { BlockchainEngine };

import { ExternalConfig } from './types';
import { WalletController } from './wallet';

export class BlockchainEngine {
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

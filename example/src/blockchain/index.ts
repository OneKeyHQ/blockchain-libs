import { BlockchainEngine } from '@onekeyfe/blockchain-libs';
import { Storage } from './storage';

const config = {
  storage: new Storage(),
};
const blockchain = new BlockchainEngine(config);

export default blockchain;

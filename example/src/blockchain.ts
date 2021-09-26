import { BlockchainApi } from '@onekeyhq/blockchain-libs';
import express from 'express';

const config = {
  storageManager: null, // todo
};
const blockchain = new BlockchainApi(config as any);

export default blockchain;

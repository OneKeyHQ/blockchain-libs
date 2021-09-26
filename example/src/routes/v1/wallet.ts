import express, { Router } from 'express';
import blockchain from '../../blockchain';

const getAllWallet = async (req: express.Request, resp: express.Response) => {
  resp.json(await blockchain.getWallets());
};

const createWallet = async (req: express.Request, resp: express.Response) => {
  const wallet = await blockchain.createWallet();
  resp.json(wallet);
};

const router = Router();
router.get('/', getAllWallet);
router.post('/', createWallet);

export default router;

import express, { Router } from 'express';
import blockchain from '../../blockchain';

const getAllWallet = async (req: express.Request, resp: express.Response) => {
  resp.json(await blockchain.getAllWallets());
};

const router = Router();
router.get('/', getAllWallet);

export default router;

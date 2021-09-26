import express from 'express';
import { StatusCodes } from 'http-status-codes';
import { BlockchainApi } from '@onekeyhq/blockchain-libs';

const index = (req: express.Request, resp: express.Response): void => {
  resp.status(StatusCodes.OK).send('OneKey Blockchain Libs Example Server');
};

const ping = (req: express.Request, resp: express.Response): void => {
  resp.status(StatusCodes.OK).json({
    pong: Date.now() / 1000,
  });
};

const router = express.Router();
router.get('/', index);
router.get('/ping', ping);

export default router;

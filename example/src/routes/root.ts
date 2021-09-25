import express from 'express';
import { StatusCodes } from 'http-status-codes';

const index = (req: express.Request, resp: express.Response): void => {
  resp.status(StatusCodes.OK).send('Hello OneKey Blockchain Libs');
};

const ping = (req: express.Request, resp: express.Response): void => {
  const message = req.query && req.query.message;
  resp.status(StatusCodes.OK).json({
    pong: message || '',
    timestamp: Date.now(),
  });
};

const router = express.Router();
router.get('/', index);
router.get('/ping', ping);

export default router;

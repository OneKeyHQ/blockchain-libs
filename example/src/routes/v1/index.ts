import { Router } from 'express';
import wallet from './wallet';

const router = Router();
router.use('/wallets', wallet);

export default router;

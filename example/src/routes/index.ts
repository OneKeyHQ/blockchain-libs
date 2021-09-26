import { Router } from 'express';
import root from './root';
import v1 from './v1';

const router = Router();
router.use(root);
router.use('/v1', v1);

export default router;

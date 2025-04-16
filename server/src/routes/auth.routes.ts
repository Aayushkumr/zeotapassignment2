import { Router } from 'express';
import * as authController from '../controllers/auth.controller';

const router = Router();

router.post('/generate-token', authController.generateTestToken);
router.get('/test-token', authController.generateTestToken); // Also allow GET for easy testing

export default router;
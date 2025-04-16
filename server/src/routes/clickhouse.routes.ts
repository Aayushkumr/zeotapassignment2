import { Router } from 'express';
import { verifyJwt } from '../middlewares/jwtAuth';
import * as clickhouseController from '../controllers/clickhouse.controller';

const router = Router();

// Public routes - no authentication needed
router.post('/connect', clickhouseController.connect);

// Protected routes - only accessible with valid JWT
router.get('/tables', verifyJwt, clickhouseController.getTables as any);
router.get('/schema/:tableName', verifyJwt, clickhouseController.getTableSchema as any);
router.post('/export', verifyJwt, clickhouseController.exportToFile);
router.post('/import', verifyJwt, clickhouseController.importFromFile);
router.post('/query', verifyJwt, clickhouseController.executeQuery);

// Add the new JOIN route that matches client expectations
router.post('/join', verifyJwt, clickhouseController.executeJoinQuery as any);

// You can keep the existing join route for backward compatibility
// router.post('/join', verifyJwt, clickhouseController.executeJoin);

router.post('/preview-join', verifyJwt, clickhouseController.previewJoin);

export default router;
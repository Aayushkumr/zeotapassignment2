import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as fileController from '../controllers/file.controller';
import { verifyJwt } from '../middlewares/jwtAuth';
import config from '../config';

const router = express.Router();

// Set up file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: config.upload.maxFileSize }
});

// Public endpoints - allow file uploads and downloads without authentication
router.post('/upload', upload.single('file'), fileController.uploadFile);
router.get('/download/:fileName', fileController.downloadFile);

// Protected endpoints - require JWT authentication
router.post('/schema', verifyJwt, fileController.detectSchema);
router.post('/preview', verifyJwt, fileController.previewData);
router.delete('/:fileName', verifyJwt, fileController.deleteFile);

export default router;
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import config from '../config';

// Ensure upload directory exists
fs.ensureDirSync(config.upload.tempDir);

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter to accept only supported file types
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedFileTypes = ['.csv', '.tsv', '.txt', '.dat'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedFileTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Only CSV, TSV, TXT, and DAT files are allowed.'));
  }
};

// Create the multer upload instance
const upload = multer({
  storage,
  fileFilter,
  limits: { 
    fileSize: config.upload.maxFileSize 
  }
});

export default upload;
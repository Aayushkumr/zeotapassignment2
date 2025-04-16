"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const config_1 = __importDefault(require("../config"));
// Ensure upload directory exists
fs_extra_1.default.ensureDirSync(config_1.default.upload.tempDir);
// Configure storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, config_1.default.upload.tempDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});
// File filter to accept only supported file types
const fileFilter = (req, file, cb) => {
    const allowedFileTypes = ['.csv', '.tsv', '.txt', '.dat'];
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    if (allowedFileTypes.includes(ext)) {
        cb(null, true);
    }
    else {
        cb(new Error('Unsupported file type. Only CSV, TSV, TXT, and DAT files are allowed.'));
    }
};
// Create the multer upload instance
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: config_1.default.upload.maxFileSize
    }
});
exports.default = upload;

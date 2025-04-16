"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFile = exports.downloadFile = exports.previewData = exports.detectSchema = exports.uploadFile = void 0;
const file_service_1 = __importDefault(require("../services/file.service"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../utils/logger"));
const config_1 = __importDefault(require("../config"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const logger = new logger_1.default('FileController');
const uploadsDir = path_1.default.join(__dirname, '../../uploads');
// Upload a file
const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, message: 'No file uploaded' });
            return;
        }
        const filePath = path_1.default.join(config_1.default.upload.tempDir, req.file.filename);
        res.status(200).json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                fileName: req.file.filename,
                originalName: req.file.originalname,
                filePath,
                size: req.file.size
            }
        });
    }
    catch (error) {
        logger.error('Failed to upload file', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.uploadFile = uploadFile;
// Detect schema from uploaded file
const detectSchema = async (req, res) => {
    try {
        const { filePath, delimiter } = req.body;
        if (!filePath) {
            res.status(400).json({ success: false, message: 'File path is required' });
            return;
        }
        const options = delimiter ? { delimiter } : {};
        const { columnNames, sampleData } = await file_service_1.default.detectSchema(filePath, options);
        res.status(200).json({
            success: true,
            data: {
                columnNames,
                sampleData: sampleData.slice(0, 10) // Limit preview data
            }
        });
    }
    catch (error) {
        logger.error('Failed to detect schema', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.detectSchema = detectSchema;
// Preview data from uploaded file
const previewData = async (req, res) => {
    try {
        const { filePath, delimiter, limit = 100 } = req.body;
        if (!filePath) {
            res.status(400).json({ success: false, message: 'File path is required' });
            return;
        }
        const options = {
            delimiter: delimiter || ',',
            maxRows: limit
        };
        const data = await file_service_1.default.parseFile(filePath, options);
        res.status(200).json({
            success: true,
            data: {
                records: data,
                count: data.length
            }
        });
    }
    catch (error) {
        logger.error('Failed to preview data', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.previewData = previewData;
// Download a file
const downloadFile = async (req, res) => {
    try {
        const { fileName } = req.params;
        logger.debug(`Download requested for file: ${fileName}`);
        // Security check
        if (fileName.includes('..') || fileName.includes('/')) {
            logger.error(`Invalid file name attempted: ${fileName}`);
            res.status(400).json({ success: false, message: 'Invalid file name' });
            return;
        }
        const filePath = path_1.default.join(config_1.default.upload.tempDir, fileName);
        logger.debug(`Looking for file at: ${filePath}`);
        // Check if file exists
        const fileExists = await fs_extra_1.default.pathExists(filePath);
        if (!fileExists) {
            logger.error(`File not found: ${filePath}`);
            res.status(404).json({ success: false, message: 'File not found' });
            return;
        }
        logger.debug(`File found, sending: ${filePath}`);
        // Set appropriate content type
        let contentType = 'text/plain';
        if (fileName.endsWith('.csv'))
            contentType = 'text/csv';
        else if (fileName.endsWith('.tsv'))
            contentType = 'text/tab-separated-values';
        else if (fileName.endsWith('.json'))
            contentType = 'application/json';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        // Stream the file to client
        const fileStream = fs_extra_1.default.createReadStream(filePath);
        fileStream.pipe(res);
    }
    catch (error) {
        logger.error('Download error', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.downloadFile = downloadFile;
// Delete a file
const deleteFile = async (req, res) => {
    try {
        const { fileName } = req.params;
        if (!fileName) {
            res.status(400).json({ success: false, message: 'File name is required' });
            return;
        }
        const filePath = path_1.default.join(config_1.default.upload.tempDir, fileName);
        await file_service_1.default.cleanupFile(filePath);
        res.status(200).json({
            success: true,
            message: 'File deleted successfully'
        });
    }
    catch (error) {
        logger.error('Failed to delete file', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteFile = deleteFile;

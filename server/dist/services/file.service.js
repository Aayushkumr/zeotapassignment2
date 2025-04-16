"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const fileParser_1 = __importDefault(require("../utils/fileParser"));
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../utils/logger"));
const logger = new logger_1.default('FileService');
class FileService {
    async parseFile(filePath, options = {}) {
        try {
            return await fileParser_1.default.parseFile(filePath, options);
        }
        catch (error) {
            logger.error('Failed to parse file', { filePath, error });
            throw error;
        }
    }
    async detectSchema(filePath, options = {}) {
        try {
            return await fileParser_1.default.detectSchema(filePath, options);
        }
        catch (error) {
            logger.error('Failed to detect schema', { filePath, error });
            throw error;
        }
    }
    async saveDataToFile(content, filePath, delimiter = ',') {
        if (typeof content === 'string') {
            await fs_extra_1.default.writeFile(filePath, content, 'utf8');
            logger.info(`String content successfully written to ${filePath}`);
            return;
        }
        if (!content.length) {
            throw new Error('No data to save');
        }
        try {
            // Ensure directory exists
            const dir = path_1.default.dirname(filePath);
            await fs_extra_1.default.ensureDir(dir);
            // Get column headers from first row
            const headers = Object.keys(content[0]);
            // Create CSV content
            const headerRow = headers.join(delimiter);
            const rows = content.map(row => headers.map(header => {
                const value = row[header];
                // Handle values that might contain the delimiter or newlines
                if (typeof value === 'string' && (value.includes(delimiter) || value.includes('\n'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value !== undefined && value !== null ? value : '';
            }).join(delimiter));
            // Combine headers and rows
            const csvContent = [headerRow, ...rows].join('\n');
            // Write to file
            await fs_extra_1.default.writeFile(filePath, csvContent);
            logger.info(`Data successfully written to ${filePath}`);
        }
        catch (error) {
            logger.error('Failed to save data to file', { filePath, error });
            throw error;
        }
    }
    async getUploadedFilePath(fileName) {
        return path_1.default.join(config_1.default.upload.tempDir, fileName);
    }
    async cleanupFile(filePath) {
        try {
            if (await fs_extra_1.default.pathExists(filePath)) {
                await fs_extra_1.default.unlink(filePath);
                logger.info(`Temporary file ${filePath} cleaned up`);
            }
        }
        catch (error) {
            logger.warn(`Failed to clean up file ${filePath}`, error);
            // We don't throw here as this is just cleanup
        }
    }
}
exports.default = new FileService();

import fs from 'fs-extra';
import path from 'path';
import fileParser from '../utils/fileParser';
import config from '../config';
import Logger from '../utils/logger';

const logger = new Logger('FileService');

class FileService {
  async parseFile(filePath: string, options: { delimiter?: string } = {}): Promise<any[]> {
    try {
      return await fileParser.parseFile(filePath, options);
    } catch (error) {
      logger.error('Failed to parse file', { filePath, error });
      throw error;
    }
  }

  async detectSchema(filePath: string, options: { delimiter?: string } = {}): Promise<{ columnNames: string[], sampleData: any[] }> {
    try {
      return await fileParser.detectSchema(filePath, options);
    } catch (error) {
      logger.error('Failed to detect schema', { filePath, error });
      throw error;
    }
  }

  async saveDataToFile(content: string | any[], filePath: string, delimiter: string = ','): Promise<void> {
    if (typeof content === 'string') {
      await fs.writeFile(filePath, content, 'utf8');
      logger.info(`String content successfully written to ${filePath}`);
      return;
    }

    if (!content.length) {
      throw new Error('No data to save');
    }

    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.ensureDir(dir);

      // Get column headers from first row
      const headers = Object.keys(content[0]);

      // Create CSV content
      const headerRow = headers.join(delimiter);
      const rows = content.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle values that might contain the delimiter or newlines
          if (typeof value === 'string' && (value.includes(delimiter) || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value !== undefined && value !== null ? value : '';
        }).join(delimiter)
      );

      // Combine headers and rows
      const csvContent = [headerRow, ...rows].join('\n');

      // Write to file
      await fs.writeFile(filePath, csvContent);
      logger.info(`Data successfully written to ${filePath}`);
    } catch (error) {
      logger.error('Failed to save data to file', { filePath, error });
      throw error;
    }
  }

  async getUploadedFilePath(fileName: string): Promise<string> {
    return path.join(config.upload.tempDir, fileName);
  }

  async cleanupFile(filePath: string): Promise<void> {
    try {
      if (await fs.pathExists(filePath)) {
        await fs.unlink(filePath);
        logger.info(`Temporary file ${filePath} cleaned up`);
      }
    } catch (error) {
      logger.warn(`Failed to clean up file ${filePath}`, error);
      // We don't throw here as this is just cleanup
    }
  }
}

export default new FileService();
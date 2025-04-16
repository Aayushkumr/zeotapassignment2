import { Request, Response } from 'express';
import fileService from '../services/file.service';
import path from 'path';
import Logger from '../utils/logger';
import config from '../config';
import fs from 'fs-extra';

const logger = new Logger('FileController');
const uploadsDir = path.join(__dirname, '../../uploads');

// Upload a file
export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const filePath = path.join(config.upload.tempDir, req.file.filename);
    
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
  } catch (error) {
    logger.error('Failed to upload file', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// Detect schema from uploaded file
export const detectSchema = async (req: Request, res: Response): Promise<void> => {
  try {
    const { filePath, delimiter } = req.body;
    
    if (!filePath) {
      res.status(400).json({ success: false, message: 'File path is required' });
      return;
    }

    const options = delimiter ? { delimiter } : {};
    const { columnNames, sampleData } = await fileService.detectSchema(filePath, options);
    
    res.status(200).json({ 
      success: true, 
      data: {
        columnNames,
        sampleData: sampleData.slice(0, 10) // Limit preview data
      }
    });
  } catch (error) {
    logger.error('Failed to detect schema', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// Preview data from uploaded file
export const previewData = async (req: Request, res: Response): Promise<void> => {
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
    
    const data = await fileService.parseFile(filePath, options);
    
    res.status(200).json({ 
      success: true, 
      data: {
        records: data,
        count: data.length
      }
    });
  } catch (error) {
    logger.error('Failed to preview data', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// Download a file
export const downloadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileName } = req.params;
    logger.debug(`Download requested for file: ${fileName}`);
    
    // Security check
    if (fileName.includes('..') || fileName.includes('/')) {
      logger.error(`Invalid file name attempted: ${fileName}`);
      res.status(400).json({ success: false, message: 'Invalid file name' });
      return;
    }
    
    const filePath = path.join(config.upload.tempDir, fileName);
    logger.debug(`Looking for file at: ${filePath}`);
    
    // Check if file exists
    const fileExists = await fs.pathExists(filePath);
    if (!fileExists) {
      logger.error(`File not found: ${filePath}`);
      res.status(404).json({ success: false, message: 'File not found' });
      return;
    }
    
    logger.debug(`File found, sending: ${filePath}`);
    
    // Set appropriate content type
    let contentType = 'text/plain';
    if (fileName.endsWith('.csv')) contentType = 'text/csv';
    else if (fileName.endsWith('.tsv')) contentType = 'text/tab-separated-values';
    else if (fileName.endsWith('.json')) contentType = 'application/json';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    // Stream the file to client
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    logger.error('Download error', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// Delete a file
export const deleteFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileName } = req.params;
    
    if (!fileName) {
      res.status(400).json({ success: false, message: 'File name is required' });
      return;
    }

    const filePath = path.join(config.upload.tempDir, fileName);
    await fileService.cleanupFile(filePath);
    
    res.status(200).json({ 
      success: true, 
      message: 'File deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete file', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};
import express from 'express';
import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs-extra';
import morgan from 'morgan';
import config from './config';
import Logger from './utils/logger';

// Import routes
import clickhouseRoutes from './routes/clickhouse.routes';
import fileRoutes from './routes/file.routes';
import authRoutes from './routes/auth.routes';

// Import middleware
import { authMiddleware } from './middlewares/auth.middleware';

// Initialize logger
const logger = new Logger('App');

// Create Express app
const app = express();

// Check the temp directory
logger.info(`Uploads directory: ${config.upload.tempDir}`);

// Ensure uploads directory exists
fs.ensureDirSync(config.upload.tempDir);
logger.info(`Ensuring uploads directory exists: ${config.upload.tempDir}`);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(morgan('dev'));

// Route that doesn't need authentication
app.use('/api/clickhouse/connect', clickhouseRoutes);

// Apply auth middleware to all other API routes
app.use('/api', authMiddleware);

// Protected routes
app.use('/api/file', fileRoutes);

// API Routes
app.use('/api/clickhouse', clickhouseRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/auth', authRoutes);

// Serve static files from uploads directory (with CORS enabled)
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
}, express.static(config.upload.tempDir));

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Handle 404 routes
app.use((req: Request, res: Response) => {
  logger.warn(`Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

export default app;
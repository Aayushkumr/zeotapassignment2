import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs-extra';
import config from './config';
import Logger from './utils/logger';

// Import routes
import clickhouseRoutes from './routes/clickhouse.routes';
import fileRoutes from './routes/file.routes';

// Import middlewares
import errorHandler from './middlewares/errorHandler';

// Initialize logger
const logger = new Logger('Server');

// Create Express app
const app = express();

// Ensure upload directory exists
fs.ensureDirSync(config.upload.tempDir);
logger.info(`Uploads directory created at: ${config.upload.tempDir}`);

// Middleware
app.use(cors({
    origin: 'http://localhost:5173', 
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// JWT extraction middleware - doesn't require authentication but extracts token if present
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    // Store token in request for protected routes to use
    (req as any).token = token;
  }
  next();
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes
app.use('/api/clickhouse', clickhouseRoutes);
app.use('/api/file', fileRoutes);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

// Start the server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
  logger.info(`API is available at http://localhost:${PORT}`);
});
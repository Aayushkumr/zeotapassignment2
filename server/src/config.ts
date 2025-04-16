import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',  // Changed from env to nodeEnv
  env: process.env.NODE_ENV || 'development',      // Keep for backward compatibility
  port: parseInt(process.env.PORT || '3001', 10),
  
  // Restructured to match existing code
  upload: {
    tempDir: process.env.UPLOAD_TEMP_DIR || path.join(process.cwd(), 'uploads'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10)
  },
  
  // Keep uploadDir for backward compatibility
  uploadDir: process.env.UPLOAD_TEMP_DIR || path.join(process.cwd(), 'uploads'),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'aayushkumarzeotap',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  },
  
  // ClickHouse default connection
  clickhouse: {
    host: process.env.CLICKHOUSE_HOST || 'localhost',
    port: process.env.CLICKHOUSE_PORT || '8123',
    database: process.env.CLICKHOUSE_DB || 'default',
    username: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || ''
  }
};

export default config;
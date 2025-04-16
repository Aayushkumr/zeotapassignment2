import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import Logger from '../utils/logger';

const logger = new Logger('AuthMiddleware');

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Skip auth for connect endpoint
    if (req.path === '/clickhouse/connect') {
      return next();
    }
    
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('No Authorization header or invalid format');
      res.status(401).json({ success: false, message: 'Unauthorized: Missing authentication token' });
      return;
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      logger.warn('No token provided in Authorization header');
      res.status(401).json({ success: false, message: 'Unauthorized: Missing authentication token' });
      return;
    }
    
    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Type guard to handle string vs object return from jwt.verify
    if (typeof decoded === 'string') {
      logger.error('JWT payload is a string, expected an object');
      res.status(401).json({ success: false, message: 'Invalid token format' });
      return;
    }
    
    // Attach user info to request with proper typing
    req.user = {
      username: decoded.username || decoded.sub || 'unknown',
      ...(decoded as object)
    };
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({ success: false, message: 'Unauthorized: Invalid authentication token' });
  }
};
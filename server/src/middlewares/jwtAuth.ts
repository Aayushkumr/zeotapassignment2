import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import Logger from '../utils/logger';

const logger = new Logger('JwtAuth');

// Update interface to match Express.Request.user
interface AuthRequest extends Request {
  user: {
    username: string;
    database?: string;
    [key: string]: any;
  };
}

// Remove the return type annotation or change it to include Response
export const verifyJwt = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      // Remove 'return' keyword or change function return type
      res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
      return; // Just return without value
    }
    
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Handle string vs object return
    if (typeof decoded === 'string') {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid token format' 
      });
      return; // Just return without value
    }
    
    // Cast Request to AuthRequest with proper type assignment
    (req as AuthRequest).user = {
      username: decoded.username || decoded.sub || 'unknown',
      database: decoded.database,
      ...decoded
    };
    
    next();
  } catch (error) {
    logger.error('JWT verification failed:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
    // No return statement needed
  }
};

export type { AuthRequest };
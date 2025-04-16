import { Request, Response } from 'express';
import jwtUtil from '../utils/jwt';
import Logger from '../utils/logger';

const logger = new Logger('AuthController');

export const generateTestToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, database } = req.body || {};
    
    const user = username || 'default';
    const db = database || 'default';
    
    logger.info(`Generating test token for user: ${user}, database: ${db}`);
    const token = jwtUtil.generateClickHouseToken(user, db);
    
    // Decode token for display
    const decoded = jwtUtil.verifyToken(token);
    
    res.status(200).json({
      success: true,
      token,
      decoded,
      expiresIn: decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : undefined
    });
  } catch (error: any) {
    logger.error('Failed to generate test token', error);
    res.status(500).json({ 
      success: false, 
      message: `Failed to generate token: ${error.message}` 
    });
  }
};
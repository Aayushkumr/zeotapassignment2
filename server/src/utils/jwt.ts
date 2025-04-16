import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import config from '../config';
import Logger from './logger';

const logger = new Logger('JWT');

interface TokenPayload {
  username: string;
  database?: string;
  [key: string]: any;
}

/**
 * Generate a JWT token for API authentication
 */
const generateToken = (payload: TokenPayload): string => {
  try {
    return jwt.sign(
      payload,
      config.jwt.secret as Secret,
      { expiresIn: config.jwt.expiresIn } as SignOptions
    );
  } catch (error) {
    logger.error('Failed to generate JWT token', error);
    throw error;
  }
};

/**
 * Generate a JWT token for ClickHouse authentication
 */
const generateClickHouseToken = (username: string, database: string): string => {
  try {
    const now = Math.floor(Date.now() / 1000);
    
    // Create payload
    const payload = {
      iat: now,                       // Issued at time
      exp: now + 3600,                // Expires in 1 hour
      username: username,             // CRUCIAL: This is what ClickHouse looks for
      database: database,
      sub: username                   // Standard JWT claim
    };
    
    // Generate the token with HS256 algorithm
    const token = jwt.sign(payload, config.jwt.secret, {
      algorithm: 'HS256'
    });
    
    return token;
  } catch (error) {
    logger.error('Failed to generate JWT token:', error);
    throw error;
  }
};

/**
 * Verify a JWT token
 */
const verifyToken = (token: string): any => {
  return jwt.verify(token, config.jwt.secret);
};

export default {
  generateToken,
  generateClickHouseToken,
  verifyToken
};
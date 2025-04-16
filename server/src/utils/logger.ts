import winston from 'winston';
import config from '../config';
import path from 'path';

enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

class Logger {
  private logger: winston.Logger;
  private context: string;
  
  constructor(context: string = 'App') {
    this.context = context;
    
    // Define log format
    const format = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ level, message, timestamp, context, ...meta }) => {
        return `${timestamp} [${level.toUpperCase()}] [${context || this.context}]: ${message} ${
          Object.keys(meta).length ? JSON.stringify(meta) : ''
        }`;
      })
    );

    // Define transports based on environment
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          format
        )
      })
    ];

    // Add file transport in production
    if (config.nodeEnv === 'production') {
      transports.push(
        new winston.transports.File({ 
          filename: path.join(process.cwd(), 'logs', 'error.log'), 
          level: 'error' 
        }),
        new winston.transports.File({ 
          filename: path.join(process.cwd(), 'logs', 'combined.log') 
        })
      );
    }

    // Create Winston logger
    this.logger = winston.createLogger({
      level: config.nodeEnv === 'development' ? 'debug' : 'info',
      format,
      defaultMeta: { context: this.context },
      transports
    });
  }

  debug(message: string, data?: any): void {
    this.logger.debug(message, data);
  }

  info(message: string, data?: any): void {
    this.logger.info(message, data);
  }

  warn(message: string, data?: any): void {
    this.logger.warn(message, data);
  }

  error(message: string, data?: any): void {
    this.logger.error(message, data);
  }
}

export default Logger;
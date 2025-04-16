import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: {
        username: string;
        database?: string;
        [key: string]: any;
      };
    }
  }
}

export {};
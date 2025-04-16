"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../utils/logger"));
const logger = new logger_1.default('AuthMiddleware');
const authMiddleware = (req, res, next) => {
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
        const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwt.secret);
        // Type guard to handle string vs object return from jwt.verify
        if (typeof decoded === 'string') {
            logger.error('JWT payload is a string, expected an object');
            res.status(401).json({ success: false, message: 'Invalid token format' });
            return;
        }
        // Attach user info to request with proper typing
        req.user = {
            username: decoded.username || decoded.sub || 'unknown',
            ...decoded
        };
        next();
    }
    catch (error) {
        logger.error('Authentication error:', error);
        res.status(401).json({ success: false, message: 'Unauthorized: Invalid authentication token' });
    }
};
exports.authMiddleware = authMiddleware;

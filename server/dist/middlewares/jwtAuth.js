"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyJwt = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../utils/logger"));
const logger = new logger_1.default('JwtAuth');
// Remove the return type annotation or change it to include Response
const verifyJwt = (req, res, next) => {
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
        const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwt.secret);
        // Handle string vs object return
        if (typeof decoded === 'string') {
            res.status(401).json({
                success: false,
                message: 'Invalid token format'
            });
            return; // Just return without value
        }
        // Cast Request to AuthRequest with proper type assignment
        req.user = {
            username: decoded.username || decoded.sub || 'unknown',
            database: decoded.database,
            ...decoded
        };
        next();
    }
    catch (error) {
        logger.error('JWT verification failed:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
        // No return statement needed
    }
};
exports.verifyJwt = verifyJwt;

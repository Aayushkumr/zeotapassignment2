"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("./logger"));
const logger = new logger_1.default('JWT');
/**
 * Generate a JWT token for API authentication
 */
const generateToken = (payload) => {
    try {
        return jsonwebtoken_1.default.sign(payload, config_1.default.jwt.secret, { expiresIn: config_1.default.jwt.expiresIn });
    }
    catch (error) {
        logger.error('Failed to generate JWT token', error);
        throw error;
    }
};
/**
 * Generate a JWT token for ClickHouse authentication
 */
const generateClickHouseToken = (username, database) => {
    try {
        const now = Math.floor(Date.now() / 1000);
        // Create payload
        const payload = {
            iat: now, // Issued at time
            exp: now + 3600, // Expires in 1 hour
            username: username, // CRUCIAL: This is what ClickHouse looks for
            database: database,
            sub: username // Standard JWT claim
        };
        // Generate the token with HS256 algorithm
        const token = jsonwebtoken_1.default.sign(payload, config_1.default.jwt.secret, {
            algorithm: 'HS256'
        });
        return token;
    }
    catch (error) {
        logger.error('Failed to generate JWT token:', error);
        throw error;
    }
};
/**
 * Verify a JWT token
 */
const verifyToken = (token) => {
    return jsonwebtoken_1.default.verify(token, config_1.default.jwt.secret);
};
exports.default = {
    generateToken,
    generateClickHouseToken,
    verifyToken
};

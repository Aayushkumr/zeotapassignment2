"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTestToken = void 0;
const jwt_1 = __importDefault(require("../utils/jwt"));
const logger_1 = __importDefault(require("../utils/logger"));
const logger = new logger_1.default('AuthController');
const generateTestToken = async (req, res) => {
    try {
        const { username, database } = req.body || {};
        const user = username || 'default';
        const db = database || 'default';
        logger.info(`Generating test token for user: ${user}, database: ${db}`);
        const token = jwt_1.default.generateClickHouseToken(user, db);
        // Decode token for display
        const decoded = jwt_1.default.verifyToken(token);
        res.status(200).json({
            success: true,
            token,
            decoded,
            expiresIn: decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : undefined
        });
    }
    catch (error) {
        logger.error('Failed to generate test token', error);
        res.status(500).json({
            success: false,
            message: `Failed to generate token: ${error.message}`
        });
    }
};
exports.generateTestToken = generateTestToken;

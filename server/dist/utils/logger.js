"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const config_1 = __importDefault(require("../config"));
const path_1 = __importDefault(require("path"));
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "debug";
    LogLevel["INFO"] = "info";
    LogLevel["WARN"] = "warn";
    LogLevel["ERROR"] = "error";
})(LogLevel || (LogLevel = {}));
class Logger {
    constructor(context = 'App') {
        this.context = context;
        // Define log format
        const format = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.printf(({ level, message, timestamp, context, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] [${context || this.context}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        }));
        // Define transports based on environment
        const transports = [
            new winston_1.default.transports.Console({
                format: winston_1.default.format.combine(winston_1.default.format.colorize(), format)
            })
        ];
        // Add file transport in production
        if (config_1.default.nodeEnv === 'production') {
            transports.push(new winston_1.default.transports.File({
                filename: path_1.default.join(process.cwd(), 'logs', 'error.log'),
                level: 'error'
            }), new winston_1.default.transports.File({
                filename: path_1.default.join(process.cwd(), 'logs', 'combined.log')
            }));
        }
        // Create Winston logger
        this.logger = winston_1.default.createLogger({
            level: config_1.default.nodeEnv === 'development' ? 'debug' : 'info',
            format,
            defaultMeta: { context: this.context },
            transports
        });
    }
    debug(message, data) {
        this.logger.debug(message, data);
    }
    info(message, data) {
        this.logger.info(message, data);
    }
    warn(message, data) {
        this.logger.warn(message, data);
    }
    error(message, data) {
        this.logger.error(message, data);
    }
}
exports.default = Logger;

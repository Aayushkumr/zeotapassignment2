"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    console.error(`[ERROR] ${err.message}`);
    if (err.stack) {
        console.error(err.stack);
    }
    res.status(statusCode).json({
        success: false,
        error: {
            message: err.message || 'Server Error',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
            ...(err.details && { details: err.details })
        }
    });
};
exports.default = errorHandler;

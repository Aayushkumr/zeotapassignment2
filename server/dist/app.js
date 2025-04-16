"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const morgan_1 = __importDefault(require("morgan"));
const config_1 = __importDefault(require("./config"));
const logger_1 = __importDefault(require("./utils/logger"));
// Import routes
const clickhouse_routes_1 = __importDefault(require("./routes/clickhouse.routes"));
const file_routes_1 = __importDefault(require("./routes/file.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
// Import middleware
const auth_middleware_1 = require("./middlewares/auth.middleware");
// Initialize logger
const logger = new logger_1.default('App');
// Create Express app
const app = (0, express_1.default)();
// Check the temp directory
logger.info(`Uploads directory: ${config_1.default.upload.tempDir}`);
// Ensure uploads directory exists
fs_extra_1.default.ensureDirSync(config_1.default.upload.tempDir);
logger.info(`Ensuring uploads directory exists: ${config_1.default.upload.tempDir}`);
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Request logging
app.use((0, morgan_1.default)('dev'));
// Route that doesn't need authentication
app.use('/api/clickhouse/connect', clickhouse_routes_1.default);
// Apply auth middleware to all other API routes
app.use('/api', auth_middleware_1.authMiddleware);
// Protected routes
app.use('/api/file', file_routes_1.default);
// API Routes
app.use('/api/clickhouse', clickhouse_routes_1.default);
app.use('/api/files', file_routes_1.default);
app.use('/api/auth', auth_routes_1.default);
// Serve static files from uploads directory (with CORS enabled)
app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
}, express_1.default.static(config_1.default.upload.tempDir));
// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});
// Handle 404 routes
app.use((req, res) => {
    logger.warn(`Route not found: ${req.method} ${req.url}`);
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});
exports.default = app;

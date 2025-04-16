"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const config_1 = __importDefault(require("./config"));
const logger_1 = __importDefault(require("./utils/logger"));
// Import routes
const clickhouse_routes_1 = __importDefault(require("./routes/clickhouse.routes"));
const file_routes_1 = __importDefault(require("./routes/file.routes"));
// Import middlewares
const errorHandler_1 = __importDefault(require("./middlewares/errorHandler"));
// Initialize logger
const logger = new logger_1.default('Server');
// Create Express app
const app = (0, express_1.default)();
// Ensure upload directory exists
fs_extra_1.default.ensureDirSync(config_1.default.upload.tempDir);
logger.info(`Uploads directory created at: ${config_1.default.upload.tempDir}`);
// Middleware
app.use((0, cors_1.default)({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// JWT extraction middleware - doesn't require authentication but extracts token if present
app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        // Store token in request for protected routes to use
        req.token = token;
    }
    next();
});
// Serve static files from uploads directory
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// API routes
app.use('/api/clickhouse', clickhouse_routes_1.default);
app.use('/api/file', file_routes_1.default);
// Basic health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Error handling middleware
app.use(errorHandler_1.default);
// Start the server
const PORT = config_1.default.port;
app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${config_1.default.nodeEnv} mode`);
    logger.info(`API is available at http://localhost:${PORT}`);
});

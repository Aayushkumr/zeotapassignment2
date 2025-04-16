"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@clickhouse/client");
const logger_1 = __importDefault(require("./logger"));
const logger = new logger_1.default('ClickHouseClient');
const createClickHouseClient = (options) => {
    const { host, port, database, username, password, jwtToken, useJwt = false } = options;
    // Determine protocol based on port
    const protocol = Number(port) === 8443 || Number(port) === 9440 ? 'https' : 'http';
    // Log connection attempt for debugging
    logger.debug('Creating ClickHouse client with options:', {
        host, port, protocol, database, username, useJwt
    });
    // Create client options object
    const clientOptions = {
        host: `${protocol}://${host}:${port}`,
        database,
        username,
    };
    // Use either JWT token or password (not both)
    if (useJwt && jwtToken) {
        logger.debug('Using JWT authentication');
        clientOptions.token = jwtToken;
    }
    else {
        logger.debug('Using password authentication');
        clientOptions.password = password || ''; // Ensure password is never undefined
    }
    return (0, client_1.createClient)(clientOptions);
};
const testConnection = async (client) => {
    try {
        logger.debug('Testing ClickHouse connection...');
        const result = await client.query({
            query: 'SELECT 1',
            format: 'JSONEachRow'
        });
        const data = await result.json();
        logger.debug('Connection test response:', data);
        return data.length > 0;
    }
    catch (error) {
        logger.error('Connection test failed with error:', error);
        throw error;
    }
};
exports.default = {
    createClickHouseClient,
    testConnection
};

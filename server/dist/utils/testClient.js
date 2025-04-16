"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTests = exports.testClickHouseJwtAuth = void 0;
// Create a new file: src/utils/testClient.ts
const jwt_1 = __importDefault(require("./jwt"));
const node_fetch_1 = __importDefault(require("node-fetch"));
/**
 * Test connecting to ClickHouse with JWT
 */
const testClickHouseJwtAuth = async () => {
    try {
        // Generate token for default user and database
        const token = jwt_1.default.generateClickHouseToken('default', 'default');
        console.log('Generated JWT token:', token);
        // Test direct connection to ClickHouse with token as password
        const response = await (0, node_fetch_1.default)(`http://localhost:8123/?user=default&database=default`, {
            method: 'POST',
            headers: {
                'X-ClickHouse-User': 'default',
                'X-ClickHouse-Key': token,
                'Content-Type': 'text/plain'
            },
            body: 'SELECT 1'
        });
        const text = await response.text();
        console.log('ClickHouse response:', response.status, text);
        return response.ok;
    }
    catch (error) {
        console.error('Test failed:', error);
        return false;
    }
};
exports.testClickHouseJwtAuth = testClickHouseJwtAuth;
// Export a function to run the test
const runTests = async () => {
    console.log('Testing JWT authentication with ClickHouse...');
    const success = await (0, exports.testClickHouseJwtAuth)();
    console.log('JWT test result:', success ? 'SUCCESS' : 'FAILED');
};
exports.runTests = runTests;

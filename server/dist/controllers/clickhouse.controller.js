"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.previewJoin = exports.executeJoin = exports.executeQuery = exports.exportData = exports.executeJoinQuery = exports.importFromFile = exports.exportToFile = exports.getTableSchema = exports.getTables = exports.connect = void 0;
const clickhouse_service_1 = __importDefault(require("../services/clickhouse.service"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../utils/logger"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const config_1 = __importDefault(require("../config"));
const jwt_1 = __importDefault(require("../utils/jwt"));
const logger = new logger_1.default('ClickHouseController');
// Add this helper function before using column names
const escapeColumnName = (name) => {
    // Check if column name contains special characters or keywords
    const needsEscaping = /[^a-zA-Z0-9_]/.test(name);
    return needsEscaping ? `\`${name}\`` : name;
};
// Add this function near the top of your file
function sanitizeColumnName(name) {
    // Replace spaces and special characters with underscores
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
}
// Helper function to check if a table exists before attempting to query it
async function tableExists(tableName) {
    try {
        const query = `EXISTS TABLE ${tableName}`;
        const result = await clickhouse_service_1.default.executeQuery(query);
        return result[0]?.result === 1;
    }
    catch (error) {
        logger.error(`Error checking if table exists: ${tableName}`, error);
        return false;
    }
}
// Connect to ClickHouse
const connect = async (req, res) => {
    try {
        const { host, port, database, username } = req.body;
        // Always use 'clickhouse' password for testing
        const password = 'clickhouse';
        logger.debug('Connection attempt with fixed password', {
            host, port, database, username
        });
        try {
            // Connect using the hardcoded password
            await clickhouse_service_1.default.connect({
                host,
                port,
                database,
                username,
                password
            });
            // Set auth token in response
            const token = jwt_1.default.generateToken({
                username,
                host,
                port,
                database
            });
            // Return success with token
            res.status(200).json({
                success: true,
                message: 'Connected to ClickHouse successfully',
                token: token
            });
        }
        catch (connError) {
            logger.error('Connection failed:', connError);
            res.status(500).json({
                success: false,
                message: `Connection failed: ${connError.message}`
            });
        }
    }
    catch (error) {
        logger.error('Error in connect controller:', error);
        res.status(500).json({
            success: false,
            message: `Error: ${error.message}`
        });
    }
};
exports.connect = connect;
// Get list of tables
const getTables = async (req, res) => {
    try {
        const tables = await clickhouse_service_1.default.getTables();
        res.status(200).json({ success: true, data: tables }); // Change 'tables' to 'data'
    }
    catch (error) {
        logger.error('Failed to get tables', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getTables = getTables;
// Get table schema
const getTableSchema = async (req, res) => {
    try {
        const { tableName } = req.params;
        logger.debug(`Fetching schema for table: ${tableName}`);
        // Check if table exists
        const exists = await tableExists(tableName);
        if (!exists) {
            res.status(404).json({
                success: false,
                message: `Table '${tableName}' does not exist`
            });
            return;
        }
        // Execute a DESCRIBE query to get the actual schema
        const describeQuery = `DESCRIBE TABLE ${tableName}`;
        const schema = await clickhouse_service_1.default.executeQuery(describeQuery);
        // Log the raw schema for debugging
        logger.debug(`Raw schema: ${JSON.stringify(schema)}`);
        // Process the schema into the expected format
        const columns = schema.map((col) => {
            return {
                name: col.name,
                type: col.type
            };
        });
        // Log the processed schema
        logger.debug(`Processed schema: ${JSON.stringify(columns)}`);
        // Return columns directly in the expected format
        res.status(200).json({
            success: true,
            columns: columns // Put columns directly at top level for client compatibility
        });
    }
    catch (error) {
        logger.error('Failed to get table schema', error);
        res.status(500).json({
            success: false,
            message: `Failed to get table schema: ${error.message}`
        });
    }
};
exports.getTableSchema = getTableSchema;
// Export data from ClickHouse to flat file
const exportToFile = async (req, res) => {
    try {
        const { tableName, columns = [], format = 'CSV', delimiter = ',', limit, includeHeaders = true } = req.body;
        // Get row count for reporting
        const countQuery = `SELECT COUNT(*) as count FROM ${tableName}`;
        const countResult = await clickhouse_service_1.default.executeQuery(countQuery);
        const recordCount = countResult[0]?.count || 0;
        logger.debug(`Found ${recordCount} records to export`);
        // Export the data
        const result = await clickhouse_service_1.default.exportData(tableName, format, { columns, delimiter, limit, includeHeaders });
        // Ensure upload directory exists
        await fs_extra_1.default.ensureDir(config_1.default.upload.tempDir);
        // Save content to a file
        const filePath = path_1.default.join(config_1.default.upload.tempDir, result.filename);
        logger.debug(`Saving export to: ${filePath}`);
        // Log the first part of the content to debug format issues
        logger.debug(`Content sample: ${result.content.substring(0, 100)}`);
        // Ensure the directory exists
        await fs_extra_1.default.ensureDir(config_1.default.upload.tempDir);
        // Write the file with utf8 encoding
        await fs_extra_1.default.writeFile(filePath, result.content, 'utf8');
        // Check if file exists after writing
        const fileExists = await fs_extra_1.default.pathExists(filePath);
        logger.debug(`File saved and exists: ${fileExists}, path: ${filePath}`);
        // List files in directory to confirm
        const files = await fs_extra_1.default.readdir(config_1.default.upload.tempDir);
        logger.debug(`Files in directory: ${files.join(', ')}`);
        logger.debug(`File saved successfully, size: ${result.content.length} bytes`);
        // Return success response
        res.status(200).json({
            success: true,
            data: {
                fileName: result.filename,
                contentType: result.contentType,
                recordCount
            }
        });
    }
    catch (error) {
        logger.error('Export failed', error);
        res.status(500).json({
            success: false,
            message: `Export failed: ${error.message}`
        });
    }
};
exports.exportToFile = exportToFile;
// Import data from flat file to ClickHouse
const importFromFile = async (req, res) => {
    try {
        const { tableName, columns, options } = req.body;
        // Log debugging information
        logger.debug('Import request received:', {
            tableName,
            columnsCount: columns?.length
        });
        if (!tableName || !columns || !columns.length) {
            logger.error('Missing required import parameters');
            res.status(400).json({
                success: false,
                message: 'Missing required parameters: tableName or columns'
            });
            return;
        }
        // Create mapping between original and sanitized column names
        // This is crucial for properly accessing data later
        const columnMap = new Map();
        // IMPORTANT: Sanitize column names and validate types
        const validatedColumns = columns.map((col) => {
            const sanitizedName = sanitizeColumnName(col.name);
            columnMap.set(col.name, sanitizedName);
            return {
                originalName: col.name, // Store original name 
                name: sanitizedName, // Use sanitized name
                type: col.type || 'String' // Default to String if undefined
            };
        });
        try {
            // Use the method instead of property
            if (!clickhouse_service_1.default.isConnected()) {
                // Try to reconnect using stored credentials from request user
                if (req.user) {
                    const { host, port, database, username } = req.user;
                    await clickhouse_service_1.default.connect({
                        host: host,
                        port: port,
                        database: database || 'default',
                        username: username,
                        password: 'clickhouse'
                    });
                }
                else {
                    throw new Error('Not connected to ClickHouse and no connection info available');
                }
            }
            // Now use sanitized names for table creation
            const columnDefs = validatedColumns.map((col) => `${col.name} ${col.type}`).join(', ');
            if (options?.createTable) {
                const createTableQuery = `
          CREATE TABLE IF NOT EXISTS ${tableName} (
            ${columnDefs}
          ) ENGINE = MergeTree()
          ORDER BY tuple()
        `;
                logger.debug('Creating table with query:', createTableQuery);
                await clickhouse_service_1.default.executeQuery(createTableQuery);
                logger.debug('Table created successfully');
            }
            // Get data from request and transform to use sanitized column names
            const data = options.data || [];
            if (!data.length) {
                logger.warn('No data provided for import');
                res.status(200).json({
                    success: true,
                    message: 'Import completed successfully (no data)',
                    rowsImported: 0
                });
                return;
            }
            // Transform the data to use sanitized column names
            const sanitizedData = data.map((row) => {
                const newRow = {};
                // Use only the columns we care about with their sanitized names
                columns.forEach((col) => {
                    const originalName = col.originalName || col.name;
                    const sanitizedName = col.name;
                    // Make sure values are properly stringified for ClickHouse
                    const value = row[originalName];
                    newRow[sanitizedName] = value === null || value === undefined ? null : String(value);
                });
                return newRow;
            });
            // Log the first row of sanitized data for debugging
            logger.debug('First row of sanitized data:', sanitizedData.length > 0 ? JSON.stringify(sanitizedData[0]) : 'No data');
            // Process in batches using sanitized column names and data
            const batchSize = 1000;
            let importedCount = 0;
            for (let i = 0; i < sanitizedData.length; i += batchSize) {
                const batch = sanitizedData.slice(i, i + batchSize);
                await clickhouse_service_1.default.insertData(tableName, batch, validatedColumns);
                importedCount += batch.length;
            }
            logger.info(`Successfully imported ${importedCount} rows into table ${tableName}`);
            res.status(200).json({
                success: true,
                message: `Import completed successfully`,
                rowsImported: importedCount
            });
        }
        catch (importError) {
            logger.error('Import failed:', importError);
            res.status(500).json({
                success: false,
                message: `Import failed: ${importError.message}`
            });
        }
    }
    catch (error) {
        logger.error('Error in import controller:', error);
        res.status(500).json({
            success: false,
            message: `Error: ${error.message}`
        });
    }
};
exports.importFromFile = importFromFile;
// Execute a JOIN query and export the results to a file
const executeJoinQuery = async (req, res) => {
    try {
        const { tables, columns, joinConditions, limit = -1, outputFormat = 'CSV', delimiter = ',' } = req.body;
        if (!tables || tables.length < 2) {
            res.status(400).json({
                success: false,
                message: 'Two tables are required for join'
            });
            return;
        }
        if (!joinConditions || joinConditions.length === 0) {
            res.status(400).json({
                success: false,
                message: 'At least one join condition is required'
            });
            return;
        }
        // Build the SELECT clause
        const selectClause = columns.length > 0 ? columns.join(', ') : '*';
        // Build JOIN query
        let query = `SELECT ${selectClause} FROM ${tables[0]}`;
        // Add JOIN clauses for each condition - Fixed 'jc' type
        joinConditions.forEach((jc) => {
            const joinType = jc.joinType || 'INNER';
            query += ` ${joinType} JOIN ${jc.rightTable} ON ${jc.leftTable}.${jc.leftColumn} = ${jc.rightTable}.${jc.rightColumn}`;
        });
        // Add limit if provided
        if (limit && limit > 0) {
            query += ` LIMIT ${limit}`;
        }
        logger.debug(`Executing join query: ${query}`);
        const result = await clickhouse_service_1.default.executeQuery(query);
        // For preview, return JSON data directly - Fixed return type issue
        if (limit > 0 && limit <= 100) {
            res.status(200).json({
                success: true,
                data: result
            });
            return; // Add return statement here instead of return res.status
        }
        // For full export, save to file
        const timestamp = new Date().getTime();
        const filename = `join_${tables.join('_')}_${timestamp}.${outputFormat.toLowerCase()}`;
        const filePath = path_1.default.join(config_1.default.upload.tempDir, filename);
        // Format data according to requested format
        let content = '';
        // Format the data based on the requested output format
        if (outputFormat.toLowerCase() === 'csv') {
            // Add headers
            if (columns.length > 0) {
                // Extract column names without table prefix for header - Fixed 'col' type
                const headerColumns = columns.map((col) => col.includes('.') ? col.split('.')[1] : col);
                content += headerColumns.join(delimiter) + '\n';
            }
            // Add data rows - Fixed 'col' type
            result.forEach((row) => {
                const values = columns.map((col) => {
                    // Get column name with or without table prefix
                    const colName = col.includes('.') ? col.split('.')[1] : col;
                    const value = row[colName];
                    return value === null || value === undefined ? '' : String(value);
                });
                content += values.join(delimiter) + '\n';
            });
        }
        else {
            // Default to JSON
            content = JSON.stringify(result, null, 2);
        }
        // Ensure directory exists
        await fs_extra_1.default.ensureDir(config_1.default.upload.tempDir);
        // Write to file
        await fs_extra_1.default.writeFile(filePath, content, 'utf8');
        res.status(200).json({
            success: true,
            filePath: filename,
            rowCount: result.length
        });
    }
    catch (error) {
        logger.error('Join operation failed', error);
        res.status(500).json({
            success: false,
            message: `Join export error: ${error.message}`,
            error: error.message
        });
    }
};
exports.executeJoinQuery = executeJoinQuery;
// Direct data export for download
const exportData = async (req, res) => {
    try {
        const { tableName, format, columns, delimiter, limit, includeHeaders, whereClause } = req.body;
        const result = await clickhouse_service_1.default.exportData(tableName, format, { columns, delimiter, limit, includeHeaders, whereClause });
        // Set the correct content type
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        // Send the raw content
        res.send(result.content);
    }
    catch (error) {
        logger.error('Export failed', error);
        res.status(500).json({
            success: false,
            message: `Export failed: ${error.message}`
        });
    }
};
exports.exportData = exportData;
// Execute a query
const executeQuery = async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) {
            res.status(400).json({ success: false, message: 'Query is required' });
            return;
        }
        // Execute the query
        const data = await clickhouse_service_1.default.executeQuery(query);
        // Log what we're sending back
        logger.debug(`Query returned ${Array.isArray(data) ? data.length : 'non-array'} results`);
        res.status(200).json({
            success: true,
            data: data // Return the raw data array
        });
    }
    catch (error) {
        logger.error('Query execution failed', error);
        res.status(500).json({
            success: false,
            message: `Query execution failed: ${error.message}`
        });
    }
};
exports.executeQuery = executeQuery;
// Execute a JOIN operation and export the results
const executeJoin = async (req, res) => {
    try {
        const { table1, table2, joinColumns, selectColumns, outputFormat = 'CSV', limit } = req.body;
        if (!table1 || !table2) {
            res.status(400).json({ success: false, message: 'Two tables are required for join' });
            return;
        }
        if (!joinColumns || !joinColumns.table1Column || !joinColumns.table2Column) {
            res.status(400).json({ success: false, message: 'Join columns must be specified' });
            return;
        }
        // Execute the join
        const result = await clickhouse_service_1.default.executeJoinQuery(table1, table2, joinColumns, selectColumns || { table1Columns: [], table2Columns: [] }, outputFormat, { limit });
        // Save to file
        const filePath = path_1.default.join(config_1.default.upload.tempDir, result.filename);
        await fs_extra_1.default.writeFile(filePath, result.content);
        res.status(200).json({
            success: true,
            data: {
                fileName: result.filename,
                contentType: result.contentType
            }
        });
    }
    catch (error) {
        logger.error('Join operation failed', error);
        res.status(500).json({
            success: false,
            message: `Join export error: ${error.message}`
        });
    }
};
exports.executeJoin = executeJoin;
// Preview a JOIN operation
const previewJoin = async (req, res) => {
    try {
        const { table1, table2, joinColumns, selectColumns, limit = 100 } = req.body;
        if (!table1 || !table2) {
            res.status(400).json({ success: false, message: 'Two tables are required for join preview' });
            return;
        }
        if (!joinColumns || !joinColumns.table1Column || !joinColumns.table2Column) {
            res.status(400).json({ success: false, message: 'Join columns must be specified' });
            return;
        }
        // Use JSONEachRow format for preview to get structured data
        const result = await clickhouse_service_1.default.executeJoinQuery(table1, table2, joinColumns, selectColumns || { table1Columns: [], table2Columns: [] }, 'JSONEachRow', { limit });
        // Parse JSON data
        const data = JSON.parse('[' + result.content.replace(/\n/g, ',').replace(/,\s*$/, '') + ']');
        res.status(200).json({
            success: true,
            data
        });
    }
    catch (error) {
        logger.error('Join preview failed', error);
        res.status(500).json({
            success: false,
            message: `Error previewing join: ${error.message}`
        });
    }
};
exports.previewJoin = previewJoin;

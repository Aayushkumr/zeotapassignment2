import { createClient, ClickHouseClient } from '@clickhouse/client';
import Logger from '../utils/logger';
import fs from 'fs-extra';
import path from 'path';
import config from '../config';
import jwtUtil from '../utils/jwt'; // Import jwtUtil
import type { InsertParams } from '@clickhouse/client'; // Import InsertParams

// Fix the DataFormat import
type DataFormat = 'JSON' | 'CSV' | 'CSVWithNames' | 'TSV' | 'TSVWithNames' | 'XMLEachRow' | 'JSONEachRow';

const logger = new Logger('ClickHouseService');

class ClickHouseService {
  private client: ClickHouseClient | null = null;
  // Change the name of this property to avoid the duplicate identifier
  private connectionActive = false;
  private connectionOptions: any = null;
  
  constructor() {
    logger.debug('ClickHouse service initialized');
  }
  
  /**
   * Connect to ClickHouse with provided credentials
   */
  async connect(options: {
    host: string;
    port: string | number;
    database: string;
    username: string;
    password?: string;
    jwtToken?: string;
  }): Promise<boolean> {
    try {
      logger.info(`Connecting to ClickHouse at ${options.host}:${options.port}`);
      
      // Store connection options
      this.connectionOptions = options;
      
      // Create basic connection config
      const connectionConfig = {
        host: `http://${options.host}:${options.port}`,
        database: options.database,
        username: options.username,
        // Use hardcoded password for testing
        password: options.password || 'clickhouse'
      };
      
      logger.debug('Creating ClickHouse client');
      this.client = createClient(connectionConfig);
      
      logger.debug('Testing connection with ping');
      await this.client.ping();
      logger.info('Successfully connected to ClickHouse');
      
      this.connectionActive = true;
      return true;
    } catch (error) {
      logger.error('ClickHouse connection failed', error);
      this.connectionActive = false;
      throw error;
    }
  }
  
  /**
   * Ensure we have a valid connection before executing operations
   */
  private async ensureValidConnection(): Promise<void> {
    if (!this.connectionActive || !this.client) {
      throw new Error('Not connected to ClickHouse. Please connect first.');
    }
    
    // If using JWT, check and refresh if needed
    if (this.connectionOptions?.jwtToken) {
      await this.refreshTokenIfNeeded();
    }
  }

  /**
   * Validates a JWT token and extracts its claims
   */
  private validateJwtToken(token: string): { 
    isValid: boolean; 
    claims?: { username: string; database: string; exp: number } 
  } {
    try {
      // Attempt to verify the token
      const decoded = jwtUtil.verifyToken(token);
      
      // Check required claims
      if (!decoded.username) {
        logger.warn('JWT token missing username claim');
        return { isValid: false };
      }
      
      return { 
        isValid: true, 
        claims: {
          username: decoded.username,
          database: decoded.database || 'default',
          exp: decoded.exp || 0
        } 
      };
    } catch (error) {
      logger.error('JWT validation failed:', error);
      return { isValid: false };
    }
  }

  /**
   * Refresh JWT token if it's close to expiration
   */
  private async refreshTokenIfNeeded(): Promise<void> {
    if (!this.connectionOptions?.jwtToken) return;
    
    const { isValid, claims } = this.validateJwtToken(this.connectionOptions.jwtToken);
    
    if (!isValid) {
      logger.warn('Current JWT token is invalid, generating new token');
      this.connectionOptions.jwtToken = jwtUtil.generateClickHouseToken(
        this.connectionOptions.username,
        this.connectionOptions.database
      );
      
      // Reconnect with the new token
      await this.reconnectWithNewToken();
      return;
    }
    
    // Check if token will expire in the next 5 minutes
    const now = Math.floor(Date.now() / 1000);
    if (claims!.exp - now < 300) {
      logger.info('JWT token expiring soon, refreshing');
      this.connectionOptions.jwtToken = jwtUtil.generateClickHouseToken(
        claims!.username,
        claims!.database
      );
      
      // Reconnect with the new token
      await this.reconnectWithNewToken();
    }
  }

  /**
   * Reconnect to ClickHouse with a new token
   */
  private async reconnectWithNewToken(): Promise<void> {
    try {
      // Create a new client with the refreshed token
      this.client = createClient({
        host: `http://${this.connectionOptions.host}:${this.connectionOptions.port}`,
        database: this.connectionOptions.database,
        username: this.connectionOptions.username,
        password: this.connectionOptions.jwtToken
      });
      
      // Test the new connection
      await this.client.ping();
      logger.info('Successfully reconnected with new JWT token');
    } catch (error) {
      logger.error('Failed to reconnect with new token:', error);
      this.connectionActive = false;
      throw new Error('Token refresh failed: Could not reconnect to ClickHouse');
    }
  }

  /**
   * Get list of tables in the connected database
   */
  async getTables(): Promise<string[]> {
    await this.ensureValidConnection();
    
    try {
      logger.debug('Fetching tables from ClickHouse');
      
      const query = 'SHOW TABLES';
      const result = await this.executeQuery(query);
      
      // Extract table names
      const tables = result.map((row: any) => row.name);
      logger.debug(`Found ${tables.length} tables`);
      
      return tables;
    } catch (error) {
      logger.error('Failed to fetch tables', error);
      throw error;
    }
  }

  /**
   * Execute a SQL query and return results
   */
  async executeQuery(query: string): Promise<any[]> {
    await this.ensureValidConnection();
    
    try {
      logger.debug(`Executing query: ${query}`);
      
      const result = await this.client!.query({
        query,
        format: 'JSONEachRow'
      });
      
      const rows = await result.json();
      logger.debug(`Query returned ${rows.length} rows`);
      
      return rows;
    } catch (error) {
      logger.error(`Query execution failed: ${error}`);
      throw error;
    }
  }

  /**
   * Export data from a table to a specific format
   */
  async exportData(
    tableName: string,
    format: string = 'CSV',
    options: {
      columns?: string[];
      delimiter?: string;
      limit?: number;
      includeHeaders?: boolean;
      whereClause?: string;
    } = {}
  ): Promise<{ content: string; contentType: string; filename: string }> {
    await this.ensureValidConnection();
    
    try {
      logger.debug(`Exporting data from table ${tableName} to ${format}`);
      
      // Build the query
      const columnList = options.columns && options.columns.length > 0
        ? options.columns.join(', ')
        : '*';
      
      let query;
      if (options.whereClause) {
        // If whereClause is provided, it's a custom query/join
        if (options.whereClause.trim().toUpperCase().startsWith('JOIN ')) {
          query = `SELECT ${columnList} FROM ${tableName} ${options.whereClause}`;
        } else {
          query = `SELECT ${columnList} FROM ${tableName} WHERE ${options.whereClause}`;
        }
      } else {
        query = `SELECT ${columnList} FROM ${tableName}`;
      }
      
      // Add limit if provided
      if (options.limit && options.limit > 0) {
        query += ` LIMIT ${options.limit}`;
      }
      
      // Determine ClickHouse format
      let clickhouseFormat = this.getClickHouseFormat(format, options.includeHeaders ?? true);
      
      // Determine content type
      const contentType = this.getContentType(format);
      
      // Execute query
      logger.debug(`Executing export query: ${query} with format ${clickhouseFormat}`);
      
      const result = await this.client!.query({
        query,
        format: clickhouseFormat as any
      });
      
      // Get the content as text
      const content = await result.text();
      logger.debug(`Exported ${content.length} bytes of data`);
      
      // Generate a filename
      const timestamp = new Date().getTime();
      const filename = `${tableName}_export_${timestamp}.${format.toLowerCase()}`;
      
      return {
        content,
        contentType,
        filename
      };
    } catch (error) {
      logger.error('Export failed', error);
      throw error;
    }
  }

  /**
   * Import data from a file into a ClickHouse table
   */
  async importFromFile(
    filePath: string,
    tableName: string,
    columns: Array<{name: string, type: string}>,
    createTable: boolean = false
  ): Promise<any> {
    await this.ensureValidConnection();
    
    try {
      logger.debug(`Importing data from ${filePath} to table ${tableName}`);
      
      // Check if file exists
      if (!await fs.pathExists(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      // Create table if requested
      if (createTable) {
        logger.debug(`Creating table ${tableName}`);
        
        // Build column definitions
        const columnDefs = columns.map(col => `${col.name} ${col.type}`).join(', ');
        
        // Create the table
        const createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefs}) ENGINE = MergeTree() ORDER BY tuple()`;
        
        logger.debug(`Executing CREATE TABLE query: ${createTableQuery}`);
        await this.executeQuery(createTableQuery);
      }
      
      // Detect file format and prepare data
      const fileExt = path.extname(filePath).toLowerCase().substring(1);
      const format = fileExt === 'csv' ? 'CSVWithNames' : 
                    fileExt === 'json' ? 'JSONEachRow' : 'CSVWithNames';
      
      // Stream the file for best performance
      const stream = fs.createReadStream(filePath);
      
      // Insert the data
      logger.debug(`Inserting data into table ${tableName} with format ${format}`);
      
      const columnNames = columns.map(col => col.name); // Array of column names instead of comma-separated string
      
      // Use the insert method
      await this.client!.insert({
        table: tableName,
        values: stream,
        format: format as any,
        columns: columnNames.length > 0 ? (columnNames as [string, ...string[]]) : undefined
      });
      
      // Count the imported records
      const countResult = await this.executeQuery(`SELECT COUNT(*) as count FROM ${tableName}`);
      const recordCount = countResult[0]?.count || 0;
      
      return {
        tableName,
        recordCount
      };
    } catch (error) {
      logger.error('Import failed', error);
      throw error;
    }
  }

  /**
   * Execute a JOIN query between two tables
   */
  async executeJoinQuery(
    table1: string,
    table2: string,
    joinColumns: { table1Column: string; table2Column: string },
    selectColumns: { table1Columns: string[]; table2Columns: string[] },
    outputFormat: string = 'CSV',
    options: { limit?: number } = {}
  ): Promise<{ content: string; contentType: string; filename: string }> {
    await this.ensureValidConnection();
    
    try {
      // Build column selections
      const table1Cols = selectColumns.table1Columns.map(col => `${table1}.${col} as ${col}`);
      const table2Cols = selectColumns.table2Columns.map(col => `${table2}.${col} as ${table2}_${col}`);
      const allColumns = [...table1Cols, ...table2Cols];
      
      if (allColumns.length === 0) {
        throw new Error('No columns selected for join');
      }
      
      // Build the join query
      const query = `SELECT ${allColumns.join(', ')} FROM ${table1} JOIN ${table2} ON ${table1}.${joinColumns.table1Column} = ${table2}.${joinColumns.table2Column}`;
      
      // Add limit if specified
      const limitClause = options.limit ? ` LIMIT ${options.limit}` : '';
      const fullQuery = query + limitClause;
      
      logger.debug(`Executing join query: ${fullQuery}`);
      
      // Use the right format for output
      const clickhouseFormat = this.getClickHouseFormat(outputFormat);
      const contentType = this.getContentType(outputFormat);
      
      // Execute the query
      const result = await this.client!.query({
        query: fullQuery,
        format: clickhouseFormat as any
      });
      
      // Get content
      const content = await result.text();
      
      // Generate a filename
      const timestamp = new Date().getTime();
      const filename = `${table1}_${table2}_join_${timestamp}.${outputFormat.toLowerCase()}`;
      
      return {
        content,
        contentType,
        filename
      };
    } catch (error) {
      logger.error('Join query execution failed', error);
      throw error;
    }
  }

  /**
   * Converts user-friendly format name to ClickHouse format type
   */
  private getClickHouseFormat(format: string, includeHeaders = true): string {
    switch (format.toUpperCase()) {
      case 'CSV':
        return includeHeaders ? 'CSVWithNames' : 'CSV';
      case 'TSV':
        return includeHeaders ? 'TSVWithNames' : 'TSV';
      case 'JSON':
        return 'JSON';
      case 'JSONROW':
      case 'JSONEACHROW':
        return 'JSONEachRow';
      case 'XML':
        return 'XML';
      default:
        return includeHeaders ? 'CSVWithNames' : 'CSV';
    }
  }

  /**
   * Determines HTTP Content-Type based on format
   */
  private getContentType(format: string): string {
    switch (format.toUpperCase()) {
      case 'CSV':
        return 'text/csv';
      case 'TSV':
        return 'text/tab-separated-values';
      case 'JSON':
      case 'JSONROW':
      case 'JSONEACHROW':
        return 'application/json';
      case 'XML':
        return 'application/xml';
      default:
        return 'text/plain';
    }
  }

  /**
   * Insert data into a ClickHouse table
   */
  async insertData(tableName: string, data: any[], columns: Array<{name: string; type: string; originalName?: string;}>): Promise<number> {
    if (!this.client || !this.connectionActive) {
      throw new Error('Not connected to ClickHouse');
    }
    
    try {
      if (!data.length) {
        return 0;
      }
      
      // Extract column names for the insert query - use sanitized names
      const columnNames = columns.map(col => col.name);
      
      logger.debug(`Inserting data into table ${tableName} with columns: ${columnNames.join(', ')}`);
      
      // IMPORTANT: When using JSONEachRow format, we need to send full objects, not arrays
      // Keep the original data structure with named properties which is what ClickHouse expects
      
      // Execute the insert with proper formatting
      await this.client.insert({
        table: tableName,
        // Send the original data objects, don't convert to arrays
        values: data,
        format: 'JSONEachRow',
        // Don't specify columns parameter when sending full objects
        // This lets ClickHouse match columns by name
      });
      
      return data.length;
    } catch (error: any) {
      logger.error(`Error inserting data into ${tableName}:`, error);
      
      // Enhanced error logging
      if (error.message) {
        logger.error(`Error details: ${error.message}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.client !== null && this.connectionActive;
  }
}

export default new ClickHouseService();
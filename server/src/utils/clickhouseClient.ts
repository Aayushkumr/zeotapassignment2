import { createClient, ClickHouseClient } from '@clickhouse/client';
import Logger from './logger';
import jwtUtil from './jwt';

const logger = new Logger('ClickHouseClient');

interface ClickHouseConnectionOptions {
  host: string;
  port: string | number;
  database: string;
  username: string;
  password?: string;
  jwtToken?: string;
  useJwt?: boolean;
}

const createClickHouseClient = (options: ClickHouseConnectionOptions): ClickHouseClient => {
  const { host, port, database, username, password, jwtToken, useJwt = false } = options;
  
  // Determine protocol based on port
  const protocol = Number(port) === 8443 || Number(port) === 9440 ? 'https' : 'http';
  
  // Log connection attempt for debugging
  logger.debug('Creating ClickHouse client with options:', {
    host, port, protocol, database, username, useJwt
  });
  
  // Create client options object
  const clientOptions: any = {
    host: `${protocol}://${host}:${port}`,
    database,
    username,
  };

  // Use either JWT token or password (not both)
  if (useJwt && jwtToken) {
    logger.debug('Using JWT authentication');
    clientOptions.token = jwtToken;
  } else {
    logger.debug('Using password authentication');
    clientOptions.password = password || ''; // Ensure password is never undefined
  }

  return createClient(clientOptions);
};

const testConnection = async (client: ClickHouseClient): Promise<boolean> => {
  try {
    logger.debug('Testing ClickHouse connection...');
    const result = await client.query({
      query: 'SELECT 1',
      format: 'JSONEachRow'
    });
    
    const data = await result.json();
    logger.debug('Connection test response:', data);
    return data.length > 0;
  } catch (error) {
    logger.error('Connection test failed with error:', error);
    throw error;
  }
};

export default {
  createClickHouseClient,
  testConnection
};
// Create a new file: src/utils/testClient.ts
import jwtUtil from './jwt';
import config from '../config';
import fetch from 'node-fetch';

/**
 * Test connecting to ClickHouse with JWT
 */
export const testClickHouseJwtAuth = async (): Promise<boolean> => {
  try {
    // Generate token for default user and database
    const token = jwtUtil.generateClickHouseToken('default', 'default');
    console.log('Generated JWT token:', token);
    
    // Test direct connection to ClickHouse with token as password
    const response = await fetch(`http://localhost:8123/?user=default&database=default`, {
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
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
};

// Export a function to run the test
export const runTests = async (): Promise<void> => {
  console.log('Testing JWT authentication with ClickHouse...');
  const success = await testClickHouseJwtAuth();
  console.log('JWT test result:', success ? 'SUCCESS' : 'FAILED');
};
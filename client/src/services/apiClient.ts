/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE_URL = 'http://localhost:3001/api';

// Create axios instance with base URL
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add this utility function to check token expiration:

/**
 * Parse JWT token and check if it's valid or expired
 */
export const checkTokenStatus = (token: string): { 
  isValid: boolean; 
  isExpired: boolean; 
  expiresIn?: number;
  claims?: any;
} => {
  try {
    // Get the payload part (second part of the token)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { isValid: false, isExpired: true };
    }
    
    // Decode the payload
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    
    // Check expiration
    const expiresIn = payload.exp ? payload.exp - now : undefined;
    const isExpired = payload.exp ? payload.exp <= now : true;
    
    return { 
      isValid: true,
      isExpired,
      expiresIn,
      claims: payload
    };
  } catch (error) {
    console.error('Failed to parse JWT token:', error);
    return { isValid: false, isExpired: true };
  }
};

// Add a request interceptor to check token expiration before each request
apiClient.interceptors.request.use(async config => {
  const token = sessionStorage.getItem('clickhouse_jwt');
  if (token) {
    const tokenStatus = checkTokenStatus(token);
    
    // If token is expiring soon (less than 2 minutes), try to refresh it
    if (tokenStatus.isValid && !tokenStatus.isExpired && tokenStatus.expiresIn && tokenStatus.expiresIn < 120) {
      console.log('JWT token expiring soon, should refresh');
      // You could add token refresh logic here if you implement a refresh endpoint
    }
    
    // If token is expired, remove it
    if (tokenStatus.isExpired) {
      console.warn('JWT token expired, removing from session storage');
      sessionStorage.removeItem('clickhouse_jwt');
      sessionStorage.removeItem('auth_token');
    }
  }
  
  // Continue with the original logic
  const authToken = sessionStorage.getItem('auth_token');
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  
  return config;
});

// ClickHouse Service Methods
export const connectToClickHouse = (connectionParams: {
  host: string;
  port: string;
  database: string;
  username: string;
  password?: string;
  jwtToken?: string;
  useJwt?: boolean;
}) => {
  console.log('Attempting to connect to ClickHouse with params:', {
    ...connectionParams,
    password: connectionParams.password ? '******' : undefined,
    jwtToken: connectionParams.jwtToken ? '******' : undefined
  });
  
  // Check token validity if provided
  if (connectionParams.useJwt && connectionParams.jwtToken) {
    const tokenStatus = checkTokenStatus(connectionParams.jwtToken);
    
    if (!tokenStatus.isValid) {
      console.error('Provided JWT token is not valid');
      return Promise.reject(new Error('Invalid JWT token format'));
    }
    
    if (tokenStatus.isExpired) {
      console.error('Provided JWT token is expired');
      return Promise.reject(new Error('JWT token has expired'));
    }
    
    console.log('JWT token appears valid, expires in:', tokenStatus.expiresIn, 'seconds');
  }
  
  // Store connection params in session storage (excluding sensitive data)
  const safeParams = {
    host: connectionParams.host,
    port: connectionParams.port,
    database: connectionParams.database,
    username: connectionParams.username,
    useJwt: connectionParams.useJwt
  };
  sessionStorage.setItem('clickhouse_connection', JSON.stringify(safeParams));
  
  return apiClient.post('/clickhouse/connect', connectionParams)
    .then(response => {
      console.log('Connection response:', response.data);
      
      // Store token from response
      if (response.data.token) {
        // Store as both auth_token and clickhouse_jwt for compatibility
        sessionStorage.setItem('auth_token', response.data.token);
        sessionStorage.setItem('clickhouse_jwt', response.data.token);
        
        // Update axios default headers for future requests
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        console.log('Token stored successfully');
      } else {
        console.warn('No token received in response');
      }
      
      // Show success notification
      toast.success('Successfully connected to ClickHouse database!', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      return response;
    })
    .catch(error => {
      console.error('Connection error:', error.response?.data || error.message);
      
      // Clear any stored tokens on auth error
      if (error.response?.status === 401) {
        sessionStorage.removeItem('clickhouse_jwt');
        sessionStorage.removeItem('auth_token');
      }
      
      // Show error notification
      toast.error(`Connection failed: ${error.response?.data?.message || error.message}`, {
        position: 'top-right',
        autoClose: 5000,
      });
      
      throw error;
    });
};

export const getClickHouseTables = () => {
  return apiClient.get('/clickhouse/tables');
};

export const getTableSchema = (tableName: string) => {
  return apiClient.get(`/clickhouse/schema/${tableName}`)
    .then(response => {
      // Add validation and debug logging
      console.log(`API response for schema ${tableName}:`, response);
      
      if (!response || !response.data) {
        throw new Error('Invalid API response format');
      }
      
      return response;
    })
    .catch(error => {
      console.error(`Error fetching schema for "${tableName}":`, error);
      throw error;
    });
};

export const exportToFile = (params: any) => {
  return apiClient.post('/clickhouse/export', params);
};

export const importFromFile = async (
  tableName: string,
  columns: Array<{ name: string; type: string }>,  // Make sure this accepts typed columns
  data: any[],
  options: any = {}
): Promise<any> => {
  try {
    // Make sure token is available
    const token = sessionStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required. Please reconnect to ClickHouse.');
    }
    
    // Set authorization header
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    const response = await apiClient.post('/clickhouse/import', {
      tableName,
      columns,  // These now include both name and type
      options: {
        ...options,
        data
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
};

// Define the interface based on the params you expect
interface JoinQueryParams {
  tables: string[];
  columns: string[];
  joinConditions: Array<{
    leftTable: string;
    leftColumn: string;
    rightTable: string;
    rightColumn: string;
    joinType?: string;
  }>;
  limit?: number;
  outputFormat?: string;
  delimiter?: string;
}

export const executeJoinQuery = async (params: JoinQueryParams): Promise<any> => {
  // Validate required fields
  if (!params.tables || params.tables.length < 2) {
    console.error("Missing required table names for join:", params);
    throw new Error("At least 2 table names are required for a join operation");
  }
  
  // Ensure all tables are strings
  const validTables = params.tables.filter(t => typeof t === 'string' && t.length > 0);
  if (validTables.length < 2) {
    console.error("Invalid table names for join:", params.tables);
    throw new Error("Invalid table names provided for join");
  }
  
  // Validate join conditions
  if (!params.joinConditions || !params.joinConditions.length) {
    console.error("Missing join conditions:", params);
    throw new Error("At least one join condition is required");
  }
  
  const validJoinConditions = params.joinConditions.filter(jc => 
    jc.leftTable && jc.leftColumn && jc.rightTable && jc.rightColumn
  );
  
  if (validJoinConditions.length === 0) {
    console.error("No valid join conditions:", params.joinConditions);
    throw new Error("No valid join conditions found");
  }
  
  // Make sure we have some columns selected
  if (!params.columns || !params.columns.length) {
    console.error("No columns selected for join:", params);
    throw new Error("Please select at least one column for the join result");
  }
  
  try {
    console.log("Sending join request with params:", params);
    const response = await apiClient.post('/clickhouse/join', params);
    return response.data;
  } catch (error: any) {
    console.error("Join query failed:", error);
    console.error("Error details:", error.response?.data);
    throw error;
  }
};

export const exportTableData = (
  tableName: string, 
  options: {
    format?: 'CSV' | 'TSV' | 'JSON' | 'JSONEachRow' | 'XML';
    columns?: string[];
    delimiter?: string;
    limit?: number;
    includeHeaders?: boolean;
    whereClause?: string;
  } = {}
) => {
  const { 
    format = 'CSV',
    columns = [],
    delimiter = ',',
    includeHeaders = true,
    limit = -1,
    whereClause = ''
  } = options;

  return apiClient.post('/clickhouse/export', {
    tableName,
    format,
    columns,
    delimiter,
    limit,
    includeHeaders,
    whereClause
  }, {
    responseType: 'blob' // Important: Get response as blob
  }).then(response => {
    // Determine file extension based on format
    let fileExtension;
    switch (format) {
      case 'CSV': fileExtension = 'csv'; break;
      case 'TSV': fileExtension = 'tsv'; break;
      case 'JSON': fileExtension = 'json'; break;
      case 'JSONEachRow': fileExtension = 'jsonl'; break;
      case 'XML': fileExtension = 'xml'; break;
      default: fileExtension = 'csv';
    }
    
    // Create a download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${tableName}_export.${fileExtension}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return { success: true };
  });
};

export const downloadExportedData = async (exportParams: any) => {
  try {
    // Use axios with responseType: 'blob' for binary data
    const response = await apiClient.post('/clickhouse/export-data', exportParams, {
      responseType: 'blob'
    });
    
    // Get filename from content-disposition header if available
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'export.csv'; // Default filename
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    // Create a download link and trigger it
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    return {
      success: true,
      filename,
      recordCount: 'Unknown' // You might need to fetch this separately
    };
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};

export const executeQuery = (query: string) => {
  return apiClient.post('/clickhouse/query', { query });
};

// File Service Methods
export const uploadFile = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return apiClient.post('/file/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const detectFileSchema = (params: { filePath: string, delimiter?: string }) => {
  return apiClient.post('/file/schema', params);
};

export const previewFileData = (params: { filePath: string, delimiter?: string, limit?: number }) => {
  return apiClient.post('/file/preview', params);
};

export const downloadFile = (fileName: string) => {
  console.log(`Attempting to download file: ${fileName}`);
  
  // Try direct URL approach first (this is the key fix)
  const directUrl = `http://localhost:3001/uploads/${fileName}?t=${Date.now()}`;
  console.log(`Trying direct download: ${directUrl}`);
  
  // Create a link and trigger click
  const link = document.createElement('a');
  link.href = directUrl;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(link);
  }, 100);
  
  return Promise.resolve(true);
};

export const deleteFile = (fileName: string) => {
  return apiClient.delete(`/file/${fileName}`);
};

export { apiClient };

export default {
  connectToClickHouse,
  getClickHouseTables,
  getTableSchema,
  exportToFile,
  importFromFile,
  executeJoinQuery,
  exportTableData,
  downloadExportedData,
  executeQuery,
  uploadFile,
  detectFileSchema,
  previewFileData,
  downloadFile,
  deleteFile,
};
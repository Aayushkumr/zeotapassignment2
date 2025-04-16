import fs from 'fs-extra';
import csv from 'csv-parser';
import path from 'path';

interface ParseOptions {
  delimiter?: string;
  headers?: boolean | string[];
  maxRows?: number;
}

// Parse CSV/TSV/flat files
export const parseFile = (
  filePath: string, 
  options: ParseOptions = { delimiter: ',', headers: true }
): Promise<any[]> => {
  const results: any[] = [];
  const maxRows = options.maxRows || Infinity;
  
  return new Promise((resolve, reject) => {
    // Determine the delimiter from file extension if not provided
    let delimiter = options.delimiter;
    if (!delimiter) {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.tsv') delimiter = '\t';
      else if (ext === '.csv') delimiter = ',';
      else delimiter = ','; // Default to comma for other files
    }

    fs.createReadStream(filePath)
      .pipe(csv({ 
        separator: delimiter,
        headers: options.headers === false ? undefined : options.headers as any,
        skipLines: 0
      }))
      .on('data', (data) => {
        if (results.length < maxRows) {
          results.push(data);
        }
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

// Detect file schema
export const detectSchema = async (
  filePath: string, 
  options: ParseOptions = { delimiter: ',', headers: true, maxRows: 100 }
): Promise<{ columnNames: string[], sampleData: any[] }> => {
  const sampleData = await parseFile(filePath, { ...options, maxRows: options.maxRows || 100 });
  
  // Extract column names
  let columnNames: string[] = [];
  if (sampleData.length > 0) {
    columnNames = Object.keys(sampleData[0]);
  }
  
  return { columnNames, sampleData };
};

export default {
  parseFile,
  detectSchema
};


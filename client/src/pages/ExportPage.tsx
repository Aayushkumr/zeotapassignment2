/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useCallback } from 'react';
import ConnectionForm from '../components/ConnectionForm';
import SchemaMapper from '../components/SchemaMapper';
import DataPreview from '../components/DataPreview';
import { 
  getClickHouseTables, 
  getTableSchema, 
  exportToFile, 
  downloadFile,
  executeQuery
} from '../services/apiClient';
import './ExportPage.css';

const ExportPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | {name: string, columns: any[]}>('');
  const [columns, setColumns] = useState<{ name: string, type: string }[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [outputFormat, setOutputFormat] = useState('csv');
  const [delimiter, setDelimiter] = useState(',');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ fileName: string, recordCount: number } | null>(null);

  // Handle connection to ClickHouse
  const handleConnect = async (connected: boolean) => {
    setIsConnected(connected);
    if (connected) {
      try {
        setLoading(true);
        const response = await getClickHouseTables();
        if (response.data.success) {
          setTables(response.data.data);
        }
      } catch (err: any) {
        setError(`Failed to fetch tables: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle table selection - use useCallback for stability
  const handleTableSelect = useCallback(async (tableName: string) => {
    console.log("Table clicked:", tableName);
    
    // Set loading state
    setLoading(true);
    setError(null);
    
    try {
      // Get schema to create TableInfo object
      const response = await getTableSchema(tableName);
      
      // Debug logging to identify the issue
      console.log(`Schema response for ${tableName}:`, response);
      
      // Add defensive checks
      if (!response || !response.data) {
        throw new Error(`Invalid response format for table ${tableName}`);
      }
      
      // Check if columns exist in the response
      let tableColumns = [];
      
      // Check all possible locations where columns might be
      if (response.data.columns && Array.isArray(response.data.columns)) {
        tableColumns = response.data.columns;
      } else if (Array.isArray(response.data)) {
        tableColumns = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        tableColumns = response.data.data;
      } else {
        throw new Error(`No columns found in schema response for table ${tableName}`);
      }
      
      // Ensure we have columns before proceeding
      if (!tableColumns || tableColumns.length === 0) {
        throw new Error(`No columns returned for table ${tableName}`);
      }
      
      // Set the selected table name (as string)
      setSelectedTable(tableName);
      
      // Set the columns from the response
      setColumns(tableColumns);
      
      console.log(`Set selected table: ${tableName} with ${tableColumns.length} columns`);
      
      // Clear any previous errors
      setError(null);
      
      // Move to step 2 after successful table selection
      setStep(2);
    } catch (err: any) {
      console.error("Error fetching schema:", err);
      setError(`Error fetching schema: ${err.message}`);
      setSelectedTable(''); // Set to empty string, not null
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setSelectedTable, setColumns, setStep]);

  // Preview data before export
  const handlePreviewData = async () => {
    if (!selectedTable || selectedColumns.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Debug what's in selectedColumns
      console.log("Raw selected columns:", selectedColumns);
      
      // Use a simpler, more robust approach to extract column names
      let columnNames: string[] = [];
      
      // Ensure we're only using string column names
      if (selectedColumns.every(col => typeof col === 'string')) {
        columnNames = selectedColumns as string[];
      } else {
        // Handle if there's a mix of objects and strings
        columnNames = selectedColumns.map(col => {
          if (typeof col === 'string') return col;
          if (col && typeof col === 'object' && 'name' in col) {
            return (col as {name: string}).name;
          }
          return String(col);
        });
      }
      
      console.log("Cleaned column names:", columnNames);
      
      // Create a clean query
      const query = `SELECT ${columnNames.join(', ')} FROM ${selectedTable} LIMIT 100`;
      console.log('Preview query:', query);
      
      const response = await executeQuery(query);
      
      if (response.data && response.data.success) {
        // Log what we're getting to debug
        console.log('Preview data received:', response.data.data);
        
        // Make sure we have an array of data
        const receivedData = Array.isArray(response.data.data) ? 
          response.data.data : 
          (response.data.data ? [response.data.data] : []);
        
        setPreviewData(receivedData);
        
        // Also update columns if needed based on actual data
        if (receivedData.length > 0) {
          const dataKeys = Object.keys(receivedData[0]);
          if (dataKeys.length > 0 && (!columns || columns.length === 0)) {
            // Create column objects from data keys
            const newColumns = dataKeys.map(key => ({
              name: key,
              type: typeof receivedData[0][key]
            }));
            setColumns(newColumns);
          }
        }
      } else {
        setError('Failed to preview data: ' + (response.data?.message || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('Preview error:', err);
      setError(`Error previewing data: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle export to file
  const handleExport = async () => {
    if (!selectedTable || selectedColumns.length === 0) {
      setError('Please select a table and at least one column to export');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Ensure columns are strings before exporting
      const exportColumns = selectedColumns.map(col => {
        if (typeof col === 'string') return col;
        if (col && typeof col === 'object' && 'name' in col) {
          return (col as {name: string}).name;
        }
        return String(col);
      });
      
      console.log("Export columns:", exportColumns);
      
      const response = await exportToFile({
        tableName: typeof selectedTable === 'string' ? selectedTable : selectedTable.name,
        columns: exportColumns,
        outputFormat,
        delimiter
      });
      
      if (response.data.success) {
        setSuccess({
          fileName: response.data.data.fileName,
          recordCount: response.data.data.recordCount
        });
        setStep(3);
      } else {
        setError('Export failed: ' + response.data.message);
      }
    } catch (err: any) {
      setError(`Export error: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle file download
  const handleDownload = () => {
    if (success) {
      downloadFile(success.fileName);
    }
  };

  // Reset form to start new export
  const resetForm = () => {
    setStep(1);
    setSelectedTable('');
    setColumns([]);
    setSelectedColumns([]);
    setPreviewData([]);
    setSuccess(null);
    setError(null);
  };

  return (
    <div className="export-page">
      <h1>Export ClickHouse to Flat File</h1>
      
      <div className="steps-indicator">
        <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Select Table</div>
        <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Select Columns</div>
        <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Complete</div>
      </div>

      {error && <div className="error-message">{error}</div>}
      
      {step === 1 && (
        <div className="step-container">
          <div className="connection-section">
            <h2>ClickHouse Connection</h2>
            <ConnectionForm onConnected={(connected) => handleConnect(connected)} />
          </div>
          
          {isConnected && (
            <div className="table-selection">
              <h2>Select Source Table</h2>
              {loading ? (
                <div className="loading">Loading tables...</div>
              ) : (
                <>
                  {(tables?.length || 0) > 0 ? ( // Add null check here
                    <div className="tables-list">
                      {tables?.map(table => ( // Add optional chaining here
                        <div 
                          key={table}
                          className={`table-item ${typeof selectedTable === 'string' && selectedTable === table ? 'selected' : ''}`}
                          onClick={() => handleTableSelect(table)}
                        >
                          {table}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-tables">No tables found in database</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="step-container">
          <div className="table-info">
            <h3>Table: {typeof selectedTable === 'string' ? selectedTable : selectedTable.name}</h3>
            
            <div className="export-options">
              <div className="form-group">
                <label htmlFor="outputFormat">Output Format:</label>
                <select
                  id="outputFormat"
                  value={outputFormat}
                  onChange={e => setOutputFormat(e.target.value)}
                >
                  <option value="csv">CSV</option>
                  <option value="tsv">TSV</option>
                  <option value="txt">TXT</option>
                </select>
              </div>
              
              {outputFormat === 'csv' && (
                <div className="form-group">
                  <label htmlFor="delimiter">Delimiter:</label>
                  <select
                    id="delimiter"
                    value={delimiter}
                    onChange={e => setDelimiter(e.target.value)}
                  >
                    <option value=",">Comma (,)</option>
                    <option value=";">Semicolon (;)</option>
                    <option value="\t">Tab (\t)</option>
                    <option value="|">Pipe (|)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <SchemaMapper
            columns={columns}
            selectedColumns={selectedColumns}
            onColumnSelectionChange={setSelectedColumns}
          />

          {selectedColumns.length > 0 && (
            <div className="preview-section">
              <button 
                className="preview-btn"
                onClick={handlePreviewData}
                disabled={loading}
              >
                Preview Data
              </button>
              
              {previewData.length > 0 && (
                <DataPreview 
                  data={previewData} 
                  columns={selectedColumns} 
                />
              )}
            </div>
          )}

          <div className="action-buttons">
            <button
              className="back-btn"
              onClick={() => setStep(1)}
              disabled={loading}
            >
              Back
            </button>
            <button
              className="export-btn"
              onClick={handleExport}
              disabled={loading || selectedColumns.length === 0}
            >
              {loading ? 'Exporting...' : 'Export Data'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && success && (
        <div className="step-container success-container">
          <div className="success-message">
            <h2>Export Completed Successfully!</h2>
            <p>Your data has been exported to a file.</p>
            <div className="file-info">
              <strong>File Name:</strong> {success.fileName}
            </div>
            <div className="record-count">
              <strong>Records exported:</strong> {success.recordCount}
            </div>
          </div>
          
          <div className="success-actions">
            <button 
              className="download-btn"
              onClick={handleDownload}
            >
              Download File
            </button>
            <button 
              className="new-export-btn"
              onClick={resetForm}
            >
              Start New Export
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportPage;
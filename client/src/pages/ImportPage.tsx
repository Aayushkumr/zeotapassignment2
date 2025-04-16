/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react';
import FileUploader from '../components/FileUploader';
import ConnectionForm from '../components/ConnectionForm';
import SchemaMapper from '../components/SchemaMapper';
import { detectFileSchema, previewFileData, importFromFile, getClickHouseTables } from '../services/apiClient';
import { prepareDataForImport } from '../utils/dataTransform';
import './ImportPage.css';

const ImportPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const [filePath, setFilePath] = useState('');
  const [fileName, setFileName] = useState('');
  const [delimiter, setDelimiter] = useState(',');
  const [columns, setColumns] = useState<{ name: string }[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [sampleData, setSampleData] = useState<any[]>([]);
  const [tableName, setTableName] = useState('');
  const [createNewTable, setCreateNewTable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ message: string, recordCount: number } | null>(null);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  // Fetch tables when connected
  useEffect(() => {
    if (isConnected) {
      refreshTablesList();
    }
  }, [isConnected]);

  const refreshTablesList = async () => {
    try {
      const response = await getClickHouseTables();
      if (response?.data?.tables) {
        setAvailableTables(response.data.tables);
      }
    } catch (err) {
      console.error("Failed to refresh tables list", err);
    }
  };

  const handleFileUploaded = async (path: string, name: string) => {
    setFilePath(path);
    setFileName(name);
    setLoading(true);
    setError(null);
    
    try {
      const response = await detectFileSchema({ filePath: path, delimiter });
      if (response?.data?.success) {
        const { columnNames, sampleData } = response.data.data || {};
        
        const sanitizedColumns = (columnNames || []).map((name: string | any) => ({ 
          name: typeof name === 'string' ? name : String(name) 
        }));
        
        setColumns(sanitizedColumns);
        setSampleData(sampleData || []);
        setSelectedColumns(sanitizedColumns.map((col: { name: string }) => col.name));
        setStep(2);
      } else {
        setError('Failed to read file schema: ' + (response?.data?.message || 'Unknown error'));
      }
    } catch (err: any) {
      setError(`Error detecting schema: ${err.response?.data?.message || err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelimiterChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDelimiter = e.target.value;
    setDelimiter(newDelimiter);
    
    if (filePath) {
      setLoading(true);
      try {
        const response = await detectFileSchema({ filePath, delimiter: newDelimiter });
        if (response?.data?.success) {
          const { columnNames, sampleData } = response.data.data || {};
          
          const sanitizedColumns = (columnNames || []).map((name: string | any) => ({ 
            name: typeof name === 'string' ? name : String(name) 
          }));
          
          setColumns(sanitizedColumns);
          setSampleData(sampleData || []);
          setSelectedColumns(sanitizedColumns.map((col: { name: string }) => col.name));
        }
      } catch (err) {
        console.error('Error updating schema with new delimiter:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePreview = async () => {
    if (!filePath) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await previewFileData({ 
        filePath, 
        delimiter,
        limit: 100 
      });
      
      if (response?.data?.success) {
        setSampleData(response.data.data?.records || []);
      } else {
        setError('Failed to preview data: ' + (response?.data?.message || 'Unknown error'));
      }
    } catch (err: any) {
      setError(`Error previewing data: ${err.response?.data?.message || err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!tableName || !selectedColumns.length) {
      setError('Please select a table and map columns first.');
      return;
    }

    try {
      setIsImporting(true);
      setError(null);

      // Format the data according to column mappings
      const formattedData = prepareDataForImport(sampleData, selectedColumns);

      // Ensure each column has a valid type - NEVER allow undefined types
      const columnDefinitions = selectedColumns.map(colName => ({
        name: colName,
        type: 'String' // ALWAYS use String type for reliability
      }));

      // Add a message about special characters
      if (selectedColumns.some(col => /[^a-zA-Z0-9_]/.test(col))) {
        console.warn('Warning: Some column names contain special characters. They will be sanitized for ClickHouse compatibility.');
      }

      const importOptions = {
        createTable: createNewTable,
        appendData: !createNewTable,
      };

      console.log(`Importing ${formattedData.length} rows to ${tableName}`);
      
      const result = await importFromFile(
        tableName,
        columnDefinitions,
        formattedData,
        importOptions
      );

      if (result.success) {
        setSuccess({
          message: `Import successful! ${result.rowsImported} rows imported.`,
          recordCount: result.rowsImported,
        });

        // Reset UI state after success
        setStep(3); // Move to success step instead of resetting form
      } else {
        setError(result.message || 'Import failed for unknown reasons');
      }
    } catch (err: any) {
      console.error('Import error details:', err);

      // Extract the most useful error message
      let errorMessage = err.message || 'Unknown error';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      setError(`Import failed: ${errorMessage}`);
    } finally {
      setIsImporting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setFilePath('');
    setFileName('');
    setColumns([]);
    setSelectedColumns([]);
    setSampleData([]);
    setTableName('');
    setSuccess(null);
    setError(null);
  };

  const addTypeToColumns = (columns: { name: string }[]): { name: string; type: string }[] => {
    return columns.map(col => ({
      name: col.name,
      type: 'String' // Default type
    }));
  };

  return (
    <div className="import-page">
      <h1>Import Flat File to ClickHouse</h1>
      
      <div className="steps-indicator">
        <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Upload File</div>
        <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Map Columns</div>
        <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Complete</div>
      </div>

      {error && <div className="error-message">{error}</div>}
      
      {step === 1 && (
        <div className="step-container">
          <div className="file-section">
            <h2>Upload Flat File</h2>
            <FileUploader onFileUploaded={handleFileUploaded} />
            
            <div className="delimiter-selector">
              <label htmlFor="delimiter">File Delimiter:</label>
              <select 
                id="delimiter" 
                value={delimiter} 
                onChange={handleDelimiterChange}
              >
                <option value=",">Comma (,)</option>
                <option value="\t">Tab (\t)</option>
                <option value=";">Semicolon (;)</option>
                <option value="|">Pipe (|)</option>
              </select>
            </div>
          </div>
          
          <div className="connection-section">
            <h2>ClickHouse Connection</h2>
            <ConnectionForm onConnected={setIsConnected} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="step-container">
          <div className="file-info">
            <h3>File: {fileName}</h3>
            <button 
              className="preview-btn" 
              onClick={handlePreview}
              disabled={loading}
            >
              Refresh Preview
            </button>
          </div>

          <div className="table-config">
            <div className="form-group">
              <label htmlFor="tableName">Target Table Name:</label>
              <input
                type="text"
                id="tableName"
                value={tableName}
                onChange={e => setTableName(e.target.value)}
                placeholder="Enter table name"
                required
              />
            </div>
            
            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={createNewTable}
                  onChange={e => setCreateNewTable(e.target.checked)}
                />
                Create table if it doesn't exist
              </label>
            </div>
          </div>

          {availableTables.length > 0 && (
            <div className="existing-tables">
              <h4>Existing Tables:</h4>
              <div className="tables-list">
                {availableTables.map((table, index) => (
                  <span 
                    key={index} 
                    className="table-name"
                    onClick={() => setTableName(table)}
                  >
                    {table}
                  </span>
                ))}
              </div>
              <p className="hint">Click on a table name to use it</p>
            </div>
          )}

          <SchemaMapper
            columns={addTypeToColumns(columns)}
            selectedColumns={selectedColumns}
            onColumnSelectionChange={setSelectedColumns}
            sampleData={sampleData}
          />

          <div className="action-buttons">
            <button
              className="back-btn"
              onClick={() => setStep(1)}
              disabled={loading}
            >
              Back
            </button>
            <button
              className="import-btn"
              onClick={handleImport}
              disabled={loading || isImporting || !isConnected || !tableName || selectedColumns.length === 0}
            >
              {isImporting ? 'Importing...' : 'Import Data'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && success && (
        <div className="step-container success-container">
          <div className="success-message">
            <h2>Import Completed Successfully!</h2>
            <p>{success.message}</p>
            <div className="record-count">
              <strong>Records imported: {success.recordCount}</strong>
            </div>
          </div>
          
          <button className="new-import-btn" onClick={resetForm}>
            Start New Import
          </button>
        </div>
      )}
    </div>
  );
};

export default ImportPage;
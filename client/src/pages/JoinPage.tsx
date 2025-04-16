/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import ConnectionForm from '../components/ConnectionForm';
import SchemaMapper from '../components/SchemaMapper';
import DataPreview from '../components/DataPreview';
import { 
  getClickHouseTables, 
  getTableSchema, 
  executeJoinQuery, 
  downloadFile 
} from '../services/apiClient';
import './JoinPage.css';

interface TableInfo {
  name: string;
  columns: { name: string; type: string }[];
  [key: string]: any; // For other properties in TableInfo
}

interface JoinCondition {
  leftTable: string;
  leftColumn: string;
  rightTable: string;
  rightColumn: string;
  joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
}

const JoinPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<TableInfo[]>([]);
  const [joinConditions, setJoinConditions] = useState<JoinCondition[]>([]);
  const [availableColumns, setAvailableColumns] = useState<{ name: string; type: string; table: string }[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [outputFormat, setOutputFormat] = useState('csv');
  const [delimiter, setDelimiter] = useState(',');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ fileName: string; recordCount: number } | null>(null);

  // Create default join condition when two tables are selected
  useEffect(() => {
    if (selectedTables.length === 2 && joinConditions.length === 0) {
      // Initialize a default join condition when two tables are selected
      setJoinConditions([{
        leftTable: selectedTables[0].name,
        leftColumn: '',
        rightTable: selectedTables[1].name,
        rightColumn: '',
        joinType: 'INNER'
      }]);
    }
  }, [selectedTables, joinConditions.length]);

  // Update available columns when selected tables change
  useEffect(() => {
    const allColumns = selectedTables.flatMap(table => 
      table.columns.map(col => ({
        name: `${table.name}.${col.name}`,
        type: col.type,
        table: table.name
      }))
    );
    setAvailableColumns(allColumns);
  }, [selectedTables]);

  // Handle connection to ClickHouse
  const handleConnect = async (connected: boolean) => {
    setIsConnected(connected);
    
    if (connected) {
      setLoading(true);
      try {
        const response = await getClickHouseTables();
        if (response.data.success) {
          setAvailableTables(response.data.data);
        } else {
          setError('Failed to get tables: ' + response.data.message);
        }
      } catch (err: any) {
        setError(`Error fetching tables: ${err.response?.data?.message || err.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // Add this helper function:
  const validateTableExists = (tableName: string): boolean => {
    return availableTables.includes(tableName);
  };

  // Update your table selection handler:
  const handleTableSelection = async (tableName: string) => {
    console.log("Table clicked:", tableName);
    
    // Check if the table exists in the available tables list
    if (!validateTableExists(tableName)) {
      setError(`Table "${tableName}" does not exist in the database.`);
      return;
    }

    // Check if table is already selected
    const isSelected = selectedTables.some(t => t.name === tableName);
    
    if (isSelected) {
      // Remove table from selection
      setSelectedTables(prev => prev.filter(t => t.name !== tableName));
      console.log(`Removed table: ${tableName}`);
    } else {
      // Don't allow more than 2 tables for now
      if (selectedTables.length >= 2) {
        setError("Please select only 2 tables for joining");
        return;
      }
      
      // Set loading state for better UX
      setLoading(true);
      
      try {
        // Get schema to create TableInfo object
        const response = await getTableSchema(tableName);
        
        // Log the entire response to debug
        console.log(`Schema response for ${tableName}:`, response);
        
        // Check response structure more defensively with additional logging
        if (response.data && response.data.success) {
          // Check for columns in all possible locations in the response
          let columns = [];
          
          if (response.data.columns && Array.isArray(response.data.columns) && response.data.columns.length > 0) {
            columns = response.data.columns;
            console.log(`Found columns in response.data.columns: ${columns.length} columns`);
          } else if (Array.isArray(response.data.data) && response.data.data.length > 0) {
            columns = response.data.data;
            console.log(`Found columns in response.data.data: ${columns.length} columns`);
          } else if (response.data.data && response.data.data.columns && Array.isArray(response.data.data.columns)) {
            columns = response.data.data.columns;
            console.log(`Found columns in response.data.data.columns: ${columns.length} columns`);
          }
          
          // Now check if we found any columns
          if (columns.length > 0) {
            const tableInfo: TableInfo = {
              name: tableName,
              columns: columns
            };
            
            setSelectedTables(prev => [...prev, tableInfo]);
            console.log(`Added table: ${tableName}`, tableInfo);
            
            // Clear any previous errors
            setError(null);
          } else {
            console.error(`No columns found in response for table ${tableName}`);
            setError(`No columns found for table "${tableName}". The table may be empty.`);
          }
        } else {
          console.error(`Invalid schema response for table ${tableName}:`, response.data);
          const errorMsg = response.data?.message || 'Unknown error';
          setError(`Failed to load schema for table "${tableName}". ${errorMsg}`);
        }
      } catch (err) {
        console.error(`Failed to get schema for table ${tableName}:`, err);
        setError(`Error loading table schema: ${tableName}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // Remove a selected table
  const handleRemoveTable = (tableName: string) => {
    const updatedTables = selectedTables.filter(t => t.name !== tableName);
    setSelectedTables(updatedTables);
    
    // Remove any join conditions involving this table
    const updatedJoinConditions = joinConditions.filter(
      jc => jc.leftTable !== tableName && jc.rightTable !== tableName
    );
    setJoinConditions(updatedJoinConditions);
    
    // Update selected columns
    setSelectedColumns(selectedColumns.filter(col => !col.startsWith(`${tableName}.`)));
  };

  // Handle join condition changes
  const handleJoinConditionChange = (index: number, field: keyof JoinCondition, value: string) => {
    const updatedConditions = [...joinConditions];
    
    // Store the value directly without table prefix for leftColumn and rightColumn
    updatedConditions[index] = {
      ...updatedConditions[index],
      [field]: value
    };
    
    setJoinConditions(updatedConditions);
    
    // After updating, validate join condition
    const condition = updatedConditions[index];
    const isComplete = condition.leftTable && condition.leftColumn && condition.rightTable && condition.rightColumn;
    
    if (isComplete) {
      console.log(`Join condition ${index} is complete:`, condition);
    }
  };

  // Proceed to column selection step
  const handleContinueToColumns = () => {
    // Validate join conditions
    const isValid = joinConditions.every(jc => 
      jc.leftTable && jc.leftColumn && jc.rightTable && jc.rightColumn
    );
    
    if (!isValid) {
      setError('Please complete all join conditions');
      return;
    }
    
    setStep(2);
  };

  // Preview join query results
  const handlePreviewJoin = async () => {
    if (selectedTables.length < 2 || joinConditions.length === 0) {
      setError("Please select at least 2 tables and define join conditions");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Make sure we have exactly 2 tables selected for now
      if (selectedTables.length !== 2) {
        setError("Please select exactly 2 tables for joining");
        return;
      }
      
      // Extract just the table names from the TableInfo objects
      const tableNames = selectedTables.map(table => table.name);
      
      console.log("Selected tables:", tableNames);
      console.log("Join conditions:", joinConditions);
      console.log("Selected columns:", selectedColumns);
      
      // Ensure we're sending string table names
      const requestData = {
        tables: tableNames,
        columns: selectedColumns,
        joinConditions: joinConditions.map(jc => ({
          leftTable: jc.leftTable,
          leftColumn: jc.leftColumn,
          rightTable: jc.rightTable,
          rightColumn: jc.rightColumn,
          joinType: jc.joinType || 'INNER'
        })),
        limit: 100
      };
      
      console.log("Sending join request:", JSON.stringify(requestData, null, 2));
      
      const response = await executeJoinQuery(requestData);
      
      if (response.success) {
        setPreviewData(response.data);
      } else {
        setError(response.error || "Failed to preview join results");
      }
    } catch (err) {
      console.error("Join preview error:", err);
      setError("Failed to execute join preview");
    } finally {
      setLoading(false);
    }
  };

  // Execute join and export to file
  const handleExecuteJoin = async () => {
    if (selectedTables.length < 2 || joinConditions.length === 0) {
      setError("Please select at least 2 tables and define join conditions");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Make sure we have exactly 2 tables selected for now
      if (selectedTables.length !== 2) {
        setError("Please select exactly 2 tables for joining");
        return;
      }
      
      // Extract just the table names from the TableInfo objects
      const tableNames = selectedTables.map(table => table.name);
      
      console.log("Selected tables for export:", tableNames);
      console.log("Join conditions for export:", joinConditions);
      console.log("Selected columns for export:", selectedColumns);
      
      const requestData = {
        tables: tableNames,
        columns: selectedColumns,
        joinConditions: joinConditions.map(jc => ({
          leftTable: jc.leftTable,
          leftColumn: jc.leftColumn,
          rightTable: jc.rightTable, 
          rightColumn: jc.rightColumn,
          joinType: jc.joinType || 'INNER'
        })),
        outputFormat,
        delimiter
      };
      
      console.log("Sending join export request:", JSON.stringify(requestData, null, 2));
      
      const response = await executeJoinQuery(requestData);
      
      // Download the file if successful
      if (response.success && response.filePath) {
        await downloadFile(response.filePath);
        setSuccess({
          fileName: response.filePath,
          recordCount: response.rowCount || 0 // Use response.rowCount if available, otherwise 0
        });
      } else {
        setError(response.error || "Failed to export join results");
      }
    } catch (err) {
      console.error("Join export error:", err);
      setError("Failed to export join results");
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

  // Reset form to start new join query
  const resetForm = () => {
    setStep(1);
    setSelectedTables([]);
    setJoinConditions([]);
    setAvailableColumns([]);
    setSelectedColumns([]);
    setPreviewData([]);
    setSuccess(null);
    setError(null);
  };

  // Get columns for a specific table
  const getTableColumns = (tableName: string) => {
    const table = selectedTables.find(t => t.name === tableName);
    return table ? table.columns : [];
  };

  return (
    <div className="join-page">
      <div className="page-header">
        <h1>JOIN Tables Export</h1>
        <p className="subtitle">Combine data from multiple tables with custom join conditions</p>
      </div>
      
      <div className="steps-indicator">
        <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Configure Join</div>
        <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Select Columns</div>
        <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Complete</div>
      </div>

      {error && (
        <div className="error-message">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12" y2="16"></line>
          </svg>
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="success-message">
          <div className="success-message-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div className="success-message-content">
            <div className="success-message-text">Successfully exported data</div>
            <div className="success-file-info">
              File: {success.fileName}<br />
              Records: {success.recordCount}
            </div>
          </div>
        </div>
      )}
      
      {step === 1 && (
        <div className="step-container">
          <div className="connection-section">
            <h2>ClickHouse Connection</h2>
            <ConnectionForm onConnected={(connected) => handleConnect(connected)} />
          </div>
          
          {isConnected && (
            <div className="join-configuration">
              <div className="tables-section">
                <h3>Tables for JOIN</h3>
                
                <div className="tables-container">
                  <div className="available-tables">
                    <h4>Available Tables</h4>
                    {loading ? (
                      <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <span>Processing...</span>
                      </div>
                    ) : (
                      <div className="tables-list">
                        {availableTables.map(table => (
                          <div 
                            key={table}
                            className={`table-item ${selectedTables.some(t => t.name === table) ? 'selected' : ''}`}
                            onClick={() => handleTableSelection(table)}
                          >
                            <span className="table-name">{table}</span>
                            <span className="table-action">
                              {selectedTables.some(t => t.name === table) ? 
                                '✓ Selected' : 
                                '+ Select'
                              }
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="selected-tables">
                    <h4>Selected Tables</h4>
                    {selectedTables.length > 0 ? (
                      <div className="tables-list">
                        {selectedTables.map(table => (
                          <div key={table.name} className="selected-table-item">
                            <span>{table.name}</span>
                            <button 
                              className="remove-btn"
                              onClick={() => handleRemoveTable(table.name)}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="no-selection">No tables selected</div>
                    )}
                  </div>
                </div>
              </div>
              
              {selectedTables.length >= 2 && (
                <div className="join-conditions">
                  <h3>Join Conditions</h3>
                  
                  {joinConditions.map((condition, index) => (
                    <div key={index} className="join-condition">
                      <select
                        value={condition.joinType}
                        onChange={e => handleJoinConditionChange(index, 'joinType', e.target.value)}
                        className="join-type"
                      >
                        <option value="INNER">INNER JOIN</option>
                        <option value="LEFT">LEFT JOIN</option>
                        <option value="RIGHT">RIGHT JOIN</option>
                        <option value="FULL">FULL JOIN</option>
                      </select>
                      
                      <div className="condition-tables">
                        <div className="condition-table">
                          <select
                            value={condition.leftTable}
                            onChange={e => handleJoinConditionChange(index, 'leftTable', e.target.value)}
                            disabled
                          >
                            <option value="">Select Left Table</option>
                            {selectedTables.map(t => (
                              <option key={t.name} value={t.name}>{t.name}</option>
                            ))}
                          </select>
                          
                          <select
                            value={condition.leftColumn}
                            onChange={e => handleJoinConditionChange(index, 'leftColumn', e.target.value)}
                          >
                            <option value="">Select Column</option>
                            {getTableColumns(condition.leftTable).map(col => (
                              <option key={col.name} value={col.name}>{col.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="equals-sign">=</div>
                        
                        <div className="condition-table">
                          <select
                            value={condition.rightTable}
                            onChange={e => handleJoinConditionChange(index, 'rightTable', e.target.value)}
                            disabled
                          >
                            <option value="">Select Right Table</option>
                            {selectedTables.map(t => (
                              <option key={t.name} value={t.name}>{t.name}</option>
                            ))}
                          </select>
                          
                          <select
                            value={condition.rightColumn}
                            onChange={e => handleJoinConditionChange(index, 'rightColumn', e.target.value)}
                          >
                            <option value="">Select Column</option>
                            {getTableColumns(condition.rightTable).map(col => (
                              <option key={col.name} value={col.name}>{col.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button
                    className="continue-btn"
                    onClick={handleContinueToColumns}
                    disabled={loading || joinConditions.length === 0}
                  >
                    Continue to Column Selection
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="step-container">
          <div className="export-options">
            <h3>Export Options</h3>
            
            <div className="form-row">
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

          <div className="column-selection">
            <h3>Select Columns for Export</h3>
            
            <SchemaMapper
              columns={availableColumns.map(col => ({ name: col.name, type: col.type }))}
              selectedColumns={selectedColumns}
              onColumnSelectionChange={setSelectedColumns}
            />
            
            {selectedColumns.length > 0 && (
              <div className="preview-section">
                <button 
                  className="preview-btn"
                  onClick={handlePreviewJoin}
                  disabled={loading}
                >
                  Preview JOIN Results
                </button>
                
                {previewData.length > 0 && (
                  <DataPreview 
                    data={previewData} 
                    columns={selectedColumns.map(col => col.split('.')[1])} 
                  />
                )}
              </div>
            )}
          </div>

          <div className="action-buttons">
            <button
              className="back-btn"
              onClick={() => setStep(1)}
              disabled={loading}
            >
              Back
            </button>
            <button
              className="execute-btn"
              onClick={handleExecuteJoin}
              disabled={loading || selectedColumns.length === 0}
            >
              {loading ? 'Executing...' : 'Execute JOIN & Export'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && success && (
        <div className="step-container success-container">
          <div className="success-message">
            <h2>JOIN Export Completed Successfully!</h2>
            <p>Your JOIN query results have been exported to a file.</p>
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
              className="new-join-btn"
              onClick={resetForm}
            >
              Start New JOIN Query
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JoinPage;
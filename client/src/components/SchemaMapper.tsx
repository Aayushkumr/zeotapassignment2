import React from 'react';
import './SchemaMapper.css';

interface SchemaMapperProps {
  columns: { name: string; type: string }[];
  selectedColumns: string[];
  onColumnSelectionChange: (columns: string[]) => void;
  sampleData?: string[]; // Optional: Sample data for preview
}

const SchemaMapper: React.FC<SchemaMapperProps> = ({ columns, selectedColumns, onColumnSelectionChange }) => {
  const handleColumnToggle = (columnName: string) => {
    if (selectedColumns.includes(columnName)) {
      // If already selected, remove it
      onColumnSelectionChange(selectedColumns.filter(col => col !== columnName));
    } else {
      // If not selected, add it
      onColumnSelectionChange([...selectedColumns, columnName]);
    }
  };

  const selectAll = () => {
    onColumnSelectionChange(columns.map(col => col.name));
  };

  const clearAll = () => {
    onColumnSelectionChange([]);
  };

  return (
    <div className="schema-mapper">
      <div className="section-header">
        <h2>Select Columns to Export</h2>
        <div className="selection-actions">
          <button type="button" onClick={selectAll}>Select All</button>
          <button type="button" onClick={clearAll}>Clear All</button>
        </div>
      </div>

      <div className="columns-container">
        {columns.map((column, index) => (
          <div 
            key={index}
            className={`column-item ${selectedColumns.includes(column.name) ? 'selected' : ''}`}
            onClick={() => handleColumnToggle(column.name)}
          >
            <div className="column-checkbox">
              <input 
                type="checkbox" 
                checked={selectedColumns.includes(column.name)}
                onChange={() => handleColumnToggle(column.name)}
              />
            </div>
            <div className="column-info">
              <div className="column-name">{column.name}</div>
              <div className="column-type">{column.type}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SchemaMapper;
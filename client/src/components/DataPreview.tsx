/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from 'react';
import './DataPreview.css';

interface DataPreviewProps {
  data: any[];
  columns: string[];
}

const DataPreview: React.FC<DataPreviewProps> = ({ data = [], columns = [] }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Handle potentially undefined data
  const safeData = data || [];
  const safeColumns = Array.isArray(columns) ? columns : [];
  
  // Extract actual column names if we have data but no columns specified
  const effectiveColumns = safeColumns.length > 0 
    ? safeColumns 
    : (safeData.length > 0 ? Object.keys(safeData[0]) : []);
  
  const totalPages = Math.ceil(safeData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const visibleData = safeData.slice(startIndex, startIndex + itemsPerPage);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // Helper function to format a cell value for display
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="data-preview">
      <h2>Data Preview</h2>
      <p>{safeData.length} total records</p>
      <p>Showing page {currentPage} of {totalPages || 1}</p>
      
      <div className="table-container">
        <table>
          <thead>
            <tr>
              {effectiveColumns.map((col, index) => (
                <th key={index}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleData.length > 0 ? (
              visibleData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {effectiveColumns.map((col, colIndex) => (
                    <td key={`${rowIndex}-${colIndex}`}>
                      {formatCellValue(row[col])}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={effectiveColumns.length || 1}>No data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="pagination-controls">
        <button onClick={handlePrevPage} disabled={currentPage === 1}>Previous</button>
        <span>Page {currentPage} of {totalPages || 1}</span>
        <button onClick={handleNextPage} disabled={currentPage === totalPages || totalPages === 0}>Next</button>
      </div>
    </div>
  );
};

export default DataPreview;
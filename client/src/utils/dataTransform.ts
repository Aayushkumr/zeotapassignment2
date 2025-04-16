/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Prepares the data for import by keeping only the selected columns
 * @param data Array of data objects
 * @param columns Array of column names to include
 */
export const prepareDataForImport = (
  data: any[], 
  columnNames: string[]
): any[] => {
  if (!data || !data.length) return [];
  
  return data.map(row => {
    const newRow: Record<string, any> = {};
    // Only include selected columns
    columnNames.forEach(colName => {
      // Convert any null or undefined values to empty strings
      // This helps avoid JSON parsing issues
      newRow[colName] = row[colName] === null || row[colName] === undefined ? '' : String(row[colName]);
    });
    return newRow;
  });
};
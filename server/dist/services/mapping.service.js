"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../utils/logger"));
const logger = new logger_1.default('MappingService');
// ClickHouse data type mapping
const clickhouseTypeMapping = {
    // Common data types
    'String': 'String',
    'Int8': 'Int8',
    'Int16': 'Int16',
    'Int32': 'Int32',
    'Int64': 'Int64',
    'UInt8': 'UInt8',
    'UInt16': 'UInt16',
    'UInt32': 'UInt32',
    'UInt64': 'UInt64',
    'Float32': 'Float32',
    'Float64': 'Float64',
    'Decimal': 'Decimal(10, 2)',
    'Date': 'Date',
    'DateTime': 'DateTime',
    'Boolean': 'UInt8'
};
// Infer ClickHouse data type from JavaScript value
const inferClickHouseType = (value) => {
    if (value === null || value === undefined) {
        return 'Nullable(String)';
    }
    if (typeof value === 'boolean') {
        return 'UInt8'; // ClickHouse has no Boolean type, UInt8 is used
    }
    if (typeof value === 'number') {
        // Check if integer
        if (Number.isInteger(value)) {
            if (value >= 0) {
                if (value < 256)
                    return 'UInt8';
                if (value < 65536)
                    return 'UInt16';
                if (value < 4294967296)
                    return 'UInt32';
                return 'UInt64';
            }
            else {
                if (value >= -128 && value <= 127)
                    return 'Int8';
                if (value >= -32768 && value <= 32767)
                    return 'Int16';
                if (value >= -2147483648 && value <= 2147483647)
                    return 'Int32';
                return 'Int64';
            }
        }
        else {
            return 'Float64';
        }
    }
    if (typeof value === 'string') {
        // Try to parse as date
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        const dateTimePattern = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/;
        if (datePattern.test(value)) {
            return 'Date';
        }
        if (dateTimePattern.test(value)) {
            return 'DateTime';
        }
        return 'String';
    }
    return 'String'; // Default
};
class MappingService {
    inferSchemaFromData(data) {
        if (!data.length) {
            return [];
        }
        const sampleRow = data[0];
        const columns = Object.keys(sampleRow);
        return columns.map(column => {
            // Find first non-null value to determine type
            let sampleValue = null;
            for (const row of data) {
                if (row[column] !== null && row[column] !== undefined && row[column] !== '') {
                    sampleValue = row[column];
                    break;
                }
            }
            return {
                name: column,
                type: inferClickHouseType(sampleValue)
            };
        });
    }
    mapDataToSelectedColumns(data, selectedColumns) {
        return data.map(row => {
            const filteredRow = {};
            selectedColumns.forEach(column => {
                filteredRow[column] = row[column];
            });
            return filteredRow;
        });
    }
}
exports.default = new MappingService();

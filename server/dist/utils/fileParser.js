"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectSchema = exports.parseFile = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const path_1 = __importDefault(require("path"));
// Parse CSV/TSV/flat files
const parseFile = (filePath, options = { delimiter: ',', headers: true }) => {
    const results = [];
    const maxRows = options.maxRows || Infinity;
    return new Promise((resolve, reject) => {
        // Determine the delimiter from file extension if not provided
        let delimiter = options.delimiter;
        if (!delimiter) {
            const ext = path_1.default.extname(filePath).toLowerCase();
            if (ext === '.tsv')
                delimiter = '\t';
            else if (ext === '.csv')
                delimiter = ',';
            else
                delimiter = ','; // Default to comma for other files
        }
        fs_extra_1.default.createReadStream(filePath)
            .pipe((0, csv_parser_1.default)({
            separator: delimiter,
            headers: options.headers === false ? undefined : options.headers,
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
exports.parseFile = parseFile;
// Detect file schema
const detectSchema = async (filePath, options = { delimiter: ',', headers: true, maxRows: 100 }) => {
    const sampleData = await (0, exports.parseFile)(filePath, { ...options, maxRows: options.maxRows || 100 });
    // Extract column names
    let columnNames = [];
    if (sampleData.length > 0) {
        columnNames = Object.keys(sampleData[0]);
    }
    return { columnNames, sampleData };
};
exports.detectSchema = detectSchema;
exports.default = {
    parseFile: exports.parseFile,
    detectSchema: exports.detectSchema
};

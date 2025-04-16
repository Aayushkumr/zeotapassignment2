/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useRef } from 'react';
import { uploadFile } from '../services/apiClient';
import './FileUploader.css';

interface FileUploaderProps {
  onFileUploaded: (filePath: string, fileName: string) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileUploaded }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setLoading(true);
    setError(null);
    setUploadProgress(0);
    
    try {
      const response = await uploadFile(selectedFile);
      
      if (response.data.success) {
        const { filePath, fileName } = response.data.data;
        onFileUploaded(filePath, fileName);
      } else {
        setError('Upload failed: ' + response.data.message);
      }
    } catch (err: any) {
      setError(`Upload error: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="file-uploader">
      <div 
        className="drop-area"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleUploadClick}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange} 
          accept=".csv,.tsv,.txt,.dat"
          style={{ display: 'none' }}
        />
        
        {selectedFile ? (
          <div className="selected-file">
            <span className="file-name">{selectedFile.name}</span>
            <span className="file-size">({(selectedFile.size / 1024).toFixed(2)} KB)</span>
          </div>
        ) : (
          <div className="upload-message">
            <div className="upload-icon">📁</div>
            <p>Drag & Drop your file here or click to browse</p>
            <p className="file-types">Supported file types: CSV, TSV, TXT, DAT</p>
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading && (
        <div className="progress-bar">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
      )}

      <button 
        className="upload-button"
        onClick={handleUpload}
        disabled={!selectedFile || loading}
      >
        {loading ? 'Uploading...' : 'Upload File'}
      </button>
    </div>
  );
};

export default FileUploader;
import React, { useState, useCallback } from 'react';
import { FiUpload, FiFileText, FiAlertCircle, FiCheckCircle, FiDownload, FiX } from 'react-icons/fi';
import { getToken } from '../../lib/api';

export default function BulkImportUploader({ onImportSuccess, onCancel, tenantId, userRole }) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationState, setValidationState] = useState(null); // null, 'validating', 'success', 'error', 'warning'
  const [validationResults, setValidationResults] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelection(droppedFile);
    }
  }, []);

  const handleFileSelection = (selectedFile) => {
    // Validate file type
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (ext !== 'xlsx' && ext !== 'csv') {
      setValidationState('error');
      setValidationResults({
        errors: ['Invalid file format. Only .xlsx and .csv files are supported.']
      });
      return;
    }

    // Validate file size (10 MB limit)
    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (selectedFile.size > maxSize) {
      setValidationState('error');
      setValidationResults({
        errors: [`File size (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB) exceeds maximum allowed size of 10 MB.`]
      });
      return;
    }

    setFile(selectedFile);
    setValidationState('validating');
    setUploadProgress(0);

    // Validate file with backend API
    validateWithAPI(selectedFile);
  };

  const validateWithAPI = async (selectedFile) => {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }

      const formData = new FormData();
      formData.append('file', selectedFile);

      const apiPrefix = userRole === 'org' ? 'org' : 'contrib';
      const response = await fetch(`/api/${apiPrefix}/bulk-import/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Validation failed');
      }

      // Set upload progress to 100%
      setUploadProgress(100);

      // Transform API response to match component's expected format
      const transformedResults = {
        rowCount: result.rowCount || 0,
        requiredColumns: result.requiredColumns || 3,
        parameterColumns: result.parameterColumns || 0,
        parameters: result.parameters || [],
        warnings: result.warnings || [],
        errors: result.errors || []
      };

      setValidationResults(transformedResults);

      if (transformedResults.errors.length > 0) {
        setValidationState('error');
      } else if (transformedResults.warnings.length > 0) {
        setValidationState('warning');
      } else {
        setValidationState('success');
      }
    } catch (error) {
      console.error('Validation error:', error);
      setValidationState('error');
      setValidationResults({
        errors: [error.message || 'Failed to validate file'],
        warnings: [],
        parameters: [],
        rowCount: 0
      });
      setUploadProgress(0);
    }
  };

  const handleFileInputChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFileSelection(selectedFile);
    }
  };

  const handleConfirmImport = () => {
    if (onImportSuccess && validationResults) {
      // Convert validation results to the format expected by the wizard
      const parameters = validationResults.parameters || [];
      onImportSuccess(parameters);
    }
  };

  const handleReset = () => {
    setFile(null);
    setValidationState(null);
    setValidationResults(null);
    setUploadProgress(0);
  };

  const downloadErrorLog = async () => {
    if (!validationResults || (!validationResults.errors.length && !validationResults.warnings.length)) {
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        console.error('No authentication token available');
        throw new Error('Authentication required');
      }

      const apiPrefix = userRole === 'org' ? 'org' : 'contrib';
      const allIssues = [...validationResults.errors, ...validationResults.warnings];
      
      const response = await fetch(`/api/${apiPrefix}/bulk-import/error-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ errors: allIssues })
      });

      if (!response.ok) {
        throw new Error('Failed to generate error log');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `validation_errors_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error log download failed:', error);
      // Fallback to client-side CSV generation if API fails
      const csvHeader = 'Row,Column,Type,Message\n';
      const csvContent = [...validationResults.errors, ...validationResults.warnings].map(issue => {
        const type = validationResults.errors.includes(issue) ? 'Error' : 'Warning';
        return `${issue.row || '—'},${issue.column || '—'},${type},"${(issue.message || '').replace(/"/g, '""')}"`;
      }).join('\n');

      const blob = new Blob([csvHeader + csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `validation_errors_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };

  const formatDepth = (d) => {
    const n = Number(d);
    if (!Number.isFinite(n)) return d ?? '—';
    return n === 0 ? 'Surface' : `${d} m`;
  };

  // Initial upload interface
  if (!file) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{
          padding: 32,
          background: '#f8fafc',
          border: isDragging ? '2px dashed #3b82f6' : '2px dashed #cbd5e1',
          borderRadius: 12,
          textAlign: 'center',
          transition: 'all 0.2s ease'
        }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div style={{
            width: 64,
            height: 64,
            margin: '0 auto 16px',
            borderRadius: '50%',
            background: '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3b82f6',
            fontSize: 28
          }}>
            <FiUpload />
          </div>
          <h3 style={{ margin: 0, marginBottom: 8, fontSize: 18, fontWeight: 600 }}>
            Upload Filled Template
          </h3>
          <p style={{ margin: 0, marginBottom: 20, fontSize: 14, color: '#64748b' }}>
            Select your completed template file (.xlsx or .csv)
          </p>
          
          <label style={{ cursor: 'pointer' }}>
            <input
              type="file"
              accept=".xlsx,.csv"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
            <span className="pill-btn primary">
              <FiFileText /> Choose File
            </span>
          </label>
          
          <p style={{ marginTop: 16, fontSize: 13, color: '#94a3b8' }}>
            or drag and drop here
          </p>
          <p style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
            Maximum file size: 10 MB • Supported formats: .xlsx, .csv
          </p>
        </div>

        <div style={{
          marginTop: 16,
          padding: 12,
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 8,
          fontSize: 13,
          color: '#1e40af',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8
        }}>
          <FiAlertCircle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
          <span>
            Need the template? Download it from the Overview page or{' '}
            <a href="#" style={{ color: '#1e40af', fontWeight: 600 }}>click here</a>.
          </span>
        </div>
      </div>
    );
  }

  // File uploaded - showing validation status
  return (
    <div style={{ padding: 20 }}>
      {/* File info */}
      <div style={{
        padding: 16,
        background: '#f1f5f9',
        border: '1px solid #cbd5e1',
        borderRadius: 8,
        marginBottom: 20
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FiFileText size={24} color="#64748b" />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{file.name}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {(file.size / 1024).toFixed(2)} KB • Modified: {new Date(file.lastModified).toLocaleDateString()}
              </div>
            </div>
          </div>
          <button
            className="pill-btn ghost"
            onClick={handleReset}
            style={{ padding: '6px 12px' }}
          >
            <FiX /> Remove
          </button>
        </div>
      </div>

      {/* Validation progress */}
      {validationState === 'validating' && (
        <div style={{
          padding: 20,
          background: '#fefce8',
          border: '1px solid #fde047',
          borderRadius: 8,
          marginBottom: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div className="spinner" style={{ width: 20, height: 20 }} />
            <span style={{ fontWeight: 600, fontSize: 15 }}>Validating...</span>
          </div>
          <div style={{
            width: '100%',
            height: 8,
            background: '#fef9c3',
            borderRadius: 999,
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${uploadProgress}%`,
              height: '100%',
              background: '#eab308',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: '#854d0e' }}>
            {uploadProgress}% complete
          </div>
        </div>
      )}

      {/* Validation success */}
      {validationState === 'success' && validationResults && (
        <div style={{
          padding: 20,
          background: '#ecfdf5',
          border: '1px solid #10b981',
          borderRadius: 8,
          marginBottom: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <FiCheckCircle size={24} color="#10b981" />
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, color: '#059669' }}>
                Validation complete
              </div>
              <div style={{ fontSize: 14, color: '#047857', marginTop: 4 }}>
                {validationResults.rowCount} parameter rows ready to import
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: '#047857' }}>
              Preview (first 5 rows):
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                fontSize: 13,
                borderCollapse: 'collapse'
              }}>
                <thead>
                  <tr style={{ background: '#d1fae5', borderBottom: '2px solid #10b981' }}>
                    <th style={{ padding: 8, textAlign: 'left', color: '#047857' }}>Parameter</th>
                    <th style={{ padding: 8, textAlign: 'right', color: '#047857' }}>Value</th>
                    <th style={{ padding: 8, textAlign: 'left', color: '#047857' }}>Unit</th>
                    <th style={{ padding: 8, textAlign: 'left', color: '#047857' }}>Depth</th>
                  </tr>
                </thead>
                <tbody>
                  {validationResults.parameters.slice(0, 5).map((param, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #a7f3d0' }}>
                      <td style={{ padding: 8 }}>{param.parameter}</td>
                      <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>{param.value}</td>
                      <td style={{ padding: 8 }}>{param.unit}</td>
                      <td style={{ padding: 8 }}>{formatDepth(param.depth_m)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ fontSize: 13, color: '#047857', marginBottom: 16 }}>
            These parameters will populate your test when you continue. 
            You can still edit them before final submission.
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="pill-btn primary" onClick={handleConfirmImport}>
              <FiCheckCircle /> Use These Parameters
            </button>
            <button className="pill-btn ghost" onClick={handleReset}>
              Cancel & Re-upload
            </button>
          </div>
        </div>
      )}

      {/* Validation error */}
      {validationState === 'error' && validationResults && (
        <div style={{
          padding: 20,
          background: '#fef2f2',
          border: '1px solid #ef4444',
          borderRadius: 8,
          marginBottom: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <FiAlertCircle size={24} color="#ef4444" />
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, color: '#dc2626' }}>
                Validation failed: {validationResults.errors?.length || 0} errors detected
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: '#dc2626' }}>
              Errors:
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#991b1b' }}>
              {validationResults.errors?.map((error, idx) => (
                <li key={idx} style={{ marginBottom: 4 }}>
                  {typeof error === 'string' ? error : `Row ${error.row}, ${error.column}: ${error.description}`}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ fontSize: 13, color: '#991b1b', marginBottom: 16 }}>
            Import cannot proceed. Download the error log for details.
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="pill-btn danger" onClick={downloadErrorLog}>
              <FiDownload /> Download Error Log CSV
            </button>
            <button className="pill-btn ghost" onClick={handleReset}>
              Upload Corrected File
            </button>
            {onCancel && (
              <button className="pill-btn ghost" onClick={onCancel}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

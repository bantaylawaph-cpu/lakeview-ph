import React, { useState, useCallback, useEffect } from 'react';
import { FiUploadCloud, FiX, FiAlertCircle, FiCheckCircle, FiDownload } from 'react-icons/fi';
import { getToken } from '../../lib/api';

export default function BulkDatasetUploader({ 
  userRole = 'org',
  tenantId,
  onUploadSuccess 
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [error, setError] = useState(null);

  // Debugging
  console.log('BulkDatasetUploader - Props:', { userRole, tenantId, onUploadSuccess: !!onUploadSuccess });

  // API base URL based on role
  // Note: bulk-dataset routes don't use tenant ID in URL (they extract it from the file)
  const apiBase = userRole === 'org' ? `/api/org` : `/api/contrib`;
  
  console.log('BulkDatasetUploader - API Base:', apiBase);

  // Automatically validate when file is selected
  useEffect(() => {
    if (selectedFile && !validationResults) {
      handleValidate();
    }
  }, [selectedFile]);

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Handle drag and drop
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
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, []);

  // Process file
  const processFile = (file) => {
    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv'
    ];

    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit.');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setValidationResults(null);
  };

  // Remove selected file
  const removeFile = () => {
    setSelectedFile(null);
    setValidationResults(null);
    setError(null);
  };

  // Validate file
  const handleValidate = async () => {
    if (!selectedFile) return;

    console.log('Starting validation...', {
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      apiBase,
      tenantId,
      userRole
    });

    setIsValidating(true);
    setError(null);
    setValidationResults(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const token = getToken();
      const url = `${apiBase}/bulk-dataset/validate`;
      
      console.log('Validation request:', {
        url,
        method: 'POST',
        hasToken: !!token,
        hasFile: !!selectedFile
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      console.log('Validation response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Validation failed' }));
        console.error('Validation error:', errorData);
        throw new Error(errorData.message || 'Validation failed');
      }

      const result = await response.json();
      console.log('Validation result:', result);
      setValidationResults(result);

      // Don't auto-import, just show results
    } catch (err) {
      console.error('Validation exception:', err);
      setError(err.message || 'Failed to validate file');
    } finally {
      setIsValidating(false);
    }
  };

  // Import file after validation
  const handleImport = async () => {
    if (!selectedFile || !validationResults?.valid) return;

    setIsImporting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const token = getToken();
      const response = await fetch(`${apiBase}/bulk-dataset/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Import failed' }));
        throw new Error(errorData.message || 'Import failed');
      }

      const result = await response.json();
      
      // Call success callback
      if (onUploadSuccess) {
        onUploadSuccess(result);
      }
    } catch (err) {
      setError(err.message || 'Failed to import file');
    } finally {
      setIsImporting(false);
    }
  };

  // Download error log
  const handleDownloadErrorLog = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${apiBase}/bulk-dataset/error-log`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errors: validationResults.errors,
          warnings: validationResults.warnings,
        })
      });

      if (!response.ok) {
        throw new Error('Failed to download error log');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `validation_errors_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message || 'Failed to download error log');
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <FiUploadCloud className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <div className="text-sm text-gray-600 mb-2">
          Drag and drop your file here, or{' '}
          <label className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
            browse
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
            />
          </label>
        </div>
        <p className="text-xs text-gray-500">
          Supports Excel (.xlsx, .xls) and CSV (.csv) files up to 10MB
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <FiAlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Selected File */}
      {selectedFile && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                <FiUploadCloud className="h-8 w-8 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Remove file"
            >
              <FiX className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Validate Button */}
          {!validationResults && (
            <button
              onClick={handleValidate}
              disabled={isValidating}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {isValidating ? 'Validating...' : 'Validate File'}
            </button>
          )}
        </div>
      )}

      {/* Validation Results */}
      {validationResults && (
        <div className="space-y-4">
          {/* Summary */}
          <div className={`border rounded-lg p-4 ${
            validationResults.valid 
              ? 'bg-green-50 border-green-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-start gap-3">
              {validationResults.valid ? (
                <FiCheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <FiAlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className={`text-sm font-semibold mb-2 ${
                  validationResults.valid ? 'text-green-900' : 'text-yellow-900'
                }`}>
                  {validationResults.valid 
                    ? 'Validation Successful' 
                    : 'Validation Issues Found'}
                </h3>
                <div className="text-sm space-y-1">
                  <p className={validationResults.valid ? 'text-green-800' : 'text-yellow-800'}>
                    <span className="font-medium">Tests Found:</span> {validationResults.testCount || 0}
                  </p>
                  <p className={validationResults.valid ? 'text-green-800' : 'text-yellow-800'}>
                    <span className="font-medium">Total Results:</span> {validationResults.resultCount || 0}
                  </p>
                  {validationResults.errors?.length > 0 && (
                    <p className="text-red-800">
                      <span className="font-medium">Errors:</span> {validationResults.errors.length}
                    </p>
                  )}
                  {validationResults.warnings?.length > 0 && (
                    <p className="text-yellow-800">
                      <span className="font-medium">Warnings:</span> {validationResults.warnings.length}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Errors List */}
          {validationResults.errors?.length > 0 && (
            <div className="bg-white border border-red-200 rounded-lg overflow-hidden">
              <div className="bg-red-50 px-4 py-3 border-b border-red-200 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-red-900">
                  Errors ({validationResults.errors.length})
                </h4>
                <button
                  onClick={handleDownloadErrorLog}
                  className="text-xs text-red-700 hover:text-red-800 flex items-center gap-1"
                >
                  <FiDownload className="h-3 w-3" />
                  Download Error Log
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Column</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {validationResults.errors.map((error, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">{error.row}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{error.column}</td>
                        <td className="px-4 py-2 text-sm text-red-600">{error.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Warnings List */}
          {validationResults.warnings?.length > 0 && (
            <div className="bg-white border border-yellow-200 rounded-lg overflow-hidden">
              <div className="bg-yellow-50 px-4 py-3 border-b border-yellow-200">
                <h4 className="text-sm font-semibold text-yellow-900">
                  Warnings ({validationResults.warnings.length})
                </h4>
              </div>
              <div className="max-h-40 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Column</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Warning</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {validationResults.warnings.map((warning, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">{warning.row}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{warning.column}</td>
                        <td className="px-4 py-2 text-sm text-yellow-600">{warning.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Data Preview (show when validation is successful) */}
          {validationResults.valid && validationResults.tests?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900">
                  Data Preview (First {Math.min(5, validationResults.tests.length)} of {validationResults.tests.length} test{validationResults.tests.length !== 1 ? 's' : ''})
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weather</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sampler</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parameters</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {validationResults.tests.slice(0, 5).map((test, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{test.date}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{test.method}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap capitalize">
                          {test.weather.replace('_', ' ')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{test.sampler}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {test.results?.length > 0 ? (
                            <div className="space-y-0.5">
                              {test.results.slice(0, 3).map((result, idx) => (
                                <div key={idx} className="text-xs">
                                  <span className="font-medium">{result.parameter}:</span> {result.value} {result.unit}
                                </div>
                              ))}
                              {test.results.length > 3 && (
                                <div className="text-xs text-gray-500 italic">
                                  +{test.results.length - 3} more parameter{test.results.length - 3 !== 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-xs">No parameters</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {validationResults.tests.length > 5 && (
                <div className="bg-gray-50 px-4 py-2 text-center">
                  <p className="text-xs text-gray-600">
                    Showing 5 of {validationResults.tests.length} tests. All data will be imported.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={removeFile}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Upload Different File
            </button>
            {validationResults.valid && (
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                {isImporting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Importing...
                  </>
                ) : (
                  `Import ${validationResults.testCount} Test${validationResults.testCount !== 1 ? 's' : ''}`
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiDownload, FiUpload } from 'react-icons/fi';
import BulkDatasetUploader from '../../components/water-quality-test/BulkDatasetUploader';
import BulkDatasetDownloadModal from '../../components/water-quality-test/BulkDatasetDownloadModal';
import { alertSuccess } from '../../lib/alerts';
import { me as fetchMe } from '../../lib/api';

export default function ContribBulkDatasetImport() {
  const navigate = useNavigate();
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [tenantId, setTenantId] = useState(null);

  // Fetch user data to get tenant ID
  useEffect(() => {
    fetchMe().then(user => {
      if (user && user.tenant_id) {
        setTenantId(user.tenant_id);
      }
    }).catch(err => {
      console.error('Failed to fetch user data:', err);
    });
  }, []);

  const handleImportSuccess = (result) => {
    alertSuccess(
      'Import Successful',
      `Successfully imported ${result.testCount || 0} tests with ${result.resultCount || 0} total results.`
    );
    
    // Redirect to tests page after successful import
    setTimeout(() => {
      navigate('/contrib-dashboard/wq-tests');
    }, 2000);
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#111827' }}>
            Bulk Dataset Import
          </h1>
          <button
            onClick={() => setShowDownloadModal(true)}
            className="pill-btn primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <FiDownload />
            Download Template
          </button>
        </div>
        
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>
          Upload your completed Excel template to import multiple water quality tests with full metadata
        </p>
      </div>

      {/* Instructions */}
      <div style={{
        background: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24
      }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: '#0c4a6e' }}>
          How to Import
        </h3>
        <ol style={{ margin: 0, paddingLeft: 20, color: '#0c4a6e', fontSize: 14, lineHeight: 1.8 }}>
          <li>Click "Download Template" to get the Excel template for a specific lake and station</li>
          <li>Fill in the template with your water quality test data (date, time, parameters, etc.)</li>
          <li>Upload the completed Excel file using the form below</li>
          <li>Review validation results and fix any errors if needed</li>
          <li>Import validated data into the system</li>
        </ol>
      </div>

      {/* Upload Section */}
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 32
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FiUpload style={{ color: '#3b82f6', fontSize: 20 }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111827' }}>
              Upload Dataset File
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
              Select your completed Excel template to begin validation
            </p>
          </div>
        </div>

        <BulkDatasetUploader
          userRole="contrib"
          tenantId={tenantId}
          onUploadSuccess={handleImportSuccess}
        />
      </div>

      {/* Download Modal */}
      <BulkDatasetDownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        userRole="contrib"
      />
    </div>
  );
}

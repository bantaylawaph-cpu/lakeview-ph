import React, { useState } from 'react';
import Modal from '../Modal';
import { FiFileText, FiDatabase } from 'react-icons/fi';
import BulkDatasetDownloadModal from './BulkDatasetDownloadModal';
import { getToken } from '../../lib/api';

export default function ImportChoiceModal({ isOpen, onClose, userRole, tenantId }) {
  const [showDatasetModal, setShowDatasetModal] = useState(false);

  const handleSingleTest = async () => {
    try {
      const token = getToken();
      const apiPrefix = userRole === 'org' ? 'org' : 'contrib';
      const url = `/api/${apiPrefix}/bulk-import/template?format=xlsx`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'LakeView_WQT_Import_Template.xlsx';
      if (contentDisposition) {
        const matches = /filename="?(.+)"?/i.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      // Download the file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      
      onClose();
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download template. Please try again.');
    }
  };

  const handleBulkDataset = () => {
    setShowDatasetModal(true);
  };

  const handleDatasetModalClose = () => {
    setShowDatasetModal(false);
    // Don't close parent modal - just close the dataset modal
  };

  return (
    <>
      <Modal
        open={isOpen}
        onClose={onClose}
        title="Choose Import Type"
        width={600}
        closeOnEsc={!showDatasetModal}
        overlayZIndex={10000}
      >
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-6">
            Select the type of data you want to import:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Single Test Import */}
            <button
              onClick={handleSingleTest}
              className="group relative bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all duration-200 text-left"
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-3 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
                  <FiFileText className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Single Test</h3>
                  <p className="text-xs text-gray-500">
                    Download Excel template for importing water quality test parameters
                  </p>
                </div>
              </div>
              <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-10 rounded-lg transition-opacity"></div>
            </button>

            {/* Bulk Dataset Import */}
            <button
              onClick={handleBulkDataset}
              className="group relative bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-green-500 hover:shadow-md transition-all duration-200 text-left"
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-3 bg-green-50 rounded-full group-hover:bg-green-100 transition-colors">
                  <FiDatabase className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Bulk Dataset</h3>
                  <p className="text-xs text-gray-500">
                    Download Excel template for importing multiple tests with full metadata
                  </p>
                </div>
              </div>
              <div className="absolute inset-0 bg-green-50 opacity-0 group-hover:opacity-10 rounded-lg transition-opacity"></div>
            </button>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Need help choosing?</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <strong>Single Test:</strong> For importing parameters into a single water quality test</li>
              <li>• <strong>Bulk Dataset:</strong> For importing many complete tests at once with metadata</li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* Bulk Dataset Download Modal */}
      <BulkDatasetDownloadModal
        isOpen={showDatasetModal}
        onClose={handleDatasetModalClose}
        userRole={userRole}
        tenantId={tenantId}
      />
    </>
  );
}

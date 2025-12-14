import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import { FiDownload, FiAlertCircle, FiPlus } from 'react-icons/fi';
import { getToken } from '../../lib/api';
import StationModal from '../modals/StationModal';

export default function BulkDatasetDownloadModal({ isOpen, onClose, userRole = 'org', tenantId }) {
  const [lakes, setLakes] = useState([]);
  const [stations, setStations] = useState([]);
  const [selectedLake, setSelectedLake] = useState('');
  const [selectedStation, setSelectedStation] = useState('');
  const [format, setFormat] = useState('xlsx');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stationModalOpen, setStationModalOpen] = useState(false);

  // Fetch lakes on mount
  useEffect(() => {
    if (isOpen) {
      fetchLakes();
    }
  }, [isOpen]);

  // Fetch stations when lake changes
  useEffect(() => {
    if (selectedLake) {
      fetchStations(selectedLake);
    } else {
      setStations([]);
      setSelectedStation('');
    }
  }, [selectedLake]);

  const fetchLakes = async () => {
    try {
      const token = getToken();
      const response = await fetch('/api/public/lakes?per_page=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setLakes(data.data || []); // Paginated response has 'data' key
    } catch (err) {
      console.error('Failed to fetch lakes:', err);
      setError('Failed to load lakes');
    }
  };

  const fetchStations = async (lakeId) => {
    try {
      const token = getToken();
      const response = await fetch(`/api/admin/stations?lake_id=${lakeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setStations(data.data || []);
    } catch (err) {
      console.error('Failed to fetch stations:', err);
      setError('Failed to load stations');
    }
  };

  const handleDownload = async () => {
    if (!selectedLake || !selectedStation) {
      setError('Please select both lake and station');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = getToken();
      const apiPrefix = userRole === 'org' ? 'org' : 'contrib';
      const url = `/api/${apiPrefix}/bulk-dataset/template?lake_id=${selectedLake}&station_id=${selectedStation}&format=${format}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv, application/octet-stream'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `LakeView_Dataset_${format === 'xlsx' ? 'Template.xlsx' : 'Template.csv'}`;
      if (contentDisposition) {
        const matches = /filename="?(.+)"?/i.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      // Download the file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      // Navigate to upload page after successful download
      if (tenantId) {
        const baseUrl = userRole === 'org' ? `/org-dashboard` : `/contrib-dashboard`;
        setTimeout(() => {
          window.location.href = `${baseUrl}/bulk-dataset-import`;
        }, 500);
      }

      // Close modal on success
      setTimeout(() => {
        onClose();
        resetForm();
      }, 500);
    } catch (err) {
      console.error('Download error:', err);
      setError(err.message || 'Failed to download template');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedLake('');
    setSelectedStation('');
    setFormat('xlsx');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleStationCreated = (newStation) => {
    // Refresh stations list and select the new station
    fetchStations(selectedLake);
    setSelectedStation(newStation.id);
    setStationModalOpen(false);
  };

  const selectedLakeData = lakes.find(l => l.id == selectedLake);
  const selectedStationData = stations.find(s => s.id == selectedStation);

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title="Download Full Dataset Template"
      width={500}
      overlayZIndex={10100}
    >
      <div style={{ padding: 24 }}>
        {error && (
            <div style={{
              padding: 12,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#991b1b',
              fontSize: 13
            }}>
              <FiAlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Lake Selection */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 500,
              color: '#374151',
              marginBottom: 8
            }}>
              Lake <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={selectedLake}
              onChange={(e) => setSelectedLake(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                fontSize: 14,
                color: '#111827',
                background: 'white'
              }}
            >
              <option value="">Select a lake...</option>
              {lakes.map((lake) => (
                <option key={lake.id} value={lake.id}>
                  {lake.name}
                </option>
              ))}
            </select>
          </div>

          {/* Station Selection */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 500,
              color: '#374151',
              marginBottom: 8
            }}>
              Station <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
                disabled={!selectedLake}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 14,
                  color: '#111827',
                  background: selectedLake ? 'white' : '#f9fafb',
                  cursor: selectedLake ? 'pointer' : 'not-allowed'
                }}
              >
                <option value="">
                  {selectedLake ? 'Select a station...' : 'Select a lake first...'}
                </option>
                {stations.map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name || station.code}
                  </option>
                ))}
              </select>
              {userRole === 'org' && (
                <button
                  onClick={() => setStationModalOpen(true)}
                  disabled={!selectedLake}
                  style={{
                    padding: '10px 16px',
                    border: '1px solid #3b82f6',
                    borderRadius: 8,
                    background: selectedLake ? '#3b82f6' : '#d1d5db',
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: selectedLake ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s'
                  }}
                  title="Add new station"
                >
                  <FiPlus size={16} />
                  Add
                </button>
              )}
            </div>
          </div>

          {/* Format Info */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              padding: 12,
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: 8,
              fontSize: 13,
              color: '#166534'
            }}>
              Template will be downloaded in Excel (.xlsx) format
            </div>
          </div>

          {/* Selection Summary */}
          {selectedLake && selectedStation && (
            <div style={{
              padding: 12,
              background: '#f0f9ff',
              border: '1px solid #bfdbfe',
              borderRadius: 8,
              marginBottom: 20,
              fontSize: 13,
              color: '#1e40af'
            }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Template will be generated for:</div>
              <div>Lake: <strong>{selectedLakeData?.name}</strong></div>
              <div>Station: <strong>{selectedStationData?.name || selectedStationData?.code}</strong></div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: 12,
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleClose}
            disabled={loading}
            className="pill-btn ghost"
            style={{ minWidth: 100 }}
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={!selectedLake || !selectedStation || loading}
            className="pill-btn primary"
            style={{ minWidth: 140 }}
          >
            <FiDownload />
            {loading ? 'Downloading...' : 'Download Template'}
          </button>
        </div>

        {/* Station Creation Modal */}
        <StationModal
          open={stationModalOpen}
          onClose={() => setStationModalOpen(false)}
          onSuccess={handleStationCreated}
          preselectedLakeId={selectedLake}
        />
    </Modal>
  );
}

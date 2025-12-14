import React, { useState, useEffect } from 'react';
import { FiDownload, FiCheckCircle } from 'react-icons/fi';
import Modal from '../Modal';

export default function TemplateDownloadModal({ open, onClose, onDownload, format = 'xlsx' }) {
  const [countdown, setCountdown] = useState(5);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (!open) {
      setCountdown(5);
      setAcknowledged(false);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open]);

  const handleDownload = () => {
    setAcknowledged(true);
    if (onDownload) {
      onDownload(format);
    }
    setTimeout(() => {
      onClose();
    }, 500);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Before You Download"
      width={700}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <button className="pill-btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="pill-btn primary"
            onClick={handleDownload}
            disabled={countdown > 0}
            style={{ minWidth: 200 }}
          >
            <FiDownload />
            {countdown > 0 ? `Please wait (${countdown}s)` : `I Understand, Download Template`}
          </button>
        </div>
      }
    >
      <div style={{ padding: '4px 0' }}>
        <p style={{ marginBottom: 24, fontSize: 15, color: '#64748b' }}>
          Please review these important steps before downloading the bulk import template:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Step 1 */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{
              minWidth: 32,
              height: 32,
              borderRadius: '50%',
              background: '#eff6ff',
              border: '2px solid #3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: '#3b82f6',
              fontSize: 14
            }}>1</div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                Verify Your Locations
              </h3>
              <p style={{ margin: 0, fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
                Ensure all Sampling Location IDs in your dataset already exist in the system. 
                Unknown location IDs will cause import failure. Navigate to <strong>Settings → Locations</strong> to 
                review your organization's registered sampling sites.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{
              minWidth: 32,
              height: 32,
              borderRadius: '50%',
              background: '#eff6ff',
              border: '2px solid #3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: '#3b82f6',
              fontSize: 14
            }}>2</div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                Check Parameter Configuration
              </h3>
              <p style={{ margin: 0, fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
                Confirm that all water quality parameters you plan to import are configured for your organization. 
                The template will only include parameters currently enabled in <strong>Settings → Parameters</strong>. 
                Add any missing parameters before downloading the template.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{
              minWidth: 32,
              height: 32,
              borderRadius: '50%',
              background: '#eff6ff',
              border: '2px solid #3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: '#3b82f6',
              fontSize: 14
            }}>3</div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                Prepare Clean Data
              </h3>
              <p style={{ margin: 0, fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
                Format all dates as <code>YYYY-MM-DD</code>. Use numeric values only for measurements (no units in cells). 
                Leave optional fields blank rather than using "N/A" or placeholder text. 
                Remove any merged cells, formatting, or formulas.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{
              minWidth: 32,
              height: 32,
              borderRadius: '50%',
              background: '#eff6ff',
              border: '2px solid #3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: '#3b82f6',
              fontSize: 14
            }}>4</div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                Review Data Limits
              </h3>
              <p style={{ margin: 0, fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
                Maximum records per import: <strong>5,000 rows</strong>. File size limit: <strong>10 MB</strong>. 
                For larger datasets, split into multiple batches. Each import populates one sampling event with 
                multiple parameters.
              </p>
            </div>
          </div>
        </div>

        {acknowledged && (
          <div style={{
            marginTop: 20,
            padding: 12,
            background: '#ecfdf5',
            border: '1px solid #10b981',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#059669'
          }}>
            <FiCheckCircle size={18} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>Template download started!</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

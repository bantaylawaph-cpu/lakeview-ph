import React from 'react';
import Modal from '../Modal';

// Status pill uses feedback-status classes from feedback.css
function StatusPill({ status }) {
  const labelMap = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', wont_fix: "Won't Fix" };
  return <span className={`feedback-status ${status}`}>{labelMap[status] || status}</span>;
}

export default function UserFeedbackDetailModal({ open, onClose, feedback, onCloseAll, overlayZIndex }) {
  if (!feedback) return null;

  const handleLakeClick = (lakeId, lake) => {
    if (!lakeId) return;
    
    // Close all modals (detail modal and parent feedback modal)
    if (onCloseAll) {
      onCloseAll();
    } else {
      onClose();
    }
    
    // Dispatch custom event to map to navigate to lake
    window.dispatchEvent(new CustomEvent('lv-navigate-to-lake', { 
      detail: { 
        lakeId, 
        latitude: lake?.latitude, 
        longitude: lake?.longitude,
        name: lake?.name 
      } 
    }));
  };

  const categoryLabels = {
    bug: 'Bug',
    suggestion: 'Suggestion',
    data: 'Data',
    ui: 'UI/UX',
    org_petition: 'Organization Petition',
    other: 'Other'
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Feedback Details"
      width={600}
      ariaLabel="Feedback details dialog"
      cardClassName="auth-card"
      bodyClassName="content-page modern-scrollbar"
      overlayZIndex={overlayZIndex}
    >
      <div style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '24px', borderRadius: '12px' }}>
        <div style={{ display: 'grid', gap: 20 }}>
        {/* Title */}
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: '#ffffff' }}>Title</label>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#ffffff' }}>{feedback.title}</div>
        </div>

        {/* Category and Status in same row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: '#ffffff' }}>Category</label>
            <span className="feedback-category-badge">
              {categoryLabels[feedback.category] || feedback.category || 'Other'}
            </span>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: '#ffffff' }}>Status</label>
            <StatusPill status={feedback.status} />
          </div>
        </div>

        {/* Lake */}
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: '#ffffff' }}>Context</label>
          {feedback.lake_id && feedback.lake ? (
            <div>
              <span style={{ marginRight: 6, color: '#ffffff' }}>Lake:</span>
              <button
                onClick={() => handleLakeClick(feedback.lake_id, feedback.lake)}
                className="pill-btn ghost sm"
                style={{ 
                  padding: '4px 12px',
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: 'underline'
                }}
              >
                {feedback.lake.name}
              </button>
            </div>
          ) : (
            <div className="muted">System-wide feedback</div>
          )}
        </div>

        {/* Message */}
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: '#ffffff' }}>Message</label>
          <div 
            className="insight-card" 
            style={{ 
              whiteSpace: 'pre-wrap', 
              fontSize: 14, 
              lineHeight: 1.6,
              padding: 12,
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff'
            }}
          >
            {feedback.message}
          </div>
        </div>

        {/* Images/Attachments */}
        {feedback.images && Array.isArray(feedback.images) && feedback.images.length > 0 && (
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: '#ffffff' }}>Attachments</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {feedback.images.map((imgUrl, idx) => (
                <a 
                  key={idx} 
                  href={imgUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="insight-card"
                  style={{ padding: 4, display: 'block' }}
                  title="Click to open full size"
                >
                  <img 
                    src={imgUrl} 
                    alt={`Attachment ${idx + 1}`} 
                    style={{ 
                      width: 80, 
                      height: 80, 
                      objectFit: 'cover', 
                      borderRadius: 6,
                      cursor: 'pointer'
                    }} 
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Note From Admin */}
        {feedback.admin_response && (
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: '#ffffff' }}>Note From Admin</label>
            <div 
              className="insight-card" 
              style={{ 
                whiteSpace: 'pre-wrap',
                fontSize: 14,
                lineHeight: 1.6,
                padding: 12,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff'
              }}
            >
              {feedback.admin_response}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: '#ffffff' }}>Timestamps</label>
          <div style={{ fontSize: 13, color: '#ffffff' }}>
            <div>Created: {feedback.created_at ? new Date(feedback.created_at).toLocaleString() : '—'}</div>
            {feedback.resolved_at && (
              <div>Resolved: {new Date(feedback.resolved_at).toLocaleString()}</div>
            )}
          </div>
        </div>
      </div>
      </div>
    </Modal>
  );
}

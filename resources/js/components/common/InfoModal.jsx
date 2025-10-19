import React from 'react';
import Modal from '../Modal';

export default function InfoModal({ open, onClose, title = 'About this chart', sections = [], width = 700, notes = null, link = null }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={<span style={{ color: '#fff' }}>{title}</span>}
      ariaLabel="Chart information dialog"
      width={width}
      style={{
        background: 'rgba(30, 60, 120, 0.65)',
        color: '#fff',
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.25)'
      }}
      footerStyle={{ background: 'transparent', borderTop: '1px solid rgba(255,255,255,0.18)', color: '#fff' }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="pill-btn liquid" onClick={onClose}>Close</button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sections.map((s, idx) => (
          <div key={idx}>
            {s.heading && <h5 style={{ margin: '0 0 6px 0', color: '#fff' }}>{s.heading}</h5>}
            {s.text && <p style={{ margin: '0 0 6px 0', color: '#e5e7eb' }}>{s.text}</p>}
            {Array.isArray(s.bullets) && s.bullets.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {s.bullets.map((b, i) => (
                  <li key={i} style={{ color: '#e5e7eb', marginBottom: 4 }}>{b}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {notes && (
          <div>
            <h5 style={{ margin: '0 0 6px 0', color: '#fff' }}>Notes</h5>
            <p style={{ margin: 0, color: '#e5e7eb', whiteSpace: 'pre-wrap' }}>{notes}</p>
          </div>
        )}
        {link && (
          <div>
            <h5 style={{ margin: '6px 0 6px 0', color: '#fff' }}>Source</h5>
            <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: '#93c5fd' }}>{link}</a>
          </div>
        )}
      </div>
    </Modal>
  );
}

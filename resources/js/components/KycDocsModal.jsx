import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import api from '../lib/api';

export default function KycDocsModal({ open, onClose, userId, orgTenantId = null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [docs, setDocs] = useState([]);

  function formatBytes(bytes) {
    const b = Number(bytes || 0);
    if (!b) return '—';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return `${(b / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  }

  useEffect(() => {
    if (!open || !userId) return;
    let alive = true;
    (async () => {
      setLoading(true); setError(null);
      try {
        let res;
        if (orgTenantId) {
          res = await api.get(`/org/${orgTenantId}/users/${userId}/kyc-docs`);
        } else {
          res = await api.get(`/admin/kyc-profiles/user/${userId}`);
        }
        if (!alive) return;
        setProfile(res?.data?.data || null);
        setDocs(Array.isArray(res?.data?.documents) ? res.data.documents : (res?.documents || []));
      } catch (e) {
        if (!alive) return;
        setError('Failed to load KYC documents');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [open, userId, orgTenantId]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={profile ? `KYC Documents — ${profile.full_name || ''}` : 'KYC Documents'}
      width={720}
      footer={<div className="lv-modal-actions"><button type="button" className="pill-btn" onClick={onClose}>Close</button></div>}
    >
      {loading && <div>Loading…</div>}
      {error && <div className="alert error">{String(error)}</div>}
      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {(docs || []).length === 0 && <div className="muted">No documents uploaded.</div>}
          {docs.map(doc => {
            const isImage = (doc.mime || '').startsWith('image/');
            const url = doc.url || (doc.path ? (doc.path.startsWith('/storage') ? doc.path : `/storage/${doc.path}`) : '#');
            return (
              <div key={doc.id} className="kyc-doc-card" style={{
                border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', background: '#fff'
              }}>
                <div style={{ height: 160, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={doc.type} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ color: '#64748b' }}>PDF / File</span>
                  )}
                </div>
                <div style={{ padding: 10, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{(doc.type || '').replace('_', ' ')}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{formatBytes(doc.size_bytes)}</div>
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>{new Date(doc.created_at).toLocaleString()}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a className="pill-btn ghost sm" href={url} target="_blank" rel="noreferrer">Open</a>
                    <a className="pill-btn sm" href={url} download>Download</a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import api from '../lib/api';

/**
 * KycProfileModal
 * Shows Step 2 (Profile details) of the KYC wizard for a given user.
 * Fields: full_name, dob, id_type, id_number, address_line1, city, province, postal_code
 */
export default function KycProfileModal({ open, onClose, userId, orgTenantId = null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    if (!open || !userId) return;
    let alive = true;
    (async () => {
      setLoading(true); setError(null); setProfile(null); setDocs([]);
      try {
        // Org admins should access via org-scoped endpoint; admins via admin endpoint
        let res;
        if (orgTenantId) {
          res = await api.get(`/org/${orgTenantId}/users/${userId}/kyc-docs`);
        } else {
          res = await api.get(`/admin/kyc-profiles/user/${userId}`);
        }
        if (!alive) return;
        // Our API client already returns the parsed JSON (not axios-style),
        // so res is typically { data: <profile|null>, documents: [...] }
        const profileData = res && typeof res === 'object' ? (res.data ?? null) : null;
        const documents = Array.isArray(res?.documents) ? res.documents : (Array.isArray(res?.data?.documents) ? res.data.documents : []);
        setProfile(profileData ?? null);
        setDocs(documents);
      } catch (e) {
        if (!alive) return;
        // For forbidden or restricted, show as unavailable (no error alert)
        const status = e?.response?.status;
        if (status === 403) {
          setProfile(null);
          setDocs([]);
          setError(null);
        } else {
          setError('Failed to load KYC profile');
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [open, userId, orgTenantId]);

  const Field = ({ label, value }) => (
    <div style={{ display: 'grid', gap: 4 }}>
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value ? String(value) : '—'}</div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={profile ? `User Information Profile — ${profile.full_name || ''}` : 'User Information Profile'}
      width={720}
      bodyClassName="modern-scrollbar"
      footer={<div className="lv-modal-actions"><button type="button" className="pill-btn" onClick={onClose}>Close</button></div>}
    >
      {loading && <div>Loading…</div>}
      {error && <div className="alert error">{String(error)}</div>}
      {!loading && !error && (
        profile ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Full Name" value={profile.full_name} />
              <Field label="Date of Birth" value={profile.dob} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="ID Type" value={profile.id_type} />
              <Field label="ID Number" value={profile.id_number} />
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
              <Field label="Address" value={profile.address_line1} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <Field label="City" value={profile.city} />
                <Field label="Province" value={profile.province} />
                <Field label="Postal Code" value={profile.postal_code} />
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Documents</div>
              {(docs || []).length === 0 ? (
                <div className="muted" style={{ fontSize: 13 }}>No documents uploaded.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {docs.map(doc => {
                    const isImage = (doc.mime || '').startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(String(doc.path || ''));
                    const isPdf = /pdf$/i.test(String(doc.mime || '')) || /\.pdf$/i.test(String(doc.path || ''));
                    const url = doc.url || (doc.path ? (String(doc.path).startsWith('/storage') ? doc.path : `/storage/${doc.path}`) : '#');
                    return (
                      <div key={doc.id} className="kyc-doc-card" style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                        <div style={{ height: 140, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isImage ? (
                            // eslint-disable-next-line jsx-a11y/alt-text
                            <img src={url} alt={doc.type} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                          ) : isPdf ? (
                            <span style={{ color: '#64748b' }}>PDF</span>
                          ) : (
                            <span style={{ color: '#64748b' }}>File</span>
                          )}
                        </div>
                        <div style={{ padding: 10, fontSize: 13 }}>
                          <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{String(doc.type || '').replace('_',' ')}</div>
                          <div className="muted" style={{ fontSize: 12, margin: '6px 0 8px' }}>{doc.created_at ? new Date(doc.created_at).toLocaleString() : ''}</div>
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
            </div>
          </div>
        ) : (
          <div className="muted">Information for this User is Unavailable</div>
        )
      )}
    </Modal>
  );
}

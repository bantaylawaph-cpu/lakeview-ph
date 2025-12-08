import React, { useEffect, useState } from 'react';
import Modal from '../../Modal';
import { FiChevronLeft, FiChevronRight, FiExternalLink, FiFileText } from 'react-icons/fi';
import StatusPill from './StatusPill';
import { STATUS_ORDER, STATUS_LABEL } from './feedbackConstants';
import api from '../../../lib/api';
import { invalidateHttpCache } from '../../../lib/httpCache';
import PreviewMap from '../../layers/PreviewMap';

// Modal for viewing & moderating a single feedback item
export default function AdminFeedbackDetailModal({ open, onClose, item, onSave }) {
  const [status, setStatus] = useState(item?.status || 'open');
  const [adminResponse, setAdminResponse] = useState(item?.admin_response || '');
  const [saving, setSaving] = useState(false);
  const [sel, setSel] = useState(0);
  // GeoJSON preview state must be declared before any early returns
  const [geoGeom, setGeoGeom] = useState(null);
  const [geoErr, setGeoErr] = useState('');

  useEffect(() => {
    if (open) {
      setStatus(item?.status || 'open');
      setAdminResponse(item?.admin_response || '');
      setSel(0);
    }
  }, [open, item]);

  // Define helpers and GeoJSON loader effect BEFORE any early returns to keep hook order stable
  const getUrl = (src) => (src && typeof src === 'string' && src.startsWith('http') ? src : `/storage/${src || ''}`);
  const isPdfSrc = (src) => /\.pdf($|\?)/i.test(src || '');
  const isGeoSrc = (src) => /\.(geojson|json)($|\?)/i.test(src || '');

  useEffect(() => {
    setGeoGeom(null); setGeoErr('');
    if (!open || !item) return;
    const imgs = Array.isArray(item.images) ? item.images : [];
    const src = imgs[sel] || '';
    const url = getUrl(src);
    if (!isGeoSrc(src) || !url) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        const json = await res.json();
        const t = json?.type;
        let geom = null;
        if (t === 'FeatureCollection') {
          const feats = Array.isArray(json.features) ? json.features : [];
          if (feats.length === 1 && feats[0]?.geometry) geom = feats[0].geometry; else throw new Error('Invalid GeoJSON');
        } else if (t === 'Feature') {
          if (!json.geometry) throw new Error('Invalid GeoJSON');
          geom = json.geometry;
        } else if (['Point','MultiPoint','LineString','MultiLineString','Polygon','MultiPolygon'].includes(t)) {
          geom = json;
        } else if (t === 'GeometryCollection') {
          const geoms = Array.isArray(json.geometries) ? json.geometries : [];
          if (geoms.length === 1) geom = geoms[0]; else throw new Error('Invalid GeoJSON');
        } else {
          throw new Error('Invalid GeoJSON');
        }
        if (!cancelled) setGeoGeom(geom);
      } catch (e) {
        if (!cancelled) setGeoErr('Could not render GeoJSON');
      }
    })();
    return () => { cancelled = true; };
  }, [open, item, sel]);

  if (!open || !item) return null;

  const isLocked = item.status === 'resolved' || item.status === 'wont_fix';
  const imgs = Array.isArray(item.images) ? item.images : [];
  const count = imgs.length;
  const currentSrc = imgs[sel] || '';
  const currentUrl = getUrl(currentSrc);
  const currentIsPdf = isPdfSrc(currentSrc);
  const currentIsGeo = isGeoSrc(currentSrc);
  const goPrev = () => setSel((p) => (count === 0 ? 0 : (p - 1 + count) % count));
  const goNext = () => setSel((p) => (count === 0 ? 0 : (p + 1) % count));
  const getFileName = (src) => {
    try {
      const files = item?.metadata?.files;
      if (Array.isArray(files)) {
        const hit = files.find(f => typeof f?.path === 'string' && (src.endsWith(f.path) || f.path.endsWith(src) || src.includes(f.path)));
        if (hit?.original) return String(hit.original);
      }
    } catch {}
    const seg = (src || '').split('/').pop();
    return seg || 'file.pdf';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.patch(`/admin/feedback/${item.id}`, { status, admin_response: adminResponse });
      try { invalidateHttpCache('/admin/feedback'); } catch {}
      onSave?.(res?.data?.data || res?.data || res);
      onClose?.();
    } catch {
      // swallow errors
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Feedback #${item.id}`}
      width={1200}
      ariaLabel="Feedback detail dialog"
      bodyClassName="feedback-detail-body modern-scrollbar"
      overlayZIndex={10100}
    >
      <div style={{ background: '#e5e7eb', padding: '24px', borderRadius: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
          {/* Left: content + preview */}
          <div className="lv-settings-panel" style={{ gap: 16, background: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #cbd5e1' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: '#000000', letterSpacing: '-0.01em' }}>{item.title}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#000000', minWidth: '90px' }}>Status:</span> <StatusPill status={status} />
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#000000', minWidth: '90px' }}>Category:</span> {item.category ? <span className="feedback-category-badge">{item.category}</span> : <span style={{ fontSize: 13, color: '#94a3b8' }}>—</span>}
            </div>
            {item.lake?.name && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#000000', minWidth: '90px' }}>Lake:</span> <span style={{ fontSize: 13, color: '#000000' }}>{item.lake.name}</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#000000', minWidth: '90px' }}>Submitted:</span>
              {item.is_guest ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge" style={{ background:'#fef3c7', color:'#92400e', padding:'3px 8px', borderRadius:6, fontSize:11, fontWeight: 600 }}>Guest</span>
                    <span style={{ fontSize: 13, color: '#000000' }}>{item.guest_name || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No name provided</span>}</span>
                  </div>
                  {item.guest_email ? (
                    <span style={{ fontSize: 12, color: '#64748b', marginLeft: '4px' }}>{item.guest_email}</span>
                  ) : (
                    <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', marginLeft: '4px' }}>No email provided</span>
                  )}
                </div>
              ) : (
                <span style={{ fontSize: 13, color: '#000000' }}>{item.user?.name || '—'}</span>
              )}
            </div>
            {!item.is_guest && item.tenant?.name && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#000000', minWidth: '90px' }}>Organization:</span>
                <span style={{ fontSize: 13, color: '#000000' }}>{item.tenant.name}</span>
              </div>
            )}
            <div style={{ fontSize: 12, color: '#64748b', paddingTop: '8px', borderTop: '1px solid #cbd5e1', marginTop: '6px' }}>Submitted: {new Date(item.created_at).toLocaleString()}</div>
          </div>
          <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#000000', padding: '14px 16px', borderBottom: '1px solid #cbd5e1' }}>Message</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#000000', padding: '16px' }}>{item.message}</div>
          </div>

          {imgs.length > 0 && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#000000' }}>Attachments ({count})</div>
              <div style={{ position: 'relative', background: '#f8fafb', border: '1px solid #cbd5e1', borderRadius: 10, padding: 12 }}>
                {!currentIsPdf && !currentIsGeo ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 240 }}>
                    <img src={currentUrl} alt={`Preview ${sel + 1}`} style={{ maxWidth: '100%', maxHeight: '280px', objectFit: 'contain', borderRadius: 6 }} />
                  </div>
                ) : currentIsPdf ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 240 }}>
                    <iframe title={`PDF ${sel + 1}`} src={currentUrl} style={{ width: '100%', height: '320px', border: 'none', background: '#fff', borderRadius: 6 }} />
                  </div>
                ) : (
                  <div style={{ minHeight: 240 }}>
                    {geoGeom ? (
                      <div style={{ border:'1px solid #cbd5e1', borderRadius:12, overflow:'hidden' }}>
                        <div style={{ height: 320 }}>
                          <PreviewMap geometry={geoGeom} />
                        </div>
                      </div>
                    ) : (
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:240, color:'#64748b', fontSize:12 }}>
                        {geoErr || 'Loading GeoJSON…'}
                      </div>
                    )}
                  </div>
                )}
                {currentIsPdf && (
                  <div className="muted" style={{ position: 'absolute', left: 12, bottom: 10, fontSize: 12, background: '#ffffffcc', padding: '2px 6px', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                    {getFileName(currentSrc)}
                  </div>
                )}
                {count > 1 && (
                  <>
                    <button className="pill-btn ghost sm" onClick={goPrev} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} title="Previous">
                      <FiChevronLeft />
                    </button>
                    <button className="pill-btn ghost sm" onClick={goNext} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }} title="Next">
                      <FiChevronRight />
                    </button>
                  </>
                )}
                <div style={{ position: 'absolute', right: 8, bottom: 8, display:'flex', gap:8 }}>
                  <a className="pill-btn ghost sm" href={currentUrl} target="_blank" rel="noreferrer" title="Open in new tab">
                    <FiExternalLink /> Open
                  </a>
                  <a className="pill-btn ghost sm" href={currentUrl} download title="Download file">
                    Download
                  </a>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {imgs.map((raw, idx) => {
                  const src = raw && typeof raw === 'string' ? raw : '';
                  const url = getUrl(src);
                  const isPdf = isPdfSrc(src);
                  const isGeo = isGeoSrc(src);
                  const isActive = idx === sel;
                  const commonStyle = { borderRadius: 8, border: isActive ? '2px solid #3b82f6' : '1px solid #e8ecef', background: '#fff', cursor: 'pointer', transition: 'all 0.2s', boxShadow: isActive ? '0 2px 8px rgba(59,130,246,0.2)' : '0 1px 2px rgba(0,0,0,0.05)' };
                  return isPdf || isGeo ? (
                    <button key={idx} type="button" onClick={() => setSel(idx)} title={getFileName(src)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 8px', ...commonStyle }}>
                      <FiFileText /> <span style={{ fontSize: 12, maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getFileName(src)}</span>
                    </button>
                  ) : (
                    <button key={idx} type="button" onClick={() => setSel(idx)} title={`Select image ${idx + 1}`} style={{ padding: 0, ...commonStyle }}>
                      <img src={url} alt={`Thumb ${idx + 1}`} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: moderation */}
        <div className="lv-settings-panel" style={{ gap: 16, background: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #cbd5e1' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#000000', letterSpacing: '-0.01em' }}>Moderation</h3>
          <div className="lv-field-row">
            <label htmlFor="fb-detail-status" style={{ fontSize: 13, fontWeight: 600, color: '#000000' }}>Status</label>
            <select
              id="fb-detail-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isLocked}
              style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 12px', background: isLocked ? '#f8fafb' : '#fff', fontSize: 14, height: 38, cursor: isLocked ? 'not-allowed' : 'pointer', color: '#000000' }}
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div className="lv-field-row">
            <label htmlFor="fb-detail-response" style={{ fontSize: 13, fontWeight: 600, color: '#000000' }}>Admin Response</label>
            <textarea
              id="fb-detail-response"
              value={adminResponse}
              onChange={(e) => setAdminResponse(e.target.value)}
              disabled={isLocked}
              rows={6}
              maxLength={4000}
              placeholder={isLocked ? "This feedback is locked and cannot be edited." : "Provide context, resolution notes, or rationale."}
              style={{ resize: 'vertical', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 14, lineHeight: 1.6, background: isLocked ? '#f8fafb' : '#fff', cursor: isLocked ? 'not-allowed' : 'text', color: '#000000' }}
            />
          </div>
          {isLocked && (
            <div style={{ padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 13, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>ℹ️</span>
              <span>Feedback marked as "{STATUS_LABEL[item.status]}" cannot be edited.</span>
            </div>
          )}
          <div className="settings-actions" style={{ justifyContent: 'flex-end' }}>
            <button className="pill-btn ghost" type="button" onClick={onClose} disabled={saving}>Close</button>
            {!isLocked && (
              <button className="btn-primary" type="button" disabled={saving} onClick={handleSave}>{saving ? 'Saving…' : 'Save Changes'}</button>
            )}
          </div>
        </div>
      </div>
      </div>
    </Modal>
  );
}

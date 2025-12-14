import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Modal from '../../components/Modal';
import api from '../../lib/api';
import { getToken } from '../../lib/api';
import DataPrivacyDisclaimer from '../../pages/PublicInterface/DataPrivacyDisclaimer';
import UserFeedbackDetailModal from '../../components/feedback/UserFeedbackDetailModal';
import { FiFileText, FiAlertCircle, FiCheckCircle, FiClock, FiXCircle, FiSearch, FiImage, FiMapPin, FiDownload } from 'react-icons/fi';
import Swal from 'sweetalert2';
import LoadingSpinner from '../../components/LoadingSpinner';
import PreviewMap from '../layers/PreviewMap';

const TYPES = [
  'Missing information',
  'Incorrect data',
  'Submit Lake Layer',
  'I want to Contribute my Data!',
  'Other',
];

export default function LakeFeedbackModal({ open, onClose, lake }) {
  const [type, setType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  // guest-only fields
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const hpRef = useRef(null);
  const formRef = useRef(null);
  const fileInputRef = useRef(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [geoPreview, setGeoPreview] = useState(null);
  // My submissions
  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Draft auto-save for guests
  const DRAFT_KEY = `lake_feedback_draft_${lake?.id || 'temp'}`;
  useEffect(() => {
    if (open && !getToken()) {
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
          const draft = JSON.parse(saved);
          if (draft.type) setType(draft.type);
          if (draft.title) setTitle(draft.title);
          if (draft.description) setDescription(draft.description);
          if (draft.guestName) setGuestName(draft.guestName);
          if (draft.guestEmail) setGuestEmail(draft.guestEmail);
        }
      } catch {}
    }
  }, [open, lake]);

  useEffect(() => {
    if (!getToken() && (type || title || description || guestName || guestEmail)) {
      const draft = { type, title, description, guestName, guestEmail };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }
  }, [type, title, description, guestName, guestEmail, lake]);

  const getFileName = (item, src) => {
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
  // validation state akin to FeedbackModal.jsx
  const [tDesc, setTDesc] = useState(false);
  const MIN_DESC = 10;
  const rawDescLen = description.trim().length;
  const descError = rawDescLen === 0 && tDesc ? 'Description is required.' : (rawDescLen > 0 && rawDescLen < MIN_DESC && tDesc ? `Description must be at least ${MIN_DESC} characters.` : '');

  useEffect(() => {
    if (open) {
      setError(''); setSuccess('');
      setTimeout(() => { try { formRef.current?.querySelector('select,textarea,input')?.focus(); } catch {} }, 40);
      if (getToken()) {
        fetchMine({ page: 1 });
      }
    }
  }, [open]);

  const reset = async () => {
    const hasContent = type || title || description || guestName || guestEmail || files.length > 0;
    if (hasContent) {
      const result = await Swal.fire({
        title: 'Clear form?',
        text: 'This will remove all your entered data.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, clear it',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#64748b'
      });
      if (!result.isConfirmed) return;
    }
    setType(''); setTitle(''); setDescription(''); setFiles([]); setGuestName(''); setGuestEmail(''); 
    if (hpRef.current) hpRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
    setPreviews([]);
    setGeoPreview(null);
    setTDesc(false);
    setError(''); setSuccess('');
    if (!getToken()) localStorage.removeItem(DRAFT_KEY);
  };

  const fetchMine = useCallback(async (opts={}) => {
    if (!getToken()) return;
    const nextPage = opts.page || 1;
    setLoadingList(true);
    try {
      // Prefer lake-specific endpoint if available; otherwise fallback to general mine
      const params = lake?.id ? { page: nextPage, lake_id: lake.id } : { page: nextPage };
      if (searchQuery) params.search = searchQuery;
      if (filterStatus && filterStatus !== 'all') params.status = filterStatus;
      const res = await api.get('/feedback/mine', { params });
      const data = Array.isArray(res?.data) ? res.data : (res?.data?.data ? res.data.data : res?.data || []);
      const meta = res?.meta || res;
      setList(nextPage === 1 ? data : prev => ([...(prev||[]), ...data]));
      setPage(meta.current_page || nextPage);
      setHasMore((meta.current_page || nextPage) < (meta.last_page || 1));
    } catch (e) { /* swallow */ } finally { setLoadingList(false); }
  }, [lake, searchQuery, filterStatus]);

  const handleChooseFiles = () => {
    try { fileInputRef.current?.click(); } catch {}
  };

  const allowedHint = useMemo(() => {
    if (type === 'Submit Lake Layer') {
      return 'GeoJSON only (.geojson). One file only. Max 25MB.';
    }
    return 'Image files (PNG, JPG) and PDF. Up to 6 files, 25MB each.';
  }, [type]);

  const ALLOWED_MIME = ['image/png','image/jpeg','application/pdf'];
  const isAllowedFile = (f) => {
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (f.size > maxSize) return false;
    if (ALLOWED_MIME.includes(f.type)) return true;
    // fallback to extension when type is missing or generic
    const name = (f.name || '').toLowerCase();
    if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.pdf')) return true;
    return false;
  };

  const onFilesSelected = async (evt) => {
    const picked = Array.from(evt.target.files || []);
    const isSubmitLayer = type === 'Submit Lake Layer';
    setError('');
    setGeoPreview(null);

    if (isSubmitLayer) {
      if (picked.length < 1) return;
      const f = picked[0];
      const name = (f.name || '').toLowerCase();
      const mime = (f.type || '').toLowerCase();
      const isGeo = mime.includes('geo+json') || mime === 'application/json' || name.endsWith('.geojson');
      if (!isGeo) {
        setFiles([]);
        try { evt.target.value = ''; } catch {}
        setError('Only one GeoJSON (.geojson) is allowed for Submit Lake Layer.');
        return;
      }
      try {
        const text = await f.text();
        const json = JSON.parse(text);
        const t = json?.type;
        let geom = null;
        if (t === 'FeatureCollection') {
          const feats = Array.isArray(json.features) ? json.features : [];
          if (feats.length !== 1 || !feats[0]?.geometry) throw new Error('GeoJSON must contain exactly one geometry.');
          geom = feats[0].geometry;
        } else if (t === 'Feature') {
          if (!json.geometry) throw new Error('Feature has no geometry.');
          geom = json.geometry;
        } else if (['Point','MultiPoint','LineString','MultiLineString','Polygon','MultiPolygon','GeometryCollection'].includes(t)) {
          if (t === 'GeometryCollection') {
            const geoms = Array.isArray(json.geometries) ? json.geometries : [];
            if (geoms.length !== 1) throw new Error('GeometryCollection must contain exactly one geometry.');
            geom = geoms[0];
          } else {
            geom = json;
          }
        } else {
          throw new Error('Invalid GeoJSON.');
        }
        setFiles([f]);
        setGeoPreview(geom);
      } catch (e) {
        setFiles([]);
        setGeoPreview(null);
        setError(e?.message || 'Invalid GeoJSON file.');
      } finally {
        try { evt.target.value = ''; } catch {}
      }
      return;
    }

    const validPicked = picked.filter(isAllowedFile);
    const invalidCount = picked.length - validPicked.length;

    let combined = [...files, ...validPicked];
    let trimmed = combined;
    let overLimit = false;
    if (combined.length > 6) {
      trimmed = combined.slice(0, 6);
      overLimit = true;
    }

    if (invalidCount > 0 && overLimit) setError('Some files were skipped and the limit is 6 files. Allowed: JPG/PNG/PDF up to 25MB each.');
    else if (invalidCount > 0) setError('Some files were skipped. Allowed: JPG/PNG/PDF up to 25MB each.');
    else if (overLimit) setError('You can upload up to 6 files.');

    setFiles(trimmed);
    try { evt.target.value = ''; } catch {}
  };

  // Build previews for selected files
  useEffect(() => {
    const urls = files.map(f => (f.type && f.type.startsWith('image/')) ? URL.createObjectURL(f) : null);
    setPreviews(urls);
    return () => { urls.forEach(u => { if (u) try { URL.revokeObjectURL(u); } catch {} }); };
  }, [files]);

  const handleTemplateDownload = async (format) => {
    try {
      const token = getToken();
      if (!token) {
        await Swal.fire({
          title: 'Authentication Required',
          text: 'Please log in to download the bulk import template.',
          icon: 'warning',
          confirmButtonText: 'OK',
          confirmButtonColor: '#2563eb'
        });
        return;
      }

      // Use org endpoint - blank template doesn't require lake_id/station_id
      const response = await fetch(`/api/org/bulk-dataset/template?format=${format}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv, application/octet-stream'
        }
      });

      if (!response.ok) {
        let errorMessage = 'Download failed';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const error = await response.json();
            errorMessage = error.error || error.message || errorMessage;
          } else {
            errorMessage = await response.text() || errorMessage;
          }
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulk_dataset_template.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      await Swal.fire({
        title: 'Download Started',
        text: `Template downloaded as ${format.toUpperCase()} file.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Template download error:', error);
      await Swal.fire({
        title: 'Download Failed',
        text: error.message || 'Failed to download template.',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc2626'
      });
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (rawDescLen < MIN_DESC) {
      setError('Description is required and must be at least 10 characters.');
      await Swal.fire({
        title: 'Please complete the form',
        text: 'Description is required and must be at least 10 characters.',
        icon: 'warning',
        confirmButtonText: 'OK',
        confirmButtonColor: '#2563eb',
      });
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      // Map frontend fields to backend API fields
      if (type) fd.append('category', type.toLowerCase().replace(/ /g, '_')); // Convert "Missing information" to "missing_information"
      if (title && title.trim()) fd.append('title', title.trim());
      else fd.append('title', type || 'Lake Feedback'); // Title is required, use type as fallback
      fd.append('message', description.trim());
      if (lake?.id) fd.append('lake_id', String(lake.id));
      const hasToken = !!getToken();
      if (!hasToken) {
        if (guestName.trim()) fd.append('guest_name', guestName.trim());
        if (guestEmail.trim()) fd.append('guest_email', guestEmail.trim());
      }
      const hp = hpRef.current?.value; if (hp) fd.append('website', hp);
      if (files && files.length) {
        files.forEach((f) => fd.append('images[]', f));
      }
      // If logged in, submit to /api/feedback else to /api/public/feedback
      const endpoint = hasToken ? '/feedback' : '/public/feedback';
      const res = await api.upload(endpoint, fd, { headers: { /* Content-Type auto for FormData */ } });
      if (res) {
        reset();
        setTDesc(false); // clear touched state
        const hasToken = !!getToken();
        const text = hasToken
          ? 'Feedback submitted. You can track your feedback below!'
          : 'Feedback submitted.';
        await Swal.fire({
          title: 'Thank you!',
          text,
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#2563eb'
        });
        setSuccess('');
      }
    } catch (e2) {
      let msg = 'Submission failed.';
      try {
        const parsed = JSON.parse(e2.message || '{}');
        msg = parsed?.message || Object.values(parsed?.errors || {})?.flat()?.[0] || msg;
      } catch {}
      setError(msg);
      await Swal.fire({ title: 'Submission failed', text: msg, icon: 'error', confirmButtonText: 'OK', confirmButtonColor: '#2563eb' });
    } finally { setSubmitting(false); }
  };

  // Refetch when search or filter changes
  useEffect(() => {
    if (open && getToken()) {
      fetchMine({ page: 1 });
    }
  }, [searchQuery, filterStatus, open, fetchMine]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={"Lake Feedback"}
      width={640}
      ariaLabel="Lake feedback dialog"
      cardClassName="auth-card"
      bodyClassName="content-page modern-scrollbar"
      footer={(
          <div className="lv-modal-actions" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <div className="muted" style={{ fontSize:12, textAlign:'left' }}>
            By submitting, you agree to our{' '}
            <a href="#" onClick={(e)=>{e.preventDefault(); setPrivacyOpen(true);}} style={{ textDecoration:'underline', fontStyle:'italic', color:'inherit' }}>Privacy Notice</a>.
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button type="button" className="pill-btn sm" onClick={reset} disabled={submitting}>Clear</button>
            <button type="submit" form="lake-feedback-form" className="pill-btn primary" disabled={submitting || rawDescLen < MIN_DESC}>{submitting ? 'Submitting…' : 'Submit'}</button>
          </div>
        </div>
      )}
    >
      <div className="feedback-container">
        <div className="feedback-layout" data-mode="single">
          <div className="lv-settings-grid">
            <div className="insight-card feedback-form-card">
              <h3 style={{ marginTop:0, marginBottom:12, fontSize:18, fontWeight:700 }}>{lake?.name ? `Submit Feedback for ${lake.name}` : 'Submit Feedback'}</h3>
              <form id="lake-feedback-form" ref={formRef} onSubmit={onSubmit} noValidate>
                <fieldset disabled={submitting} style={{ border:'none', padding:0, margin:0, display:'grid', gap:16 }}>
                  <div className="lv-field-row">
                    <label htmlFor="fb-type">Feedback Type</label>
                    <select id="fb-type" aria-label="Feedback type (optional)" value={type} onChange={(e)=>setType(e.target.value)} style={{ fontSize: 14 }}>
                      <option value="">Select type...</option>
                      {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {type === 'Submit Lake Layer' && (
                      <div className="lv-status-info" style={{ fontSize: 12, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FiMapPin size={14} />
                        <span>Upload a GeoJSON file with the lake boundary or feature</span>
                      </div>
                    )}
                    {type === 'I want to Contribute my Data!' && (
                      <div className="lv-status-info" style={{ marginTop: 12, padding: 12, borderRadius: 8 }}>
                        <strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Bulk Import Template</strong>
                        <p style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>Download our template to prepare your water quality data for bulk upload:</p>
                        <button
                          type="button"
                          className="pill-btn primary sm"
                          onClick={() => handleTemplateDownload('xlsx')}
                          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          <FiDownload size={14} />
                          Download Template (XLSX)
                        </button>
                        <p style={{ fontSize: 12, marginTop: 10, color: '#64748b' }}>After filling the template, please attach it below and submit your feedback.</p>
                      </div>
                    )}
                  </div>
                  <div className="lv-field-row">
                    <label htmlFor="fb-title">Title (optional)</label>
                    <input id="fb-title" type="text" value={title} onChange={(e)=>setTitle(e.target.value)} maxLength={160} placeholder="Short title" />
                  </div>
                  <div className={`lv-field-row ${descError ? 'has-error' : ''}`}>
                    <label htmlFor="fb-desc">Description <span className="req">*</span></label>
                    <textarea
                      id="fb-desc"
                      value={description}
                      onChange={(e)=>setDescription(e.target.value)}
                      onBlur={()=> setTDesc(true)}
                      rows={5}
                      maxLength={4000}
                      required
                      placeholder="Describe missing/incorrect information or add context for the photos."
                      style={{ resize:'vertical' }}
                      aria-invalid={!!descError}
                      aria-describedby={descError ? 'fb-desc-err' : undefined}
                    />
                    <div className="char-counter" style={rawDescLen < MIN_DESC && tDesc ? { color:'var(--danger, #dc2626)' } : {}}>{description.length}/4000</div>
                    {descError && <div id="fb-desc-err" className="field-error" style={{ color:'var(--danger, #dc2626)', fontSize:12, marginTop:4 }}>{descError}</div>}
                  </div>
                  <div className="lv-field-row">
                    <label htmlFor="fb-files">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FiImage size={16} />
                        Attachments (optional)
                      </div>
                    </label>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <input
                        ref={fileInputRef}
                        id="fb-files"
                        type="file"
                        accept={type === 'Submit Lake Layer' ? 'application/geo+json,application/json,.geojson' : 'image/png,image/jpeg,application/pdf'}
                        multiple={type !== 'Submit Lake Layer'}
                        onChange={onFilesSelected}
                        style={{ display:'none' }}
                      />
                      <button type="button" className="pill-btn ghost sm" onClick={handleChooseFiles} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FiImage size={14} />
                        Add files
                      </button>
                      {files && files.length > 0 && (
                        <div className="muted" style={{ fontSize:12 }}>
                          {files.length} file{files.length>1?'s':''} selected
                        </div>
                      )}
                    </div>
                    <div className="muted" style={{ fontSize:11, marginTop:6 }}>{allowedHint}</div>
                    {type === 'Submit Lake Layer' && geoPreview && (
                      <div className="insight-card" style={{ marginTop: 10, padding: 12, background: '#f8fafc' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <FiMapPin size={16} style={{ color: '#3b82f6' }} />
                          <strong style={{ fontSize: 13 }}>GeoJSON Preview</strong>
                        </div>
                        <div style={{ border:'2px solid #e2e8f0', borderRadius:12, overflow:'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                          <div style={{ height: 280 }}>
                            <PreviewMap geometry={geoPreview} />
                          </div>
                        </div>
                        <div className="muted" style={{ fontSize:11, marginTop:10, wordBreak:'break-all', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <FiFileText size={12} />
                          {files[0]?.name}
                        </div>
                        <div style={{ marginTop:8 }}>
                          <button
                            type="button"
                            onClick={() => { setFiles([]); setGeoPreview(null); if (fileInputRef.current) fileInputRef.current.value=''; }}
                            className="pill-btn ghost sm"
                            title="Delete this file"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                    {type !== 'Submit Lake Layer' && files && files.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginTop: 12 }}>
                        {files.map((f, idx) => (
                          f.type && f.type.startsWith('image/') ? (
                            <div key={idx} className="insight-card" style={{ padding:8, textAlign:'center', transition: 'transform 0.2s', cursor: 'pointer' }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              <div style={{ position: 'relative', marginBottom: 8 }}>
                                <img src={previews[idx]} alt={f.name} style={{ width:'100%', height:120, objectFit:'cover', borderRadius:8 }} />
                                <div style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', borderRadius: 6, padding: 4 }}>
                                  <FiImage size={12} color="white" />
                                </div>
                              </div>
                              <div className="muted" style={{ fontSize:10, marginBottom:8, wordBreak:'break-all', lineHeight: 1.3 }}>{f.name}</div>
                              <button
                                type="button"
                                onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}
                                className="pill-btn ghost sm"
                                title="Delete this file"
                                style={{ fontSize: 11 }}
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <div key={idx} className="insight-card" style={{ padding:12, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, textAlign:'center', minHeight: 160 }}>
                              <div style={{ background: '#f1f5f9', borderRadius: 12, padding: 12 }}>
                                <FiFileText size={28} color="#64748b" />
                              </div>
                              <div className="muted" style={{ fontSize:10, textAlign:'center', wordBreak:'break-all', lineHeight: 1.3 }}>{f.name}</div>
                              <button
                                type="button"
                                onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}
                                className="pill-btn ghost sm"
                                title="Delete this file"
                                style={{ fontSize: 11 }}
                              >
                                Remove
                              </button>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Guest-only name/email in the same row */}
                  {!getToken() && (
                    <div className="lv-field-row guest-grid">
                      <div>
                        <label htmlFor="fb-guest-name">Name (optional)</label>
                        <input id="fb-guest-name" type="text" value={guestName} onChange={(e)=>setGuestName(e.target.value)} maxLength={120} placeholder="Your name" />
                      </div>
                      <div>
                        <label htmlFor="fb-guest-email">Email (optional)</label>
                        <input id="fb-guest-email" type="email" value={guestEmail} onChange={(e)=>setGuestEmail(e.target.value)} maxLength={160} placeholder="you@example.com" />
                      </div>
                    </div>
                  )}
                  {/* Honeypot */}
                  <div style={{ position:'absolute', left:'-9999px', width:1, height:1, overflow:'hidden' }} aria-hidden="true">
                    <label>Website</label>
                    <input ref={hpRef} type="text" name="website" tabIndex={-1} autoComplete="off" />
                  </div>
                  {error && <div className="lv-status-error" role="alert">{error}</div>}
                  {/* Success now via SweetAlert */}
                </fieldset>
              </form>
            </div>
          </div>
        </div>
        {getToken() && (
          <div className="feedback-submissions" style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0 }}>My Submissions</h3>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, maxWidth: 500 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <FiSearch size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: 42, paddingRight: 16, paddingTop: 10, paddingBottom: 10, fontSize: 14, width: '100%', borderRadius: 12 }}
                    className="pill-input"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ fontSize: 14, color: '#ffffff', padding: '10px 14px', borderRadius: 12, minWidth: 140 }}
                  title="Filter by status"
                >
                  <option value="all" style={{ color: '#000000' }}>All</option>
                  <option value="open" style={{ color: '#000000' }}>Open</option>
                  <option value="in_progress" style={{ color: '#000000' }}>In Progress</option>
                  <option value="resolved" style={{ color: '#000000' }}>Resolved</option>
                  <option value="wont_fix" style={{ color: '#000000' }}>Won't Fix</option>
                </select>
              </div>
            </div>
            <div className="feedback-list">
              {list.length === 0 && !loadingList && (
                <div className="insight-card" style={{ textAlign:'center', padding: 32 }}>
                  {searchQuery || filterStatus !== 'all' ? (
                    <div>
                      <FiSearch size={32} style={{ color: '#cbd5e1', marginBottom: 12 }} />
                      <div style={{ fontSize: 14, color: '#64748b' }}>No matching feedback found.</div>
                      <button 
                        className="pill-btn ghost sm" 
                        style={{ marginTop: 12 }}
                        onClick={() => { setSearchQuery(''); setFilterStatus('all'); }}
                      >
                        Clear filters
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 14, color: '#64748b' }}>No feedback for this lake yet.</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>Submit your first feedback above!</div>
                    </div>
                  )}
                </div>
              )}
              {list.map(item => {
                const statusColors = { 
                  open: '#3b82f6', 
                  in_progress: '#f59e0b', 
                  resolved: '#10b981', 
                  wont_fix: '#94a3b8' 
                };
                const StatusIcon = { 
                  open: FiAlertCircle, 
                  in_progress: FiClock, 
                  resolved: FiCheckCircle, 
                  wont_fix: FiXCircle 
                }[item.status] || FiAlertCircle;
                
                return (
                  <div 
                    key={item.id} 
                    className="insight-card" 
                    style={{ 
                      display:'grid', 
                      gap:10, 
                      padding:'14px 16px', 
                      cursor:'pointer',
                      transition: 'all 0.2s ease',
                      borderLeft: '3px solid transparent'
                    }}
                    onClick={() => { setSelectedFeedback(item); setDetailModalOpen(true); }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateX(4px)';
                      e.currentTarget.style.borderLeftColor = statusColors[item.status] || '#3b82f6';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.borderLeftColor = 'transparent';
                      e.currentTarget.style.boxShadow = '';
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedFeedback(item); setDetailModalOpen(true); } }}
                  >
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
                      <strong style={{ fontSize:14, lineHeight: 1.4, flex: 1 }}>{item.title || item.type || 'Feedback'}</strong>
                      {item.status && (
                        <span className={`feedback-status ${item.status}`} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                          <StatusIcon size={14} />
                          {item.status.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center', fontSize:12, color:'#94a3b8', flexWrap:'wrap' }}>
                      {item.category && <span className="feedback-category-badge" style={{ background: '#f1f5f9', padding: '3px 10px', borderRadius: 12, fontSize: 11, color: '#475569' }}>{item.category}</span>}
                      {item.category && <span>•</span>}
                      <span>{item.lake?.name || (item.lake_id ? 'Lake Feedback' : 'System Feedback')}</span>
                      <span>•</span>
                      <span>{item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}</span>
                    </div>
                  </div>
                );
              })}
              {loadingList && <div className="muted" style={{ textAlign:'center' }}><LoadingSpinner label="Loading submissions…" /></div>}
              {hasMore && !loadingList && (
                <div style={{ textAlign:'center' }}>
                  <button className="pill-btn ghost sm" onClick={() => fetchMine({ page: page + 1 })}>Load More</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Privacy Notice modal */}
      <DataPrivacyDisclaimer open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      {/* Feedback Detail modal */}
      {detailModalOpen && (
        <UserFeedbackDetailModal 
          open={detailModalOpen} 
          onClose={() => { setDetailModalOpen(false); setSelectedFeedback(null); }} 
          feedback={selectedFeedback}
          onCloseAll={() => { setDetailModalOpen(false); setSelectedFeedback(null); onClose(); }}
          overlayZIndex={10001}
        />
      )}
    </Modal>
  );
}

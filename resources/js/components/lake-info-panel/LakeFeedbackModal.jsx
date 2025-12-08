import React, { useState, useRef, useEffect, useCallback } from 'react';
import Modal from '../../components/Modal';
import api from '../../lib/api';
import { getToken } from '../../lib/api';
import DataPrivacyDisclaimer from '../../pages/PublicInterface/DataPrivacyDisclaimer';
import UserFeedbackDetailModal from '../../components/feedback/UserFeedbackDetailModal';
import { FiFileText } from 'react-icons/fi';
import Swal from 'sweetalert2';
import LoadingSpinner from '../../components/LoadingSpinner';

const TYPES = [
  'Missing information',
  'Incorrect data',
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
  // My submissions
  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
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

  const reset = () => {
    setType(''); setTitle(''); setDescription(''); setFiles([]); setGuestName(''); setGuestEmail(''); if (hpRef.current) hpRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
    setPreviews([]);
    setTDesc(false); // clear touched validation state
    setError(''); setSuccess(''); // clear any error/success messages
  };

  const fetchMine = useCallback(async (opts={}) => {
    if (!getToken()) return;
    const nextPage = opts.page || 1;
    setLoadingList(true);
    try {
      // Prefer lake-specific endpoint if available; otherwise fallback to general mine
      const params = lake?.id ? { page: nextPage, lake_id: lake.id } : { page: nextPage };
      const res = await api.get('/feedback/mine', { params });
      const data = Array.isArray(res?.data) ? res.data : (res?.data?.data ? res.data.data : res?.data || []);
      const meta = res?.meta || res;
      setList(nextPage === 1 ? data : prev => ([...(prev||[]), ...data]));
      setPage(meta.current_page || nextPage);
      setHasMore((meta.current_page || nextPage) < (meta.last_page || 1));
    } catch (e) { /* swallow */ } finally { setLoadingList(false); }
  }, [lake]);

  const handleChooseFiles = () => {
    try { fileInputRef.current?.click(); } catch {}
  };

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

  const onFilesSelected = (evt) => {
    const picked = Array.from(evt.target.files || []);
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
    // Reset input value so the same file can be re-selected if removed
    try { evt.target.value = ''; } catch {}
  };

  // Build previews for selected files
  useEffect(() => {
    const urls = files.map(f => (f.type && f.type.startsWith('image/')) ? URL.createObjectURL(f) : null);
    setPreviews(urls);
    return () => { urls.forEach(u => { if (u) try { URL.revokeObjectURL(u); } catch {} }); };
  }, [files]);

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
                    {/* Removed feedback type label per requirement; keep accessible name */}
                    <select id="fb-type" aria-label="Feedback type (optional)" value={type} onChange={(e)=>setType(e.target.value)}>
                      <option value="">Select</option>
                      {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
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
                    <label htmlFor="fb-files">Attachments (optional)</label>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <input
                        ref={fileInputRef}
                        id="fb-files"
                        type="file"
                        accept="image/png,image/jpeg,application/pdf"
                        multiple
                        onChange={onFilesSelected}
                        style={{ display:'none' }}
                      />
                      <button type="button" className="pill-btn ghost sm" onClick={handleChooseFiles}>Add files</button>
                      {files && files.length > 0 && (
                        <div className="muted" style={{ fontSize:12 }}>
                          {files.length} file{files.length>1?'s':''} selected
                        </div>
                      )}
                    </div>
                    {files && files.length > 0 && (
                      <div className="preview-grid" style={{ marginTop: 10 }}>
                        {files.map((f, idx) => (
                          f.type && f.type.startsWith('image/') ? (
                            <div key={idx} className="insight-card" style={{ padding:6, textAlign:'center' }}>
                              <img src={previews[idx]} alt={f.name} style={{ width:'100%', height:110, objectFit:'cover', borderRadius:6 }} />
                              <div className="muted" style={{ fontSize:10, marginTop:6, wordBreak:'break-all' }}>{f.name}</div>
                              <div style={{ marginTop:6 }}>
                                <button
                                  type="button"
                                  onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}
                                  className="pill-btn ghost sm"
                                  title="Delete this file"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div key={idx} className="insight-card" style={{ padding:12, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, textAlign:'center' }}>
                              <FiFileText size={24} />
                              <div className="muted" style={{ fontSize:10, textAlign:'center', wordBreak:'break-all' }}>{f.name}</div>
                              <div>
                                <button
                                  type="button"
                                  onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}
                                  className="pill-btn ghost sm"
                                  title="Delete this file"
                                >
                                  Delete
                                </button>
                              </div>
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
          <div className="feedback-submissions" style={{ marginTop: 16 }}>
            <h3 style={{ margin:'0 0 12px' }}>My Submissions</h3>
            <div className="feedback-list">
              {list.length === 0 && !loadingList && (<div className="insight-card" style={{ textAlign:'center' }}>No feedback yet.</div>)}
              {list.map(item => (
                <div 
                  key={item.id} 
                  className="insight-card" 
                  style={{ display:'grid', gap:8, padding:'12px 14px', cursor:'pointer' }}
                  onClick={() => { setSelectedFeedback(item); setDetailModalOpen(true); }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedFeedback(item); setDetailModalOpen(true); } }}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
                    <strong style={{ fontSize:14 }}>{item.title || item.type || 'Feedback'}</strong>
                    {item.status && <span className={`feedback-status ${item.status}`}>{item.status}</span>}
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center', fontSize:12, color:'#94a3b8', flexWrap:'wrap' }}>
                    {item.category && <span className="feedback-category-badge">{item.category}</span>}
                    {item.category && <span>•</span>}
                    <span>{item.lake?.name || (item.lake_id ? 'Lake Feedback' : 'System Feedback')}</span>
                    <span>•</span>
                    <span>{item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}</span>
                  </div>
                </div>
              ))}
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
      <UserFeedbackDetailModal 
        open={detailModalOpen} 
        onClose={() => { setDetailModalOpen(false); setSelectedFeedback(null); }} 
        feedback={selectedFeedback}
        onCloseAll={() => { setDetailModalOpen(false); setSelectedFeedback(null); onClose(); }}
      />
    </Modal>
  );
}

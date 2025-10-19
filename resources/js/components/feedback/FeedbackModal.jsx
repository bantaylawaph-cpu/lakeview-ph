import React, { useState, useEffect, useCallback, useRef } from 'react';
import Modal from '../Modal';
import api from '../../lib/api';
import { getCurrentUser } from '../../lib/authState';
import LoadingSpinner from '../LoadingSpinner';
import DataPrivacyDisclaimer from '../../pages/PublicInterface/DataPrivacyDisclaimer';

// Status pill uses feedback-status classes from feedback.css
function StatusPill({ status }) {
  const labelMap = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', wont_fix: "Won't Fix" };
  return <span className={`feedback-status ${status}`}>{labelMap[status] || status}</span>;
}

export default function FeedbackModal({ open, onClose, width = 640 }) {
  const user = getCurrentUser();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  // Attachments: screenshots only (png/jpg)
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const fileInputRef = useRef(null);
  // Guest-only fields
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const honeypotRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [list, setList] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const mountedRef = useRef(true);
  const formRef = useRef(null);
  const triggerRef = useRef(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  // no file preview needed for "My Submissions"

  // Field interaction (touched) tracking for validation messages
  const [tTitle, setTTitle] = useState(false);
  const [tMessage, setTMessage] = useState(false);
  const [tCategory, setTCategory] = useState(false);
  const MIN_TITLE = 3;
  const MIN_MESSAGE = 10;
  const rawTitleLen = title.trim().length;
  const rawMsgLen = message.trim().length;
  const titleError = rawTitleLen === 0 && tTitle ? 'Title is required.' : (rawTitleLen > 0 && rawTitleLen < MIN_TITLE && tTitle ? `Title must be at least ${MIN_TITLE} characters.` : '');
  const messageError = rawMsgLen === 0 && tMessage ? 'Message is required.' : (rawMsgLen > 0 && rawMsgLen < MIN_MESSAGE && tMessage ? `Message must be at least ${MIN_MESSAGE} characters.` : '');
  const categoryError = (!category || category.trim()==='') && tCategory ? 'Category is required.' : '';
  const isValid = rawTitleLen >= MIN_TITLE && rawMsgLen >= MIN_MESSAGE && !!category;

  const fetchMine = useCallback(async (opts = {}) => {
    if (!user) return;
    const nextPage = opts.page || 1;
    setLoadingList(true);
    try {
      const res = await api.get('/feedback/mine', { params: { page: nextPage } });
      const data = Array.isArray(res?.data) ? res.data : (res?.data?.data ? res.data.data : res?.data || []);
      const meta = res?.meta || res;
      setList(nextPage === 1 ? data : prev => ([...(prev||[]), ...data]));
      setPage(meta.current_page || nextPage);
      setHasMore((meta.current_page || nextPage) < (meta.last_page || 1));
    } catch (e) {
      // swallow list errors
    } finally { if (mountedRef.current) setLoadingList(false); }
  }, [user]);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    if (open && user) {
      fetchMine({ page: 1 });
      setTimeout(() => { try { formRef.current?.querySelector('input,textarea,select,button')?.focus(); } catch {} }, 40);
    }
  }, [open, user, fetchMine]);

  // Basic focus trap within modal content when open
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') { onClose?.(); }
      if (e.key === 'Tab') {
        const focusables = formRef.current?.closest('.lv-modal-card')?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusables || !focusables.length) return;
        const list = Array.from(focusables).filter(el => !el.hasAttribute('disabled'));
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [open, onClose]);

  const resetForm = () => { setTitle(''); setCategory(''); setMessage(''); setGuestName(''); setGuestEmail(''); setFiles([]); if (honeypotRef.current) honeypotRef.current.value=''; };

  // File selection and previews (screenshots only)
  const ALLOWED_MIME = ['image/png', 'image/jpeg'];
  const isAllowedFile = (f) => {
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (f.size > maxSize) return false;
    if (ALLOWED_MIME.includes(f.type)) return true;
    const name = (f.name || '').toLowerCase();
    return name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg');
  };
  const onFilesSelected = (evt) => {
    const picked = Array.from(evt.target.files || []);
    const validPicked = picked.filter(isAllowedFile);
    const invalidCount = picked.length - validPicked.length;
    let combined = [...files, ...validPicked];
    let trimmed = combined;
    let overLimit = false;
    if (combined.length > 6) { trimmed = combined.slice(0, 6); overLimit = true; }
    if (invalidCount > 0 && overLimit) setError('Some files were skipped and the limit is 6 files. Allowed: PNG/JPG up to 25MB each.');
    else if (invalidCount > 0) setError('Some files were skipped. Allowed: PNG/JPG up to 25MB each.');
    else if (overLimit) setError('You can upload up to 6 files.');
    setFiles(trimmed);
    try { evt.target.value = ''; } catch {}
  };
  useEffect(() => {
    const urls = files.map(f => (f.type && f.type.startsWith('image/')) ? URL.createObjectURL(f) : null);
    setPreviews(urls);
    return () => { urls.forEach(u => { if (u) try { URL.revokeObjectURL(u); } catch {} }); };
  }, [files]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Mark fields as touched so their errors show
    setTTitle(true); setTMessage(true); setTCategory(true);
    if (!isValid) {
      setError('Please fix the highlighted fields.');
      // Focus first invalid field
      setTimeout(() => {
        try {
          if (rawTitleLen < MIN_TITLE) formRef.current?.querySelector('input[name="feedback-title"]')?.focus();
          else if (!category) formRef.current?.querySelector('select[name="feedback-category"]')?.focus();
          else if (rawMsgLen < MIN_MESSAGE) formRef.current?.querySelector('textarea[name="feedback-message"]')?.focus();
        } catch {}
      }, 10);
      return;
    }
    setSubmitting(true); setError(''); setSuccess('');
    try {
      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('message', message.trim());
      if (category) fd.append('category', category);
      if (!user) {
        if (guestName.trim()) fd.append('guest_name', guestName.trim());
        if (guestEmail.trim()) fd.append('guest_email', guestEmail.trim());
        const hpVal = honeypotRef.current?.value; if (hpVal) fd.append('website', hpVal);
      } else {
        // Send metadata as an array using bracket notation so Laravel parses it correctly
        fd.append('metadata[ua]', navigator.userAgent || '');
        fd.append('metadata[lang]', navigator.language || '');
        fd.append('metadata[tz]', (Intl.DateTimeFormat().resolvedOptions().timeZone) || '');
      }
      if (files && files.length) { files.forEach((f) => fd.append('images[]', f)); }
      const endpoint = user ? '/feedback' : '/public/feedback';
      const res = await api.upload(endpoint, fd, { headers: {} });
      // Accept several possible shapes: {data: {...}}, {...}, or empty object
      const created = (res && (res.data || res.item || (res.id && res))) || null;
      if (created) {
        setSuccess('Feedback submitted. Thank you!');
        resetForm();
        if (user) {
          setList(prev => [created, ...(prev||[])]);
        }
      } else {
        setSuccess('Feedback submitted.');
      }
    } catch (e2) {
      let parsed = null;
      try { parsed = JSON.parse(e2.message || '{}'); } catch {}
      console.warn('[Feedback] submit failed', e2, parsed);
      const firstFieldError = parsed && parsed.errors && Object.values(parsed.errors).flat()[0];
      setError(parsed?.message || firstFieldError || 'Submission failed.');
    } finally { if (mountedRef.current) setSubmitting(false); }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={"Feedback"}
      width={width}
      ariaLabel="User feedback dialog"
      cardClassName="auth-card"
      bodyClassName="content-page modern-scrollbar"
      footer={(
        <div className="lv-modal-actions" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <div className="muted" style={{ fontSize:12, textAlign:'left' }}>
            By submitting, you agree to our{' '}
            <a href="#" onClick={(e)=>{e.preventDefault(); setPrivacyOpen(true);}} style={{ textDecoration:'underline', fontStyle:'italic', color:'inherit' }}>Privacy Notice</a>.
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button type="button" className="pill-btn ghost sm" onClick={resetForm} disabled={submitting || (!title && !message && !guestName && !guestEmail)}>Reset</button>
            <button type="submit" form="feedback-form" className="pill-btn primary" disabled={submitting || !isValid}>{submitting ? 'Submitting…' : 'Submit'}</button>
          </div>
        </div>
      )}
    >
      <div className="feedback-container">
        {!user && (
          <div className="lv-status-info" style={{ marginBottom: 12, fontSize:13 }}>
            You can submit feedback as a guest. Providing a name or email is optional but helps us follow up.
          </div>
        )}
        <div className="feedback-layout" data-mode="single">
          <div className="lv-settings-grid">
            <div className="insight-card feedback-form-card">
            <h3 style={{ marginTop:0 }}>Submit New Feedback</h3>
            <form id="feedback-form" ref={formRef} onSubmit={handleSubmit} noValidate>
              <fieldset disabled={submitting} style={{ border:'none', padding:0, margin:0, display:'grid', gap:16 }}>
                {!user && (
                  <>
                    <div className="lv-field-row">
                      <label>Name (optional)</label>
                      <input type="text" value={guestName} onChange={e=>setGuestName(e.target.value)} maxLength={120} placeholder="Your name" />
                    </div>
                    <div className="lv-field-row">
                      <label>Email (optional)</label>
                      <input type="email" value={guestEmail} onChange={e=>setGuestEmail(e.target.value)} maxLength={160} placeholder="you@example.com" />
                    </div>
                    {/* Honeypot field (hidden from real users) */}
                    <div style={{ position:'absolute', left:'-9999px', width:1, height:1, overflow:'hidden' }} aria-hidden="true">
                      <label>Website</label>
                      <input ref={honeypotRef} type="text" name="website" tabIndex={-1} autoComplete="off" />
                    </div>
                  </>
                )}
                <div className={`lv-field-row ${titleError ? 'has-error' : ''}`}>
                  <label htmlFor="fb-title">Title <span className="req">*</span></label>
                  <input
                    id="fb-title"
                    name="feedback-title"
                    type="text"
                    value={title}
                    onChange={e=>{ setTitle(e.target.value); }}
                    onBlur={()=> setTTitle(true)}
                    maxLength={160}
                    required
                    aria-invalid={!!titleError}
                    aria-describedby={titleError ? 'fb-title-err' : undefined}
                    placeholder="Concise summary (e.g. Layer legend overlaps)"
                  />
                  <div className="char-counter" style={rawTitleLen < MIN_TITLE && tTitle ? { color:'var(--danger, #dc2626)' } : {}}>{title.length}/160</div>
                  {titleError && <div id="fb-title-err" className="field-error" style={{ color:'var(--danger, #dc2626)', fontSize:12, marginTop:4 }}>{titleError}</div>}
                </div>
                <div className={`lv-field-row ${categoryError ? 'has-error' : ''}`}>
                  <label htmlFor="fb-category">Category <span className="req">*</span></label>
                  <select
                    id="fb-category"
                    name="feedback-category"
                    value={category}
                    onChange={e=>setCategory(e.target.value)}
                    onBlur={()=> setTCategory(true)}
                    required
                    aria-invalid={!!categoryError}
                    aria-describedby={categoryError ? 'fb-category-err' : undefined}
                  >
                    <option value="">— Select —</option>
                    <option value="bug">Bug</option>
                    <option value="suggestion">Suggestion</option>
                    <option value="data">Data</option>
                    <option value="ui">UI/UX</option>
                    <option value="other">Other</option>
                  </select>
                  {categoryError && <div id="fb-category-err" className="field-error" style={{ color:'var(--danger, #dc2626)', fontSize:12, marginTop:4 }}>{categoryError}</div>}
                </div>
                <div className={`lv-field-row ${messageError ? 'has-error' : ''}`}>
                  <label htmlFor="fb-message">Message <span className="req">*</span></label>
                  <textarea
                    id="fb-message"
                    name="feedback-message"
                    value={message}
                    onChange={e=>{ setMessage(e.target.value); }}
                    onBlur={()=> setTMessage(true)}
                    maxLength={2000}
                    required
                    rows={5}
                    aria-invalid={!!messageError}
                    aria-describedby={messageError ? 'fb-message-err' : undefined}
                    placeholder="Describe the issue or idea."
                    style={{ resize:'vertical' }}
                  />
                  <div className="char-counter" style={rawMsgLen < MIN_MESSAGE && tMessage ? { color:'var(--danger, #dc2626)' } : {}}>{message.length}/2000</div>
                  {messageError && <div id="fb-message-err" className="field-error" style={{ color:'var(--danger, #dc2626)', fontSize:12, marginTop:4 }}>{messageError}</div>}
                </div>
                <div className="lv-field-row">
                  <label htmlFor="fb-files">Attachments (optional)</label>
                  <div className="muted" style={{ fontSize:12, marginTop:-6, marginBottom:6 }}>Screenshots only (PNG, JPG), up to 6 files, 25MB each.</div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <input
                      ref={fileInputRef}
                      id="fb-files"
                      type="file"
                      accept="image/png,image/jpeg"
                      multiple
                      onChange={onFilesSelected}
                      style={{ display:'none' }}
                    />
                    <button type="button" className="pill-btn ghost sm" onClick={() => fileInputRef.current?.click()}>Add files</button>
                    {files && files.length > 0 && (
                      <div className="muted" style={{ fontSize:12 }}>
                        {files.length} file{files.length>1?'s':''} selected
                      </div>
                    )}
                  </div>
                  {files && files.length > 0 && (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:10, marginTop:10 }}>
                      {files.map((f, idx) => (
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
                      ))}
                    </div>
                  )}
                </div>
                {error && <div className="lv-status-error" role="alert">{error}</div>}
                {success && <div className="lv-status-success" role="status">{success}</div>}
                {/* footer buttons moved into Modal.footer for consistency */}
              </fieldset>
            </form>
            </div>
          </div>
        </div>
        {user && (
          <div className="feedback-submissions">
            <h3 style={{ margin:'0 0 12px' }}>My Submissions</h3>
            <div className="feedback-list">
            {list.length === 0 && !loadingList && (<div className="insight-card" style={{ textAlign:'center' }}>No feedback yet.</div>)}
            {list.map(item => (
              <div key={item.id} className="insight-card" style={{ display:'grid', gap:6, padding:'14px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
                  <strong style={{ fontSize:15 }}>{item.title}</strong>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <StatusPill status={item.status} />
                  </div>
                </div>
                {item.category && (
                  <div style={{ marginTop:2 }}>
                    <span className="feedback-category-badge">{item.category}</span>
                  </div>
                )}
                <div style={{ whiteSpace:'pre-wrap', fontSize:13, lineHeight:1.45 }}>{item.message}</div>
                {item.admin_response && (
                  <div className="admin-reply-box"><strong>Admin Response:</strong><br />{item.admin_response}</div>
                )}
                <div className="meta-row">
                  <span>Created: {item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</span>
                  {item.resolved_at && <span>Resolved: {new Date(item.resolved_at).toLocaleString()}</span>}
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
      <DataPrivacyDisclaimer open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </Modal>
  );
}

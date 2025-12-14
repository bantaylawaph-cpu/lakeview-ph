import React, { useState, useEffect, useCallback, useRef } from 'react';
import Swal from 'sweetalert2';
import Modal from '../Modal';
import api from '../../lib/api';
import { getCurrentUser } from '../../lib/authState';
import LoadingSpinner from '../LoadingSpinner';
import DataPrivacyDisclaimer from '../../pages/PublicInterface/DataPrivacyDisclaimer';
import UserFeedbackDetailModal from './UserFeedbackDetailModal';
import { FiAlertCircle, FiCheckCircle, FiClock, FiXCircle, FiSearch, FiFilter, FiDownload } from 'react-icons/fi';
import { getToken } from '../../lib/api';

// Status pill uses feedback-status classes from feedback.css
function StatusPill({ status }) {
  const labelMap = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', wont_fix: "Won't Fix" };
  const iconMap = { 
    open: <FiAlertCircle size={14} style={{ marginRight: 4 }} />, 
    in_progress: <FiClock size={14} style={{ marginRight: 4 }} />, 
    resolved: <FiCheckCircle size={14} style={{ marginRight: 4 }} />, 
    wont_fix: <FiXCircle size={14} style={{ marginRight: 4 }} /> 
  };
  return (
    <span className={`feedback-status ${status}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {iconMap[status]}
      {labelMap[status] || status}
    </span>
  );
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
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Draft auto-save
  const DRAFT_KEY = 'feedback_draft';
  useEffect(() => {
    if (open && !user) {
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
          const draft = JSON.parse(saved);
          if (draft.title) setTitle(draft.title);
          if (draft.category) setCategory(draft.category);
          if (draft.message) setMessage(draft.message);
          if (draft.guestName) setGuestName(draft.guestName);
          if (draft.guestEmail) setGuestEmail(draft.guestEmail);
        }
      } catch {}
    }
  }, [open, user]);

  useEffect(() => {
    if (!user && (title || message || category || guestName || guestEmail)) {
      const draft = { title, category, message, guestName, guestEmail };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }
  }, [title, category, message, guestName, guestEmail, user]);

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
      const params = { page: nextPage };
      if (searchQuery) params.search = searchQuery;
      if (filterStatus && filterStatus !== 'all') params.status = filterStatus;
      const res = await api.get('/feedback/mine', { params });
      const data = Array.isArray(res?.data) ? res.data : (res?.data?.data ? res.data.data : res?.data || []);
      const meta = res?.meta || res;
      setList(nextPage === 1 ? data : prev => ([...(prev||[]), ...data]));
      setPage(meta.current_page || nextPage);
      setHasMore((meta.current_page || nextPage) < (meta.last_page || 1));
    } catch (e) {
      // swallow list errors
    } finally { if (mountedRef.current) setLoadingList(false); }
  }, [user, searchQuery, filterStatus]);

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
      // Don't handle ESC if detail modal is open (let it handle it)
      if (e.key === 'Escape' && !detailModalOpen) { onClose?.(); }
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
  }, [open, onClose, detailModalOpen]);

  const resetForm = async () => {
    const hasContent = title || message || category || guestName || guestEmail || files.length > 0;
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
    setTitle(''); setCategory(''); setMessage(''); setGuestName(''); setGuestEmail(''); setFiles([]); 
    if (honeypotRef.current) honeypotRef.current.value=''; 
    if (fileInputRef.current) fileInputRef.current.value = '';
    setPreviews([]);
    setTTitle(false); setTMessage(false); setTCategory(false);
    setError(''); setSuccess('');
    if (!user) localStorage.removeItem(DRAFT_KEY);
  };

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

      // Determine user role from token or user object
      const apiPrefix = user?.role === 'contributor' ? 'contrib' : 'org';
      const response = await fetch(`/api/${apiPrefix}/bulk-dataset/template?format=${format}`, {
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
      // Show SweetAlert loading state while submitting (do not await)
      Swal.fire({
        title: 'Submitting…',
        text: 'Please wait while we send your feedback.',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => { Swal.showLoading(); }
      });
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
        // Clear touched/error states before showing popup
        setTTitle(false); setTMessage(false); setTCategory(false);
        resetForm();
        if (user) { 
          setList(prev => [created, ...(prev||[])]); 
          if (!user) localStorage.removeItem(DRAFT_KEY);
        }
        // Close loading dialog before showing the result
        try { Swal.close(); } catch {}
        const text = user
          ? 'Feedback submitted. You can track your Feedback updates below.'
          : 'Feedback submitted.';
        await Swal.fire({
          title: 'Thank you!',
          text,
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#2563eb'
        });
        setSuccess(''); // we rely on SweetAlert instead of inline success banner
      } else {
        // Close loading dialog before showing the result
        try { Swal.close(); } catch {}
        const text = user
          ? 'Feedback submitted. You can track your Feedback updates below.'
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
      let parsed = null;
      try { parsed = JSON.parse(e2.message || '{}'); } catch {}
      console.warn('[Feedback] submit failed', e2, parsed);
      const firstFieldError = parsed && parsed.errors && Object.values(parsed.errors).flat()[0];
      setError(parsed?.message || firstFieldError || 'Submission failed.');
      // Close loading dialog before showing the error
      try { Swal.close(); } catch {}
      await Swal.fire({
        title: 'Submission failed',
        text: parsed?.message || firstFieldError || 'Please try again.',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc2626'
      });
    } finally { if (mountedRef.current) setSubmitting(false); }
  };

  // Refetch when search or filter changes
  useEffect(() => {
    if (open && user) {
      fetchMine({ page: 1 });
    }
  }, [searchQuery, filterStatus, open, user, fetchMine]);

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
                    <option value="org_petition">Petition a New Organization</option>
                    <option value="data_contribution">I want to Contribute my Data!</option>
                    <option value="other">Other</option>
                  </select>
                  {categoryError && <div id="fb-category-err" className="field-error" style={{ color:'var(--danger, #dc2626)', fontSize:12, marginTop:4 }}>{categoryError}</div>}
                  {category === 'data_contribution' && (
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
                  <div className="muted" style={{ fontSize:12, marginTop:-6, marginBottom:6 }}>Images only (PNG, JPG), up to 6 files, 25MB each.</div>
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
                {/* Success messages now shown via SweetAlert popup */}
                {/* footer buttons moved into Modal.footer for consistency */}
              </fieldset>
            </form>
            </div>
          </div>
        </div>
        {user && (
          <div className="feedback-submissions">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0 }}>My Submissions</h3>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, maxWidth: 500 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <FiSearch size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search feedback..."
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
                  <option value="all" style={{ color: '#000000' }}>All Status</option>
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
                    <div style={{ fontSize: 14, color: '#64748b' }}>No feedback yet.</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>Submit your first feedback above!</div>
                  </div>
                )}
              </div>
            )}
            {list.map(item => (
              <div 
                key={item.id} 
                className="insight-card" 
                style={{ 
                  display:'grid', 
                  gap:8, 
                  padding:'12px 14px', 
                  cursor:'pointer',
                  transition: 'all 0.2s ease',
                  borderLeft: '3px solid transparent'
                }}
                onClick={() => { setSelectedFeedback(item); setDetailModalOpen(true); }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(4px)';
                  e.currentTarget.style.borderLeftColor = item.status === 'resolved' ? '#10b981' : item.status === 'in_progress' ? '#f59e0b' : '#3b82f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.borderLeftColor = 'transparent';
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedFeedback(item); setDetailModalOpen(true); } }}
              >
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
                  <strong style={{ fontSize:14, lineHeight: 1.4 }}>{item.title}</strong>
                  <StatusPill status={item.status} />
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center', fontSize:12, color:'#94a3b8', flexWrap:'wrap' }}>
                  {item.category && <span className="feedback-category-badge" style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>{item.category}</span>}
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
      <DataPrivacyDisclaimer open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
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

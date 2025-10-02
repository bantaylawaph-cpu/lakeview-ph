import React, { useState, useEffect, useCallback, useRef } from 'react';
import Modal from '../Modal';
import api from '../../lib/api';
import { getCurrentUser } from '../../lib/authState';

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

  const resetForm = () => { setTitle(''); setCategory(''); setMessage(''); setGuestName(''); setGuestEmail(''); if (honeypotRef.current) honeypotRef.current.value=''; };

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
      const payload = { title: title.trim(), message: message.trim(), category: category || null };
      if (!user) {
        if (guestName.trim()) payload.guest_name = guestName.trim();
        if (guestEmail.trim()) payload.guest_email = guestEmail.trim();
        // Honeypot field appended when present
        const hpVal = honeypotRef.current?.value;
        if (hpVal) payload.website = hpVal; // if bot filled -> backend validation rejects
      } else {
        // Authenticated path still adds metadata; backend handles metadata itself for public endpoint too but we keep parity
        payload.metadata = { ua: navigator.userAgent, lang: navigator.language, tz: Intl.DateTimeFormat().resolvedOptions().timeZone };
      }
      const endpoint = user ? '/feedback' : '/public/feedback';
      console.debug('[Feedback] submitting', endpoint, payload);
      const res = await api.post(endpoint, payload);
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
    <Modal open={open} onClose={onClose} title="Feedback" width={width} ariaLabel="User feedback dialog">
      {!user && (
        <div className="lv-status-info" style={{ marginBottom: 12, fontSize:13 }}>
          You can submit feedback as a guest. Providing a name or email is optional but helps us follow up.
        </div>
      )}
      <div className="lv-modern-settings" data-mode="single" style={{ paddingTop:0 }}>
        <div className="lv-settings-grid">
          <div className="lv-settings-panel" style={{ width:'100%' }}>
            <h3 style={{ marginTop:0 }}>Submit New Feedback</h3>
            <form ref={formRef} onSubmit={handleSubmit} noValidate>
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
                {error && <div className="lv-status-error" role="alert">{error}</div>}
                {success && <div className="lv-status-success" role="status">{success}</div>}
                <div className="settings-actions" style={{ justifyContent:'flex-end', gap:8 }}>
                  <button type="button" className="pill-btn ghost sm" onClick={resetForm} disabled={submitting || (!title && !message && !guestName && !guestEmail)}>Reset</button>
                  <button type="submit" className="btn-primary" disabled={submitting || !isValid}>{submitting ? 'Submitting…' : 'Submit'}</button>
                </div>
              </fieldset>
            </form>
          </div>
        </div>
      </div>
      {user && (
        <div style={{ marginTop:24 }}>
          <h3 style={{ margin:'0 0 12px' }}>My Submissions</h3>
          <div className="feedback-list" style={{ display:'grid', gap:14 }}>
            {list.length === 0 && !loadingList && (<div className="lv-settings-panel" style={{ textAlign:'center' }}>No feedback yet.</div>)}
            {list.map(item => (
              <div key={item.id} className="lv-settings-panel" style={{ display:'grid', gap:6, padding:'14px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
                  <strong style={{ fontSize:15 }}>{item.title}</strong>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    {item.category && <span className="feedback-category-badge">{item.category}</span>}
                    <StatusPill status={item.status} />
                  </div>
                </div>
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
            {loadingList && <div className="muted" style={{ textAlign:'center' }}>Loading…</div>}
            {hasMore && !loadingList && (
              <div style={{ textAlign:'center' }}>
                <button className="pill-btn ghost sm" onClick={() => fetchMine({ page: page + 1 })}>Load More</button>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import api from '../../lib/api';
import { getCurrentUser } from '../../lib/authState';

// Status pill using CSS classes
const STATUS_LABELS = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', wont_fix: "Won't Fix" };
const StatusPill = memo(function StatusPill({ status }) {
  return <span className={`feedback-status ${status}`}>{STATUS_LABELS[status] || status}</span>;
});

const TITLE_MAX = 160;
const MESSAGE_MAX = 2000;

const FeedbackCard = memo(function FeedbackCard({ item }) {
  return (
    <div className="lv-settings-panel feedback-item" style={{ padding:'14px 16px', display:'grid', gap:6 }}>
      <div style={{ display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
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
      <div className="feedback-item__meta">
        <span>Created: {item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</span>
        {item.resolved_at && <span>Resolved: {new Date(item.resolved_at).toLocaleString()}</span>}
      </div>
    </div>
  );
});

export default function SubmitFeedback() {
  const user = getCurrentUser();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
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

  const isValid = title.trim().length >= 3 && message.trim().length >= 10;

  const fetchMine = useCallback(async (opts = {}) => {
    if (!user) return;
    const nextPage = opts.page || 1;
    setLoadingList(true);
    try {
      const res = await api.get('/feedback/mine', { params: { page: nextPage } });
      const payload = res?.data || res;
      const records = Array.isArray(payload) ? payload : (payload?.data || []);
      const current = payload?.current_page || nextPage;
      const last = payload?.last_page || 1;
      setList(nextPage === 1 ? records : prev => ([...(prev||[]), ...records]));
      setPage(current);
      setHasMore(current < last);
    } catch {/* ignore */} finally {
      if (mountedRef.current) setLoadingList(false);
    }
  }, [user]);

  useEffect(() => { mountedRef.current = true; if (user) fetchMine({ page:1 }); return () => { mountedRef.current = false; }; }, [user, fetchMine]);

  const resetForm = () => {
    setTitle('');
    setCategory('');
    setMessage('');
    setGuestName('');
    setGuestEmail('');
    if (honeypotRef.current) honeypotRef.current.value='';
  };

  const buildPayload = () => {
    const payload = { title: title.trim(), message: message.trim(), category: category || null };
    if (!user) {
      if (guestName.trim()) payload.guest_name = guestName.trim();
      if (guestEmail.trim()) payload.guest_email = guestEmail.trim();
      const hp = honeypotRef.current?.value;
      if (hp) payload.website = hp; // honeypot
    } else {
      payload.metadata = {
        ua: navigator.userAgent,
        lang: navigator.language,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) { setError('Provide a longer title/message.'); return; }
    setSubmitting(true); setError(''); setSuccess('');
    try {
      const endpoint = user ? '/feedback' : '/public/feedback';
      const res = await api.post(endpoint, buildPayload());
      if (res?.data) {
        setSuccess('Feedback submitted. Thank you!');
        resetForm();
        if (user) setList(prev => [res.data, ...(prev||[])]);
      } else setSuccess('Submitted.');
    } catch (err) {
      let msg = 'Submission failed.';
      try {
        const parsed = JSON.parse(err.message || '{}');
        msg = parsed?.message || Object.values(parsed?.errors || {})?.flat()?.[0] || msg;
      } catch {}
      setError(msg);
    } finally { if (mountedRef.current) setSubmitting(false); }
  };

  return (
    <div className="content-page" style={{ maxWidth:980, margin:'0 auto' }}>
      <div className="page-head">
        <h1 style={{ margin:0, fontSize:'1.8rem' }}>Feedback</h1>
        <div className="page-subtext">Share bugs, ideas, or suggestions to help improve the platform.</div>
      </div>
      {!user && (
        <div className="lv-status-info" style={{ marginBottom:18, fontSize:13 }}>
          You can submit feedback as a guest. Providing a name or email helps us follow up.
        </div>
      )}
      <div className="feedback-wrapper">
        <div className="feedback-form-panel" style={{ width:'100%' }}>
          <h3 className="section-heading">Submit New Feedback</h3>
          <form onSubmit={handleSubmit} noValidate>
            <fieldset disabled={submitting} className="feedback-fieldset">
              {!user && (
                <>
                  <div className="lv-field-row">
                    <label htmlFor="fb-guest-name">Name <span className="optional">(optional)</span></label>
                    <input id="fb-guest-name" type="text" value={guestName} onChange={e=>setGuestName(e.target.value)} maxLength={120} placeholder="Your name" />
                  </div>
                  <div className="lv-field-row">
                    <label htmlFor="fb-guest-email">Email <span className="optional">(optional)</span></label>
                    <input id="fb-guest-email" type="email" value={guestEmail} onChange={e=>setGuestEmail(e.target.value)} maxLength={160} placeholder="you@example.com" />
                  </div>
                  <div style={{ position:'absolute', left:'-9999px', width:1, height:1, overflow:'hidden' }} aria-hidden="true">
                    <label>Website</label>
                    <input ref={honeypotRef} type="text" name="website" tabIndex={-1} autoComplete="off" />
                  </div>
                </>
              )}
              <div className="lv-field-row">
                <label htmlFor="fb-title">Title <span className="req">*</span></label>
                <input id="fb-title" type="text" value={title} onChange={e=>setTitle(e.target.value)} maxLength={TITLE_MAX} required placeholder="Concise summary (e.g. Map layer legend overlaps)" />
                <div className="char-counter">{title.length}/{TITLE_MAX}</div>
              </div>
              <div className="lv-field-row">
                <label htmlFor="fb-category">Category</label>
                <select id="fb-category" value={category} onChange={e=>setCategory(e.target.value)}>
                  <option value="">— Select —</option>
                  <option value="bug">Bug</option>
                  <option value="suggestion">Suggestion</option>
                  <option value="data">Data</option>
                  <option value="ui">UI/UX</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="lv-field-row">
                <label htmlFor="fb-message">Message <span className="req">*</span></label>
                <textarea id="fb-message" value={message} onChange={e=>setMessage(e.target.value)} maxLength={MESSAGE_MAX} required rows={6} placeholder="Describe the issue or idea. Include steps to reproduce if it's a bug." />
                <div className="char-counter">{message.length}/{MESSAGE_MAX}</div>
              </div>
              {error && <div className="lv-status-error" role="alert">{error}</div>}
              {success && <div className="lv-status-success" role="status">{success}</div>}
              <div className="settings-actions feedback-actions" style={{ justifyContent:'flex-end', gap:8 }}>
                <button type="button" className="pill-btn ghost sm" onClick={resetForm} disabled={submitting || (!title && !message && !guestName && !guestEmail)}>Reset</button>
                <button type="submit" className="btn-primary" disabled={submitting || !isValid}>{submitting ? 'Submitting…' : 'Submit Feedback'}</button>
              </div>
            </fieldset>
          </form>
        </div>
        {user && (
          <div className="feedback-submissions" style={{ marginTop:32 }}>
            <h3 className="section-heading">My Submissions</h3>
            <div className="feedback-list" style={{ display:'grid', gap:14 }}>
              {loadingList && list.length === 0 && <div className="muted center">Loading…</div>}
              {!loadingList && list.length === 0 && <div className="lv-settings-panel empty" style={{ textAlign:'center' }}>No feedback yet.</div>}
              {list.map(item => <FeedbackCard key={item.id} item={item} />)}
              {hasMore && !loadingList && (
                <div className="center">
                  <button className="pill-btn ghost sm" onClick={() => fetchMine({ page: page + 1 })}>Load More</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

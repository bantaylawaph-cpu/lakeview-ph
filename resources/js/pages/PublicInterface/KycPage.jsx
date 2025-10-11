import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, setCurrentUser } from "../../lib/authState";
import { listTenantsOptions, createOrgApplication } from "../../lib/api";
import api from "../../lib/api";
import { toastSuccess, toastError } from "../../lib/alerts";
import Modal from "../../components/Modal";

// Hoisted styles
const inputStyle = { width: '100%', height: 44, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', color: '#111827', outline: 'none' };
const helpTextStyle = { fontSize: 12, color: '#6b7280', marginTop: 6 };
const grid2 = { display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' };
const grid3 = { display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr 1fr' };
const buttonOutline = { height: 44, padding: '0 16px', background: '#ffffff', color: '#111827', border: '1px solid #111827', borderRadius: 10, fontWeight: 600, margin: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

export default function KycPage({ embedded = true, open = true, onClose }) {
  const user = getCurrentUser();
  const role = useMemo(() => (user?.role || null), [user]);
  const [tenants, setTenants] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitOk, setSubmitOk] = useState(false);
  const [kycProfile, setKycProfile] = useState(null);
  const [kycDocs, setKycDocs] = useState([]);
  const [kycSaving, setKycSaving] = useState(false);
  const [myApplication, setMyApplication] = useState(null);
  const [myApplications, setMyApplications] = useState([]);
  const [myAppCount, setMyAppCount] = useState(0);
  const [acceptingId, setAcceptingId] = useState(null);
  const [showNewApp, setShowNewApp] = useState(false);
  const [inWizard, setInWizard] = useState(false); // NEW: controls visibility of steps 1-3
  // Wizard state
  const [step, setStep] = useState(1); // 1: Choose Org, 2: Profile, 3: Documents
  const [chosenTenantId, setChosenTenantId] = useState("");
  const [desiredRole, setDesiredRole] = useState("contributor");
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  // Step 2: ID type selection
  const [idTypeSel, setIdTypeSel] = useState("");
  const [idTypeOther, setIdTypeOther] = useState("");

  const [loading, setLoading] = useState(false);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const cacheRef = useRef({}); // in-memory TTL cache

  // Determine if we're rendering inside the dark auth modal variant
  const isDarkModal = embedded && user && (!role || role === 'public');

  // Derived styles for dark vs light contexts (only applied inside modal)
  const inputS = isDarkModal
    ? { ...inputStyle, border: '1px solid #334155', background: 'rgba(15,23,42,0.55)', color: '#e2e8f0' }
    : inputStyle;
  const helpTextS = isDarkModal
    ? { ...helpTextStyle, color: '#94a3b8' }
    : helpTextStyle;
  const buttonOutlineS = isDarkModal
    ? { ...buttonOutline, background: 'rgba(15,23,42,0.35)', color: '#e2e8f0', border: '1px solid #334155' }
    : buttonOutline;
  const cardBorder = isDarkModal ? '#334155' : '#e5e7eb';
  const listRowBg = (idx) => {
    if (!isDarkModal) return idx % 2 === 0 ? '#ffffff' : '#f9fafb';
    return idx % 2 === 0 ? 'rgba(15,23,42,0.55)' : 'rgba(15,23,42,0.7)';
  };
  const previewBg = isDarkModal ? 'rgba(2,6,23,0.6)' : '#f8fafc';
  const docCardBg = isDarkModal ? 'rgba(15,23,42,0.5)' : '#ffffff';
  const mutedColor = isDarkModal ? '#94a3b8' : '#64748b';
  const legendBorder = isDarkModal ? '#334155' : '#e6eaf0';

  useEffect(() => {
    let mounted = true;
    const controllerMine = new AbortController();
    const controllerCount = new AbortController();
    const controllerAll = new AbortController();
    (async () => {
      if (!user) { return; }
      setLoading(true);
      try {
        // Parallel fetch with caching
        const doMine = async () => {
          if (cacheRef.current.mine && (Date.now() - cacheRef.current.mine.ts < 60_000)) return cacheRef.current.mine.value;
          const res = await api.get('/org-applications/mine', { signal: controllerMine.signal });
          cacheRef.current.mine = { ts: Date.now(), value: res?.data || null };
          return cacheRef.current.mine.value;
        };
        const doCount = async () => {
          if (cacheRef.current.mineCount && (Date.now() - cacheRef.current.mineCount.ts < 60_000)) return cacheRef.current.mineCount.value;
          const res = await api.get('/org-applications/mine/count', { signal: controllerCount.signal });
          const v = res?.data?.count || 0;
          cacheRef.current.mineCount = { ts: Date.now(), value: v };
          return v;
        };
        const doAll = async () => {
          if (cacheRef.current.mineAll && (Date.now() - cacheRef.current.mineAll.ts < 120_000)) return cacheRef.current.mineAll.value;
          const all = await api.get('/org-applications/mine/all', { signal: controllerAll.signal });
          const val = all?.data || [];
          cacheRef.current.mineAll = { ts: Date.now(), value: val };
          return val;
        };
        const [mineRes, countRes, allRes] = await Promise.allSettled([doMine(), doCount(), doAll()]);
        if (!mounted) return;
        if (mineRes.status === 'fulfilled') setMyApplication(mineRes.value);
        if (countRes.status === 'fulfilled') setMyAppCount(countRes.value);
        if (allRes.status === 'fulfilled') setMyApplications(allRes.value);
      } catch { /* silent */ }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; controllerMine.abort(); controllerCount.abort(); controllerAll.abort(); };
  }, [user]);

  // Tenants (only when wizard active & step 1 & selecting new or no current app)
  useEffect(() => {
    let mounted = true;
    const controllerTenants = new AbortController();
    (async () => {
      if (!user) return;
      if (!inWizard) return;
      if (!(step === 1 && (!myApplication || showNewApp))) return;
      if ((tenants || []).length > 0) return;
      setTenantsLoading(true);
      try {
        if (cacheRef.current.tenants && (Date.now() - cacheRef.current.tenants.ts < 300_000)) {
          if (mounted) setTenants(cacheRef.current.tenants.value);
        } else {
          const t = await listTenantsOptions({ signal: controllerTenants.signal });
          const val = t?.data || [];
            cacheRef.current.tenants = { ts: Date.now(), value: val };
            if (mounted) setTenants(val);
        }
      } catch { /* silent */ }
      finally { if (mounted) setTenantsLoading(false); }
    })();
    return () => { mounted = false; controllerTenants.abort(); };
  }, [user, step, myApplication, showNewApp, tenants.length, inWizard]);

  // Profile + documents (only when wizard active and entering steps 2/3)
  useEffect(() => {
    let mounted = true;
    const controllerProfile = new AbortController();
    (async () => {
      if (!user) return;
      if (!inWizard) return;
      if (!(step === 2 || step === 3)) return;
      if (kycProfile !== null || (kycDocs && kycDocs.length)) return;
      try {
        if (cacheRef.current.profile && (Date.now() - cacheRef.current.profile.ts < 120_000)) {
          if (mounted) {
            setKycProfile(cacheRef.current.profile.value.profile);
            setKycDocs(cacheRef.current.profile.value.docs);
          }
          return;
        }
        const p = await api.get('/kyc/profile', { signal: controllerProfile.signal });
        const prof = p?.data || null;
        const docs = p?.documents || [];
        cacheRef.current.profile = { ts: Date.now(), value: { profile: prof, docs } };
        if (mounted) { setKycProfile(prof); setKycDocs(docs); }
      } catch { /* silent */ }
    })();
    return () => { mounted = false; controllerProfile.abort(); };
  }, [user, step, kycProfile, kycDocs, inWizard]);

  // Derive ID type select state
  useEffect(() => {
    const t = (kycProfile?.id_type || "").trim();
    if (!t) { setIdTypeSel(""); setIdTypeOther(""); return; }
    const lc = t.toLowerCase();
    if (["passport"].includes(lc)) { setIdTypeSel("passport"); setIdTypeOther(""); }
    else if (["national id","national_id","philid","phil id","nid"].includes(lc)) { setIdTypeSel("national_id"); setIdTypeOther(""); }
    else if (lc.includes("driver")) { setIdTypeSel("drivers_license"); setIdTypeOther(""); }
    else { setIdTypeSel("other"); setIdTypeOther(t); }
  }, [kycProfile?.id_type]);

  // Wizard helpers
  const next = () => setStep(s => Math.min(3, s + 1));
  const prev = () => setStep(s => Math.max(1, s - 1));
  const exitWizard = () => { setInWizard(false); setShowNewApp(false); setStep(1); setChosenTenantId(''); setErrors({}); };

  const validateStep1 = () => { const e = {}; if (!chosenTenantId) e.tenant = 'Please choose an organization'; if (!desiredRole) e.role = 'Please choose a role'; setErrors(e); return Object.keys(e).length === 0; };
  const validateStep2 = (formEl) => { const e = {}; const full_name = formEl?.full_name?.value?.trim(); const sel = formEl?.id_type_select?.value || ""; const other = formEl?.id_type_other?.value?.trim(); const id_type = sel === 'other' ? other : sel; const id_number = formEl?.id_number?.value?.trim(); if (!full_name) e.full_name='Full name is required'; if (!id_type) e.id_type='ID type is required'; if (!id_number) e.id_number='ID number is required'; setErrors(e); return Object.keys(e).length === 0; };

  const saveKyc = async (e) => {
    e?.preventDefault?.();
    setKycSaving(true);
    try {
      const sel = e.target.id_type_select.value;
      const other = e.target.id_type_other?.value?.trim();
      const resolvedIdType = sel === 'other' ? other : sel;
      const payload = { full_name: e.target.full_name.value, dob: e.target.dob.value, id_type: resolvedIdType, id_number: e.target.id_number.value, address_line1: e.target.address_line1.value, city: e.target.city.value, province: e.target.province.value, postal_code: e.target.postal_code.value };
      const res = await api.patch('/kyc/profile', payload);
      setKycProfile(res?.data || {});
      toastSuccess('Profile saved');
    } catch { toastError('Save failed', 'Please review your inputs.'); }
    finally { setKycSaving(false); }
  };

  const uploadDoc = async (e) => { const file = e.target.files?.[0]; const type = e.target.getAttribute('data-type'); if (!file || !type) return; const fd = new FormData(); fd.append('file', file); fd.append('type', type); try { const res = await api.upload('/kyc/documents', fd); setKycDocs(d => [...d, res?.data].filter(Boolean)); toastSuccess('Document uploaded'); } catch { toastError('Upload failed'); } finally { e.target.value=''; } };
  const deleteDoc = async (id) => { try { await api.delete(`/kyc/documents/${id}`); setKycDocs(d => d.filter(x => x.id !== id)); } catch { toastError('Delete failed'); } };

  const finalizeApplication = async () => {
    if (!kycDocs || kycDocs.length === 0) { setSubmitError('Please upload at least one document before submitting.'); return; }
    setSubmitError(null); setSubmitOk(false); setSubmitting(true);
    try {
      try { await api.post('/kyc/submit'); } catch(_) {}
      const res = await createOrgApplication({ tenant_id: Number(chosenTenantId), desired_role: desiredRole });
      setSubmitOk(true);
  if (res?.message) { try { const { Toast } = await import('../../lib/alerts'); Toast.fire({ icon: 'success', title: res.message, timer: 6000 }); } catch { toastSuccess(res.message); } }
      try { const mine = await api.get('/org-applications/mine'); setMyApplication(mine?.data || null); } catch {}
      exitWizard();
      if (onClose) onClose();
    } catch (e) {
      if (e?.response?.status === 409) { toastError('Application already exists', 'You’ve already applied to this organization.'); try { const mine = await api.get('/org-applications/mine'); setMyApplication(mine?.data || null); } catch {}; exitWizard(); if (onClose) onClose(); return; }
      const msg = (() => { try { const j = JSON.parse(e?.message||''); return j?.message || 'Please try again.'; } catch { return 'Please try again.'; } })();
      setSubmitError(msg); toastError('Application failed', msg);
    } finally { setSubmitting(false); }
  };

  const formatBytes = (bytes) => { const b = Number(bytes || 0); if (!b) return '—'; const k=1024; const sizes=['B','KB','MB','GB']; const i=Math.floor(Math.log(b)/Math.log(k)); return `${(b/Math.pow(k,i)).toFixed(i===0?0:1)} ${sizes[i]}`; };

  const applicationsArray = (myAppCount > 1 ? myApplications : (myApplication ? [myApplication] : []));

  const content = (<>
    {!user && (
      <div className="card" style={{ marginBottom:16, background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, boxShadow:'0 1px 2px rgba(0,0,0,0.04)' }}>
        <div className="card-body" style={{ padding:16 }}>
          <strong>You're not signed in.</strong>
          <div style={{ marginTop:4 }}>Please sign in or create an account to access KYC and organization applications.</div>
        </div>
      </div>
    )}

    {embedded && user && (!role || role === 'public') && (
      <Modal
        open={!!open}
        onClose={() => { if (onClose) onClose(); else navigate('/', { replace: false }); }}
        title="Join an Organization"
        width={860}
        cardClassName="auth-card"
        bodyClassName="content-page modern-scrollbar"
      >
        {/* Applications list (always first) */}
        {!inWizard && (
          <div style={{ display:'grid', gap:12, marginBottom:8 }}>
            <div style={{ fontWeight:700 }}>Your applications</div>
            {loading ? (
              <div style={{ fontSize:14, color:'#6b7280' }}>Loading…</div>
            ) : applicationsArray.length === 0 ? (
              <div style={{ fontSize:14, color:'#6b7280' }}>No applications submitted.</div>
            ) : (
              <div role="list" style={{ border:`1px solid ${cardBorder}`, borderRadius:8, overflow:'hidden' }}>
                {applicationsArray.map((app, idx) => {
                  const s = app?.status || '';
                  const labels = { pending_kyc:'Pending', pending_org_review:'Pending', approved:'Approved', needs_changes:'Needs changes', rejected:'Rejected' };
                  const label = labels[s] || s;
                  const rowBg = listRowBg(idx);
                  const badge = s === 'approved'
                    ? { bg: '#22c55e', fg: '#ffffff' } // green-500
                    : s === 'rejected'
                    ? { bg: '#ef4444', fg: '#ffffff' } // red-500
                    : s === 'needs_changes'
                    ? { bg: '#E0A800', fg: '#ffffff' } // updated amber per request
                    : { bg: '#6366f1', fg: '#ffffff' }; // indigo-500 (pending/default)
                  return (
                    <div key={app.id} role="listitem" style={{ padding:'10px 12px', background:rowBg, borderBottom:`1px solid ${cardBorder}` }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                        <div style={{ fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{app?.tenant?.name || `#${app.tenant_id}`}</div>
                        <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:999, background:badge.bg, color:badge.fg, fontSize:12, fontWeight:600, whiteSpace:'nowrap' }}>{label}</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:4, gap:12 }}>
                        <div>
                          <div style={{ fontSize:12, color: isDarkModal ? '#cbd5e1' : '#6b7280' }}>Applied role: <strong style={{ color: isDarkModal ? '#e2e8f0' : '#374151' }}>{app.desired_role}</strong></div>
                          {app.status && app.status !== 'pending_kyc' && (
                            <div style={{ fontSize:11, color: mutedColor, marginTop:2 }}>We’ve notified you by email about this update.</div>
                          )}
                        </div>
                        {app.status === 'approved' && !app.accepted_at ? (
                          <button type="button" className="auth-btn" onClick={async () => {
                            setAcceptingId(app.id);
                            try {
                              await api.post(`/org-applications/${app.id}/accept`);
                              try { const me = await api.get('/auth/me'); if (me) setCurrentUser(me); } catch {}
                              try { const mine = await api.get('/org-applications/mine'); setMyApplication(mine?.data || null); } catch {}
                              try { const cnt = await api.get('/org-applications/mine/count'); setMyAppCount(cnt?.data?.count || 0); } catch {}
                              setMyApplications([]); toastSuccess('Membership accepted'); if (onClose) onClose();
                            } catch (e) {
                              const code = e?.response?.status;
                              if (code === 409) toastError('Cannot accept', 'You may already belong to an organization.');
                              else if (code === 422) toastError('Cannot accept', 'This application is not eligible for acceptance.');
                              else toastError('Accept failed', 'Please try again.');
                            } finally { setAcceptingId(null); }
                          }} disabled={acceptingId === app.id} style={{ padding:'4px 14px', height:32, minWidth:88, borderRadius:8, fontSize:12, width:'auto', flex:'0 0 auto', display:'inline-flex', alignItems:'center', justifyContent:'center', whiteSpace:'nowrap' }}>{acceptingId === app.id ? 'Accepting…' : 'Accept'}</button>
                        ) : <span />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ display:'grid', gap:8, marginTop:12 }}>
              {applicationsArray.length > 0 ? (
                <>
                  <button type="button" className="auth-btn" onClick={() => { setInWizard(true); setStep(2); }} style={{ height:44, padding:'0 16px', borderRadius:10, width:'100%' }}>Edit details</button>
                  <div style={{ textAlign:'center', color:'#6b7280' }}>-- or --</div>
                  <button type="button" style={{ ...buttonOutline, height:44, padding:'0 16px', borderRadius:10, width:'100%' }} onClick={() => { setShowNewApp(true); setChosenTenantId(''); setInWizard(true); setStep(1); }}>Apply to a different organization</button>
                </>
              ) : (
                <button type="button" className="auth-btn" onClick={() => { setShowNewApp(true); setChosenTenantId(''); setInWizard(true); setStep(1); }} style={{ height:44, padding:'0 16px', borderRadius:10, width:'100%' }}>Apply to an organization</button>
              )}
            </div>
          </div>
        )}

        {/* Wizard Steps */}
        {inWizard && (
          <>
            <div style={{ color:'#6b7280', marginBottom:12 }}>Step {step} of 3</div>
            {step === 1 && (
              <div style={{ display:'grid', gap:12 }}>
                <label>
                  <div style={{ fontWeight:600, marginBottom:6 }}>Select Organization</div>
                  <select value={chosenTenantId} onChange={(e) => setChosenTenantId(e.target.value)} required style={{ ...inputS }}>
                    <option value="" disabled>{(tenantsLoading || loading) ? 'Loading organizations…' : 'Choose an organization…'}</option>
                    {(tenants || []).map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                  </select>
                  <div style={{ ...helpTextS, marginTop:4 }}>Pick the organization you want to join.</div>
                </label>
                {errors.tenant && <div style={{ color:'#b42318' }}>{errors.tenant}</div>}

                <fieldset style={{ border:`1px solid ${legendBorder}`, borderRadius:8, padding:12 }}>
                  <legend style={{ padding:'0 6px' }}>Desired Role</legend>
                  <label style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
                    <input type="radio" name="desired_role" value="contributor" checked={desiredRole === 'contributor'} onChange={() => setDesiredRole('contributor')} />
                    <span>Contributor</span>
                  </label>
                  <label style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <input type="radio" name="desired_role" value="org_admin" checked={desiredRole === 'org_admin'} onChange={() => setDesiredRole('org_admin')} />
                    <span>Org Admin (longer review)</span>
                  </label>
                  <div style={{ ...helpTextS, marginTop:6 }}>Choose the role you prefer. Org Admin may take longer to review.</div>
                </fieldset>
                {errors.role && <div style={{ color:'#b42318' }}>{errors.role}</div>}

                <div style={{ display:'flex', justifyContent:'space-between', gap:8, marginTop:8 }}>
                  <button type="button" onClick={exitWizard} style={{ ...buttonOutlineS, height:44, padding:'0 16px', borderRadius:10 }}>Cancel</button>
                  <div style={{ flex:1 }} />
                  <button className="auth-btn" type="button" onClick={() => { if (validateStep1()) next(); }} disabled={!tenants?.length} style={{ height:44, padding:'0 16px', borderRadius:10, margin:0 }}>Next</button>
                </div>
              </div>
            )}

            {step === 2 && (
              <form className="kyc-form" onSubmit={(e) => { if (!validateStep2(e.target)) { e.preventDefault(); return; } saveKyc(e).then(() => next()); }} style={{ display:'grid', gap:18 }}>
                <div style={grid2}>
                  <label style={{ display:'block' }}>Full Name
                    <input name="full_name" type="text" defaultValue={kycProfile?.full_name || ''} style={inputS} />
                    <div style={{ ...helpTextS, color: errors.full_name ? '#b42318' : helpTextS.color }}>{errors.full_name || 'Your full legal name as shown on ID.'}</div>
                  </label>
                  <label style={{ display:'block' }}>Date of Birth
                    <input name="dob" type="date" defaultValue={kycProfile?.dob || ''} style={inputS} />
                    <div style={helpTextS}>YYYY-MM-DD</div>
                  </label>
                </div>
                <div style={grid2}>
                  <label style={{ display:'block' }}>ID Type
                    <select name="id_type_select" value={idTypeSel} onChange={(e) => setIdTypeSel(e.target.value)} style={inputS}>
                      <option value="">Select type…</option>
                      <option value="passport">Passport</option>
                      <option value="national_id">National ID</option>
                      <option value="drivers_license">Driver’s License</option>
                      <option value="other">Other</option>
                    </select>
                    {idTypeSel === 'other' && (
                      <input name="id_type_other" type="text" value={idTypeOther} onChange={(e) => setIdTypeOther(e.target.value)} placeholder="Specify ID type" style={{ ...inputS, marginTop:8 }} />
                    )}
                    <div style={{ ...helpTextS, color: errors.id_type ? '#b42318' : helpTextS.color }}>{errors.id_type || 'e.g., Passport, National ID, Driver’s License, or specify other.'}</div>
                  </label>
                  <label style={{ display:'block' }}>ID Number
                    <input name="id_number" type="text" defaultValue={kycProfile?.id_number || ''} style={inputS} />
                    <div style={{ ...helpTextS, color: errors.id_number ? '#b42318' : helpTextS.color }}>{errors.id_number || 'Enter exactly as shown on the ID.'}</div>
                  </label>
                </div>
                <div style={{ display:'grid', gap:16, gridTemplateColumns:'1fr' }}>
                  <label style={{ display:'block' }}>Address
                    <input name="address_line1" type="text" defaultValue={kycProfile?.address_line1 || ''} style={inputS} />
                    <div style={helpTextS}>Street address, Purok/Barangay if applicable.</div>
                  </label>
                </div>
                <div style={grid3}>
                  <label style={{ display:'block' }}>City
                    <input name="city" type="text" defaultValue={kycProfile?.city || ''} style={inputS} />
                    <div style={helpTextS}>City or Municipality.</div>
                  </label>
                  <label style={{ display:'block' }}>Province
                    <input name="province" type="text" defaultValue={kycProfile?.province || ''} style={inputS} />
                    <div style={helpTextS}>Province/Region.</div>
                  </label>
                  <label style={{ display:'block' }}>Postal Code
                    <input name="postal_code" type="text" defaultValue={kycProfile?.postal_code || ''} style={inputS} />
                    <div style={helpTextS}>ZIP/Postal code.</div>
                  </label>
                </div>
                <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:10 }}>
                  <button type="button" onClick={prev} style={{ ...buttonOutlineS, height:44, padding:'0 16px', borderRadius:10, fontWeight:600, margin:0 }}>Back</button>
                  <button className="auth-btn" type="submit" disabled={kycSaving} style={{ height:44, padding:'0 16px', borderRadius:10, margin:0 }}>{kycSaving ? 'Saving…' : 'Save & Continue'}</button>
                </div>
              </form>
            )}

            {step === 3 && (
              <div>
                <div style={{ fontWeight:600, marginBottom:6 }}>Documents</div>
                <div style={{ fontSize:12, color: helpTextS.color, marginBottom:6 }}>Upload clear JPG, PNG, or PDF up to 5 MB. If your ID has front and back, upload both. Make sure text and photos are readable.</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:10, justifyContent:'center', marginBottom:6 }}>
                  <label style={{ ...buttonOutlineS, cursor:'pointer' }}>Upload ID Front<input type="file" data-type="id_front" onChange={uploadDoc} accept=".jpg,.jpeg,.png,.pdf" style={{ display:'none' }} /></label>
                  <label style={{ ...buttonOutlineS, cursor:'pointer' }}>Upload ID Back<input type="file" data-type="id_back" onChange={uploadDoc} accept=".jpg,.jpeg,.png,.pdf" style={{ display:'none' }} /></label>
                  <label style={{ ...buttonOutlineS, cursor:'pointer' }}>Upload Supporting<input type="file" data-type="supporting" onChange={uploadDoc} accept=".jpg,.jpeg,.png,.pdf" style={{ display:'none' }} /></label>
                </div>
                {kycDocs?.length > 0 && (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:12, marginTop:10 }}>
                    {kycDocs.map(doc => {
                      const lowerPath = String(doc.path || '').toLowerCase();
                      const isImage = (doc.mime || '').startsWith('image/') || /(png|jpe?g|gif|webp|bmp)$/i.test(lowerPath);
                      const isPdf = (doc.mime || '') === 'application/pdf' || /\.pdf$/i.test(lowerPath);
                      const url = doc.url || (doc.path ? (String(doc.path).startsWith('/storage') ? doc.path : `/storage/${doc.path}`) : '#');
                      return (
                        <div key={doc.id} style={{ border:`1px solid ${cardBorder}`, borderRadius:10, overflow:'hidden', background: docCardBg }}>
                          <div style={{ height:160, background: previewBg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                            {isImage ? (<img src={url} alt={doc.type} loading="lazy" style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }} />) : isPdf ? (<span style={{ color:'#64748b' }}>PDF Preview</span>) : (<span style={{ color:'#64748b' }}>File</span>)}
                          </div>
                          <div style={{ padding:10, fontSize:13 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                              <div style={{ fontWeight:600, textTransform:'capitalize' }}>{String(doc.type || '').replace('_',' ')}</div>
                              <div className="muted" style={{ fontSize:12 }}>{formatBytes(doc.size_bytes)}</div>
                            </div>
                            <div className="muted" style={{ fontSize:12, marginBottom:8, color: mutedColor }}>{doc.created_at ? new Date(doc.created_at).toLocaleString() : ''}</div>
                            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                              <a href={url} target="_blank" rel="noreferrer" style={{ ...buttonOutlineS, height:36, padding:'0 12px', borderRadius:8 }}>Open</a>
                              <a href={url} download style={{ ...buttonOutlineS, height:36, padding:'0 12px', borderRadius:8 }}>Download</a>
                              <button type="button" onClick={() => deleteDoc(doc.id)} style={{ ...buttonOutlineS, height:36, padding:'0 12px', borderRadius:8 }}>Delete</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:10, marginTop:16 }}>
                  <button type="button" onClick={prev} style={buttonOutlineS}>Back</button>
                  {(!myApplication || showNewApp) && (
                    <button className="auth-btn" type="button" onClick={finalizeApplication} disabled={submitting || !chosenTenantId} style={{ height:44, padding:'0 16px', borderRadius:10, margin:0 }}>{submitting ? 'Submitting…' : 'Submit Application'}</button>
                  )}
                  {myApplication && !showNewApp && (
                    <button type="button" onClick={exitWizard} style={{ height:44, padding:'0 16px', borderRadius:10, margin:0, background:'#111827', color:'#fff' }}>Close</button>
                  )}
                </div>
                {submitError && (<div style={{ color:'#b42318', background:'#fee4e2', border:'1px solid #fda29b', padding:10, borderRadius:8, marginTop:10 }}>{String(submitError)}</div>)}
                {submitOk && (<div style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:12, marginTop:10 }}><div style={{ fontWeight:600 }}>Application submitted.</div><div style={{ marginTop:4 }}>We’ll email you once your application is reviewed.</div></div>)}
              </div>
            )}
          </>
        )}
      </Modal>
    )}

    {user && (role === 'contributor' || role === 'org_admin') && (
      <div className="card" style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, boxShadow:'0 1px 2px rgba(0,0,0,0.04)', marginTop:16 }}>
        <div className="card-header" style={{ padding:'12px 16px', borderBottom:'1px solid #f3f4f6' }}><h2 className="card-title" style={{ margin:0, fontSize:18, fontWeight:600 }}>Your Organization</h2></div>
        <div className="card-body" style={{ padding:16 }}>You are already a {role === 'org_admin' ? 'Organization Admin' : 'Contributor'}. Organization application is not needed.</div>
      </div>
    )}

    {user && role === 'superadmin' && (
      <div className="card" style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, boxShadow:'0 1px 2px rgba(0,0,0,0.04)', marginTop:16 }}>
        <div className="card-header" style={{ padding:'12px 16px', borderBottom:'1px solid #f3f4f6' }}><h2 className="card-title" style={{ margin:0, fontSize:18, fontWeight:600 }}>Admin View</h2></div>
        <div className="card-body" style={{ padding:16 }}>This page is meant for end users to complete KYC and apply to organizations. As a Superadmin, you can access reviews and decisions from the admin dashboard.</div>
      </div>
    )}
  </>);

  if (embedded) return content;
  const header = (<div className="page-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}><div><h1 className="page-title" style={{ margin:0, fontWeight:700 }}>Join an Organization</h1><div className="page-subtitle" style={{ marginTop:6 }}>Provide basic details and upload your ID so org admins can review your request.</div></div></div>);
  return (<div className="content-page" style={{ backgroundColor:'#fff', color:'#111827' }}>{header}{content}</div>);
}

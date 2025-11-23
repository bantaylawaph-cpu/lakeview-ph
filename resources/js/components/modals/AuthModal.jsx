// resources/js/components/AuthModal.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  api, setToken, requestRegisterOtp, verifyRegisterOtp, 
  requestForgotOtp, verifyForgotOtp, resetWithTicket, resendOtp, me as fetchMe } 
  from "../../lib/api";
import { setCurrentUser } from "../../lib/authState";
import { alertSuccess, alertError, alertInfo } from "../../lib/alerts";
import Modal from "../../components/Modal";
import { FiX, FiEye, FiEyeOff, FiCheck, FiAlertCircle } from "react-icons/fi";
import TermsModal from "./TermsModal";

export default function AuthModal({ open, onClose, mode: initialMode = "login" }) {
  const navigate = useNavigate();

  // Modes: 'login' | 'register' | 'forgot' | 'verify' | 'reset'
  const [mode, setMode] = useState(initialMode);

  // Shared
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  // Register
  const [fullName, setFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPassword2, setRegPassword2] = useState("");
  const [occupation, setOccupation] = useState("");
  const [occupationOther, setOccupationOther] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // Forgot/Verify/Reset
  const [verifyContext, setVerifyContext] = useState(null); // 'register' | 'reset'
  const [verifyEmail, setVerifyEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0); // seconds
  const [ticket, setTicket] = useState(null);

  // Reset confirm password
  const [password2, setPassword2] = useState(""); // <-- added

  // Show / hide password toggles
  const [showPwd, setShowPwd] = useState({
    login: false,
    reg1: false,
    reg2: false,
    reset1: false,
    reset2: false,
  });

  // Derived
  const passwordsMatch = regPassword.length > 0 && regPassword === regPassword2;
  const canResend = resendIn <= 0;
  const strongPassword = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(regPassword);
  const passwordCriteria = [
    { label: 'At least 8 characters', ok: regPassword.length >= 8 },
    { label: '1 uppercase letter', ok: /[A-Z]/.test(regPassword) },
    { label: '1 number', ok: /\d/.test(regPassword) },
    { label: '1 special character', ok: /[^A-Za-z0-9]/.test(regPassword) },
  ];

  useEffect(() => { setMode(initialMode); }, [initialMode]);

  useEffect(() => {
    if (!open) {
      setErr("");
      setLoading(false);

      // login fields
      setEmail("");
      setPassword("");
      setRemember(false);

      // register fields
      setFullName("");
      setRegEmail("");
      setRegPassword("");
      setRegPassword2("");
      setOccupation("");
      setOccupationOther("");
      setTermsAccepted(false);

      // otp/reset
      setVerifyContext(null);
      setVerifyEmail("");
      setOtp("");
      setResendIn(0);
      setTicket(null);

      // reset password fields
      setPassword2("");

      // reset visibility toggles
      setShowPwd({ login: false, reg1: false, reg2: false, reset1: false, reset2: false });

      // ensure any nested modals (terms) are also closed
      setShowTerms(false);

      // critical: reset mode back to initial when modal is closed so next open starts clean
      setMode(initialMode || "login");
    } else {
      // when opening, ensure we begin from the requested mode (usually 'login')
      setMode(initialMode || "login");
      setErr("");
    }
  }, [open]);

  // resend countdown
  useEffect(() => {
    if (mode !== "verify" || resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [mode, resendIn]);

  function redirectByRole(user) {
    if (!user) { navigate('/', { replace: true }); return; }
    // Defensive: derive role name from role or role_id mapping if needed
    let role = user.role;
    if (!role && user.role_id != null) {
      // fallback mapping assumes roles seeded in canonical order but queries backend if needed later
      const idMap = { 1:'public', 2:'contributor', 3:'org_admin', 4:'superadmin' };
      role = idMap[user.role_id] || 'public';
    }
    if (!role) role = 'public';
  // no-op: removed debug logging
    if (role === "superadmin") navigate("/admin-dashboard", { replace: true });
    else if (role === "org_admin") navigate("/org-dashboard", { replace: true });
    else if (role === "contributor") navigate("/contrib-dashboard", { replace: true });
    else navigate("/", { replace: true });
  }

  function extractMessage(errLike, fallback) {
    try {
      const j = JSON.parse(errLike?.message ?? "");
      if (j?.errors) {
        const first = Object.values(j.errors).flat()[0];
        return typeof first === "string" ? first : fallback;
      }
      if (j?.message) return j.message;
    } catch {}
    return fallback;
  }

  /* =========================
   * LOGIN
   * ========================= */
  async function handleLogin(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await api("/auth/login", {
        method: "POST",
        auth: false,
        body: { email, password, remember },
      });

      if (res?.token) setToken(res.token, { remember });

      // Backend returns user under res.data; fallback to fetching /auth/me if absent
      let finalUser = res?.data || res?.user || null;
      if (!finalUser || !finalUser.role) {
        try { finalUser = await fetchMe({ maxAgeMs: 60 * 1000 }); } catch { /* ignore */ }
      }

      // Optimistic propagation to sidebar / other listeners
      if (finalUser) setCurrentUser(finalUser);

  if (finalUser?.tenant_id) localStorage.setItem('tenant_id', finalUser.tenant_id);
      else localStorage.removeItem('tenant_id');

      alertSuccess('Welcome back!', 'Login successful.');
      redirectByRole(finalUser);
      onClose?.();
    } catch (e2) {
      const msg = extractMessage(e2, "Invalid email or password.");
      setErr(msg);
      alertError("Login failed", msg);
    } finally {
      setPassword("");
      setLoading(false);
    }
  }

  /* =========================
   * REGISTER (→ OTP)
   * ========================= */
  async function handleRegister(e) {
    e.preventDefault();
    setErr("");

    if (!passwordsMatch) {
      setErr("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const out = await requestRegisterOtp({
        name: fullName,
        email: regEmail,
        password: regPassword,
        password_confirmation: regPassword2,
      });

      setVerifyContext("register");
      setVerifyEmail(regEmail);
      setMode("verify");
      setResendIn(out?.cooldown_seconds ?? 180);
      alertInfo("Check your inbox", "We sent a 6-digit code to verify your email.");
    } catch (e2) {
      const msg = extractMessage(e2, "Registration failed. Please review your entries.");
      setErr(msg);
      alertError("Registration failed", msg);
    } finally {
      setLoading(false);
    }
  }

  /* =========================
   * FORGOT (→ OTP)
   * ========================= */
  async function handleForgotStart(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const out = await requestForgotOtp({ email });
      setVerifyContext("reset");
      setVerifyEmail(email);
      setMode("verify");
      setResendIn(out?.cooldown_seconds ?? 180);
      alertInfo("Check your inbox", "We sent a 6-digit code to verify your email.");
    } catch (e2) {
      const msg = extractMessage(e2, "Please try again.");
      setErr(msg);
      alertError("Error", msg);
    } finally {
      setLoading(false);
    }
  }

  /* =========================
   * VERIFY OTP
   * ========================= */
  async function handleVerify(e) {
    e.preventDefault();
    if (otp.length !== 6) return;
    setErr("");
    setLoading(true);
    try {
      if (verifyContext === "register") {
        const out = await verifyRegisterOtp({ email: verifyEmail, code: otp, remember });
        if (out?.token) setToken(out.token, { remember });
  const me = await fetchMe({ maxAgeMs: 5 * 60 * 1000 });
  if (me) setCurrentUser(me);
  alertSuccess("Registered", "Welcome to LakeView PH!");
        // Do not redirect after registration verify; keep user on the current page
        onClose?.();

        // clear registration fields
        setFullName("");
        setRegEmail("");
        setRegPassword("");
        setRegPassword2("");
        setOccupation("");
        setOccupationOther("");
      } else {
        const out = await verifyForgotOtp({ email: verifyEmail, code: otp });
        setTicket(out?.ticket || null);
        setMode("reset");
        setPassword("");
        setPassword2("");
        alertSuccess("Email verified", "Please set a new password.");
      }
    } catch (e2) {
      const msg = extractMessage(e2, "Invalid or expired code. Try again or resend.");
      setErr(msg);
      alertError("Verification failed", msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend(e) {
    e.preventDefault();
    if (!canResend) return;
    setLoading(true);
    try {
      const out = await resendOtp({
        email: verifyEmail,
        purpose: verifyContext === "register" ? "register" : "reset",
      });
      setResendIn(out?.cooldown_seconds ?? 180);
      alertInfo("Code sent", "Please check your email.");
    } catch (e2) {
      const msg = extractMessage(e2, "Please wait before requesting another code.");
      setErr(msg);
      alertError("Resend blocked", msg);
    } finally {
      setLoading(false);
    }
  }

  /* =========================
   * RESET PASSWORD (ticket)
   * ========================= */
  async function handleReset(e) {
    e.preventDefault();
    setErr("");

    if (password !== password2) {
      setErr("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetWithTicket({
        ticket,
        password,
        password_confirmation: password2,
      });
      alertSuccess("Password updated", "You can now sign in with your new password.");
      setMode("login");
      setEmail(verifyEmail);
      setPassword("");
      setPassword2("");
    } catch (e2) {
      const msg = extractMessage(e2, "Please check your new password.");
      setErr(msg);
      alertError("Reset failed", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => { try { setShowTerms(false); } catch {} ; onClose?.(); }}
      header={false}
      width={760}
      ariaLabel="Authentication dialog"
      cardClassName="no-bg no-padding"
      bodyClassName="auth-modal-body modern-scrollbar"
    >
  <div className="auth-box" style={{ position: "relative" }}>
        {/* Close */}
        <button
          type="button"
          className="auth-exit-btn"
          onClick={() => onClose?.()}
          aria-label="Close authentication modal"
        >
          <FiX size={20} />
        </button>

        <div className="auth-form">
          <div className="auth-brand">
            <img src="/lakeview-logo-alt.webp" alt="LakeView PH" />
            <span>LakeView PH</span>
          </div>

          {/* ====== headings per mode ====== */}
          {mode === "login" && (<><h2>Welcome Back</h2><p className="auth-subtitle">Log in to continue to LakeView PH</p></>)}
          {mode === "register" && (<><h2>Create a New Account</h2><p className="auth-subtitle">Sign up to access LakeView PH</p></>)}
          {mode === "forgot" && (<><h2>Forgot Password</h2><p className="auth-subtitle">Enter your email to receive a verification code</p></>)}
          {mode === "verify" && (<><h2>Email Verification</h2><p className="auth-subtitle">We sent a 6-digit code to <strong>{verifyEmail}</strong></p></>)}
          {mode === "reset" && (<><h2>Set New Password</h2><p className="auth-subtitle">Email: <strong>{verifyEmail}</strong></p></>)}

          {err ? <div className="auth-error" role="alert">{err}</div> : null}

          {/* ===== LOGIN ===== */}
          {mode === "login" && (
            <form onSubmit={handleLogin}>
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              <div className="pw-wrapper">
                <input
                  type={showPwd.login ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="pw-toggle"
                  aria-label={showPwd.login ? "Hide password" : "Show password"}
                  onClick={() => setShowPwd((p) => ({ ...p, login: !p.login }))}
                >
                  {showPwd.login ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              <div className="auth-options-right single">
                <label className="auth-remember auth-remember-right">
                  <span>Remember me</span>
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                </label>
              </div>

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? "Logging in..." : "LOG IN"}
              </button>

              <div className="auth-inline">
                <button type="button" className="auth-link" onClick={() => { setShowTerms(false); setMode("forgot"); setErr(""); setEmail(email); }}>Forgot your password?</button>
                <span />
              </div>

              <p className="auth-switch">Don’t have an account? <button type="button" className="auth-link" onClick={() => { setShowTerms(false); setMode("register"); }}>Sign Up</button></p>
            </form>
          )}

          {/* ===== REGISTER ===== */}
          {mode === "register" && (
            <form onSubmit={handleRegister}>
              <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required />
              <input type="email" placeholder="Email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} autoComplete="email" required />
              <div className="pw-wrapper">
                <input
                  type={showPwd.reg1 ? "text" : "password"}
                  placeholder="Password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="pw-toggle"
                  aria-label={showPwd.reg1 ? "Hide password" : "Show password"}
                  onClick={() => setShowPwd((p) => ({ ...p, reg1: !p.reg1 }))}
                >
                  {showPwd.reg1 ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              <div className="pw-wrapper">
                <input
                  type={showPwd.reg2 ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={regPassword2}
                  onChange={(e) => setRegPassword2(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="pw-toggle"
                  aria-label={showPwd.reg2 ? "Hide confirm password" : "Show confirm password"}
                  onClick={() => setShowPwd((p) => ({ ...p, reg2: !p.reg2 }))}
                >
                  {showPwd.reg2 ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {!passwordsMatch && regPassword2.length > 0 && (<div className="auth-error" role="alert">Passwords do not match.</div>)}

              {/* Password strength & criteria */}
              <div className="password-strength" aria-live="polite">
                <div className={`bar ${strongPassword ? 'ok' : ''}`}></div>
                <ul className="criteria">
                  {passwordCriteria.map(c => (
                    <li key={c.label} className={c.ok ? 'ok' : 'bad'}>
                      {c.ok ? <FiCheck /> : <FiAlertCircle />} {c.label}
                    </li>
                  ))}
                </ul>
              </div>

              <label className="auth-label" htmlFor="occupation">Occupation</label>
              <select id="occupation" value={occupation} onChange={(e) => setOccupation(e.target.value)} className="auth-select" required aria-required="true">
                <option value="">Select occupation</option>
                <option value="student">Student</option>
                <option value="researcher">Researcher</option>
                <option value="government">Government</option>
                <option value="ngo">NGO</option>
                <option value="fisherfolk">Fisherfolk / Coop</option>
                <option value="local_resident">Local resident</option>
                <option value="faculty">Academic / Faculty</option>
                <option value="consultant">Private sector / Consultant</option>
                <option value="tourist">Tourist / Visitor</option>
                <option value="other">Other (specify)</option>
              </select>

              {occupation === "other" && (
                <input type="text" placeholder="Please specify your occupation" value={occupationOther} onChange={(e)=> setOccupationOther(e.target.value)} required />
              )}

              <div className="auth-hint">Your password must satisfy all criteria above.</div>

              {/* Right-aligned Remember + Terms */}
              <div className="auth-options-right">
                <label className="auth-remember auth-remember-right">
                  <span>Remember me after verify</span>
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                </label>
                <label className="auth-remember auth-remember-right">
                  <span>I agree to the <button type="button" className="auth-link inline" onClick={() => setShowTerms(true)}>Terms & Conditions</button></span>
                  <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} required />
                </label>
                {!termsAccepted && regPassword.length > 0 && (<div className="terms-warning" role="alert">Please accept Terms & Conditions.</div>)}
              </div>

              <button type="submit" className="auth-btn" disabled={loading || !passwordsMatch || !strongPassword || !termsAccepted}>
                {loading ? "Sending code..." : (!strongPassword ? 'Password not strong enough' : !termsAccepted ? 'Accept Terms to Continue' : 'REGISTER')}
              </button>

              <p className="auth-switch">Already have an account? <button type="button" className="auth-link" onClick={() => { setShowTerms(false); setMode("login"); }}>Log In</button></p>
            </form>
          )}

          {/* ===== FORGOT ===== */}
          {mode === "forgot" && (
            <form onSubmit={handleForgotStart}>
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              <button type="submit" className="auth-btn" disabled={loading}>{loading ? "Sending code..." : "SEND CODE"}</button>
              <p className="auth-switch">Remembered it? <button type="button" className="auth-link" onClick={() => setMode("login")}>Back to Log In</button></p>
            </form>
          )}

          {/* ===== VERIFY ===== */}
          {mode === "verify" && (
            <form onSubmit={handleVerify}>
              <input className="auth-otp-input" inputMode="numeric" pattern="\d{6}" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter 6-digit code" autoFocus required />
              <div className="auth-row">
                <button type="submit" className="auth-btn" disabled={loading || otp.length !== 6}>{loading ? "Verifying..." : "VERIFY"}</button>
                <button type="button" className="auth-btn auth-btn-secondary" onClick={handleResend} disabled={!canResend || loading}>
                  {canResend ? "RESEND CODE" : `RESEND IN ${Math.floor(resendIn/60)}:${String(resendIn%60).padStart(2,"0")}`}
                </button>
              </div>
              <p className="auth-switch">Wrong email? <button type="button" className="auth-link" onClick={() => setMode("login")}>Back to Log In</button></p>
            </form>
          )}

          {/* ===== RESET ===== */}
          {mode === "reset" && (
            <form onSubmit={handleReset}>
              <div className="pw-wrapper">
                <input
                  type={showPwd.reset1 ? "text" : "password"}
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="pw-toggle"
                  aria-label={showPwd.reset1 ? "Hide new password" : "Show new password"}
                  onClick={() => setShowPwd((p) => ({ ...p, reset1: !p.reset1 }))}
                >
                  {showPwd.reset1 ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              <div className="pw-wrapper">
                <input
                  type={showPwd.reset2 ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="pw-toggle"
                  aria-label={showPwd.reset2 ? "Hide confirm new password" : "Show confirm new password"}
                  onClick={() => setShowPwd((p) => ({ ...p, reset2: !p.reset2 }))}
                >
                  {showPwd.reset2 ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {password !== password2 && password2.length > 0 && (<div className="auth-error" role="alert">Passwords do not match.</div>)}
              <button type="submit" className="auth-btn" disabled={loading || password !== password2}>{loading ? "Updating..." : "UPDATE PASSWORD"}</button>
              <p className="auth-switch">Back to <button type="button" className="auth-link" onClick={() => setMode("login")}>Log In</button></p>
            </form>
          )}
        </div>
        <TermsModal open={showTerms} onClose={() => setShowTerms(false)} />
      </div>
    </Modal>
  );
}

// resources/js/components/AuthModal.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  api, setToken, requestRegisterOtp, verifyRegisterOtp, 
  requestForgotOtp, verifyForgotOtp, resetWithTicket, resendOtp } 
  from "../../lib/api";
import { alertSuccess, alertError, alertInfo } from "../../utils/alerts";
import Modal from "../../components/Modal";
import { FiX } from "react-icons/fi";

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

  // Forgot/Verify/Reset
  const [verifyContext, setVerifyContext] = useState(null); // 'register' | 'reset'
  const [verifyEmail, setVerifyEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0); // seconds
  const [ticket, setTicket] = useState(null);

  // Reset confirm password
  const [password2, setPassword2] = useState(""); // <-- added

  // Derived
  const passwordsMatch = regPassword.length > 0 && regPassword === regPassword2;
  const canResend = resendIn <= 0;

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

      // otp/reset
      setVerifyContext(null);
      setVerifyEmail("");
      setOtp("");
      setResendIn(0);
      setTicket(null);

      // reset password fields
      setPassword2("");
    }
  }, [open]);

  // resend countdown
  useEffect(() => {
    if (mode !== "verify" || resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [mode, resendIn]);

  function redirectByRole(user) {
    const role = user?.role || "public";
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

      if (res?.token) {
        setToken(res.token, { remember });
      }
      const me = await api("/auth/me");

      alertSuccess("Welcome back!", "Login successful.");
      redirectByRole(me);
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
        const me = await api("/auth/me");
        alertSuccess("Registered & verified", "Welcome to LakeView PH!");
        redirectByRole(me);
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
      onClose={onClose}
      header={false}
      width={600}
      ariaLabel="Authentication dialog"
      cardClassName="no-bg no-padding"
    >
      <div className="auth-box" style={{ width: 560, position: "relative" }}>
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
            <img src="/lakeview-logo-alt.png" alt="LakeView PH" />
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
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />

              <label className="auth-remember">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span>Remember me</span>
              </label>

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? "Logging in..." : "LOG IN"}
              </button>

              <div className="auth-inline">
                <button type="button" className="auth-link" onClick={() => { setMode("forgot"); setErr(""); setEmail(email); }}>Forgot your password?</button>
                <span />
              </div>

              <p className="auth-switch">Don’t have an account? <button type="button" className="auth-link" onClick={() => setMode("register")}>Sign Up</button></p>
            </form>
          )}

          {/* ===== REGISTER ===== */}
          {mode === "register" && (
            <form onSubmit={handleRegister}>
              <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required />
              <input type="email" placeholder="Email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} autoComplete="email" required />
              <input type="password" placeholder="Password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} autoComplete="new-password" required />
              <input type="password" placeholder="Confirm Password" value={regPassword2} onChange={(e) => setRegPassword2(e.target.value)} autoComplete="new-password" required />
              {!passwordsMatch && regPassword2.length > 0 && (<div className="auth-error" role="alert">Passwords do not match.</div>)}

              <label className="auth-label" htmlFor="occupation">Occupation</label>
              <select id="occupation" value={occupation} onChange={(e) => setOccupation(e.target.value)} className="auth-select">
                <option value="">Select occupation</option>
                <option value="student">Student</option>
                <option value="researcher">Researcher</option>
                <option value="gov_staff">Government staff</option>
                <option value="ngo_worker">NGO worker</option>
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

              <div className="auth-hint">Use at least 8 characters for a strong password.</div>

              <label className="auth-remember">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span>Remember me after verify</span>
              </label>

              <button type="submit" className="auth-btn" disabled={loading || !passwordsMatch}>
                {loading ? "Sending code..." : "REGISTER"}
              </button>

              <p className="auth-switch">Already have an account? <button type="button" className="auth-link" onClick={() => setMode("login")}>Log In</button></p>
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
              <input type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
              <input type="password" placeholder="Confirm new password" value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" required />
              {password !== password2 && password2.length > 0 && (<div className="auth-error" role="alert">Passwords do not match.</div>)}
              <button type="submit" className="auth-btn" disabled={loading || password !== password2}>{loading ? "Updating..." : "UPDATE PASSWORD"}</button>
              <p className="auth-switch">Back to <button type="button" className="auth-link" onClick={() => setMode("login")}>Log In</button></p>
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
}

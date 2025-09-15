// resources/js/components/AuthModal.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "./Modal";
import { api, setToken } from "../lib/api";
import { alertSuccess, alertError } from "../utils/alerts";
import { FiX } from "react-icons/fi";

export default function AuthModal({ open, onClose, mode: initialMode = "login" }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'

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
  const [regPassword2, setRegPassword2] = useState(""); // confirm password
  const [occupation, setOccupation] = useState("");
  const [occupationOther, setOccupationOther] = useState("");

  // Derived: password match (register)
  const passwordsMatch = regPassword.length > 0 && regPassword === regPassword2;

  useEffect(() => { setMode(initialMode); }, [initialMode]);

  useEffect(() => {
    if (!open) {
      setErr("");
      setLoading(false);
      setEmail(""); setPassword(""); setRemember(true);
      setFullName(""); setRegEmail(""); setRegPassword(""); setRegPassword2("");
      setOccupation(""); setOccupationOther("");
      setRemember(false);
    }
  }, [open]);

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

  async function handleLogin(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await api("/auth/login", {
        method: "POST",
        auth: false,
        body: { email, password, remember }, // send remember to backend
      });

      if (res?.token) {
        setToken(res.token, { remember }); // store synchronously
      }

      // Confirm role from the source of truth
      const me = await api("/auth/me"); // uses the freshly stored token

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

  async function handleRegister(e) {
    e.preventDefault();
    setErr("");

    // Frontend confirm-password guard
    if (!passwordsMatch) {
      setErr("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const body = {
        full_name: fullName,
        email: regEmail,
        password: regPassword,
        password_confirmation: regPassword2, // allow Laravel 'confirmed' rule
        occupation: occupation || null,
        occupation_other: occupation === "other" ? (occupationOther || null) : null,
      };

      const res = await api("/auth/register", {
        method: "POST",
        auth: false,
        body,
      });

      await alertSuccess("Account created", "Please log in to continue.");

      // Switch modal to LOGIN mode and prefill email
      setMode("login");
      setEmail(regEmail);
      setPassword(""); // clear any junk
      // Clear register form fields
      setFullName("");
      setRegEmail("");
      setRegPassword("");
      setRegPassword2("");
      setOccupation("");
      setOccupationOther("");

      if (res?.token) {
        // If you auto-login new public users:
        setToken(res.token, { remember: true }); // new users generally want persistence
        alertSuccess("Account created", "Welcome to LakeView PH!");
        navigate("/", { replace: true });
      } else {
        alertSuccess("Account created", res?.message || "You can now sign in.");
        navigate("/login", { replace: true });
      }
      onClose?.();
    } catch (e2) {
      const msg = extractMessage(e2, "Registration failed. Please review your entries.");
      setErr(msg);
      alertError("Registration failed", msg);
    } finally {
      setRegPassword("");
      setRegPassword2("");
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

          {mode === "login" ? (
            <>
              <h2>Welcome Back</h2>
              <p className="auth-subtitle">Log in to continue to LakeView PH</p>
            </>
          ) : (
            <>
              <h2>Create a New Account</h2>
              <p className="auth-subtitle">Sign up to access LakeView PH</p>
            </>
          )}

          {err ? <div className="auth-error" role="alert">{err}</div> : null}

          {mode === "login" ? (
            <form onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />

              {/* Remember me */}
              <label className="auth-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Remember me</span>
              </label>

              <div className="auth-forgot">Forgot your password?</div>
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? "Logging in..." : "LOG IN"}
              </button>
              <p className="auth-switch">
                Don’t have an account?{" "}
                <button type="button" className="auth-link" onClick={() => setMode("register")}>
                  Sign Up
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <input
                type="password"
                placeholder="Confirm Password"
                value={regPassword2}
                onChange={(e) => setRegPassword2(e.target.value)}
                autoComplete="new-password"
                required
              />
              {!passwordsMatch && regPassword2.length > 0 && (
                <div className="auth-error" role="alert">Passwords do not match.</div>
              )}

              {/* Occupation (public users) */}
              <label className="auth-label" htmlFor="occupation">Occupation</label>
              <select
                id="occupation"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="auth-select"
              >
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
                <input
                  type="text"
                  placeholder="Please specify your occupation"
                  value={occupationOther}
                  onChange={(e)=> setOccupationOther(e.target.value)}
                  required
                />
              )}

              <div className="auth-hint">Use at least 8 characters for a strong password.</div>
              <button type="submit" className="auth-btn" disabled={loading || !passwordsMatch}>
                {loading ? "Creating account..." : "REGISTER"}
              </button>
              <p className="auth-switch">
                Already have an account?{" "}
                <button type="button" className="auth-link" onClick={() => setMode("login")}>
                  Log In
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
}

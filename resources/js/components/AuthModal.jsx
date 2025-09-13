// resources/js/components/AuthModal.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "./Modal";

export default function AuthModal({ open, onClose, mode: initialMode = "login" }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'

  // Shared state
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Registration form state
  const [fullName, setFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (!open) {
      // Reset state when closing
      setErr("");
      setLoading(false);
      setEmail("");
      setPassword("");
      setFullName("");
      setRegEmail("");
      setRegPassword("");
    }
  }, [open]);

  async function handleLogin(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Login failed");
      }
      const { token, user } = await res.json();
      localStorage.setItem("lv_token", token);

      const role = user?.role || "public";
      if (role === "superadmin") navigate("/admin-dashboard", { replace: true });
      else if (role === "org_admin") navigate("/org-dashboard", { replace: true });
      else if (role === "contributor") navigate("/contrib-dashboard", { replace: true });
      else navigate("/", { replace: true });
      onClose?.();
    } catch (e) {
      setErr("Invalid email or password.");
    } finally {
      setPassword("");
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, email: regEmail, password: regPassword }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Registration failed");
      }
      const { token } = await res.json();
      localStorage.setItem("lv_token", token);
      navigate("/", { replace: true });
      onClose?.();
    } catch (e) {
      setErr("Registration failed. Email may already be registered.");
    } finally {
      setRegPassword("");
      setLoading(false);
    }
  }

  const title = mode === "login" ? "Log in" : "Register";

  return (
    <Modal
      open={open}
      onClose={onClose}
      header={false}
      width={600}
      ariaLabel="Authentication dialog"
      cardClassName="no-bg no-padding"
    >
      {/* Replicate the original auth page card inside the modal */}
      <div className="auth-box" style={{ width: 560 }}>
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

          {err ? <div className="auth-error">{err}</div> : null}

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
              <div className="auth-hint">Use at least 8 characters for a strong password.</div>
              <button type="submit" className="auth-btn" disabled={loading}>
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

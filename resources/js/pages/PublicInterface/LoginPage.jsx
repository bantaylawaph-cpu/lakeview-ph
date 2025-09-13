// resources/js/pages/PublicInterface/LoginPage.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
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
    } catch (e) {
      setErr("Invalid email or password.");
    } finally {
      // Clear sensitive input from memory/DOM
      setPassword("");
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        {/* Single Column Form */}
        <div className="auth-form">
          <div className="auth-brand">
            <img src="/lakeview-logo-alt.png" alt="LakeView PH" />
            <span>LakeView PH</span>
          </div>
          
          <h2>Welcome Back</h2>
          <p className="auth-subtitle">Log in to continue to LakeView PH</p>

          {err ? <div className="auth-error">{err}</div> : null}

          <form onSubmit={handleSubmit}>
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
          </form>

          <p className="auth-switch">
            Don’t have an account?{" "}
            <Link to="/register" className="auth-link">
              Sign Up
            </Link>
          </p>
          <div className="auth-back-row">
            <Link to="/" className="auth-back" title="Back to LakeView">
              <FiArrowLeft size={16} />
              <span>Back to LakeView</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// resources/js/pages/PublicInterface/RegistrationPage.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function RegistrationPage() {
  const navigate = useNavigate();
  const [full_name, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name, email, password }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Registration failed");
      }

      // API returns token + user (role will be "public" by default)
      const { token } = await res.json();
      localStorage.setItem("lv_token", token);

      // Send new users to public interface (or a welcome page)
      navigate("/", { replace: true });
    } catch (e) {
      setErr("Registration failed. Email may already be registered.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        {/* Left Illustration (kept) */}
        <div
          className="auth-illustration"
          style={{ backgroundImage: "url('/register-illustration.png')" }}
        />

        {/* Right Form (kept) */}
        <div className="auth-form">
          <h2>Create a New Account</h2>
          <p className="auth-subtitle">Sign up to access LakeView PH</p>

          {err ? <div className="auth-error">{err}</div> : null}

          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Full Name"
              value={full_name}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              required
            />
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
              autoComplete="new-password"
              required
            />

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? "Creating account..." : "REGISTER"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{" "}
            <Link to="/signin" className="auth-link">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// src/pages/Login.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // ✅ For now, skip authentication
    navigate("/admin-dashboard");
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        {/* Left Illustration */}
        <div
          className="auth-illustration"
          style={{ backgroundImage: "url('/login-illustration.png')" }}
        ></div>

        {/* Right Form */}
        <div className="auth-form">
          <h2>Welcome Back</h2>
          <p className="auth-subtitle">Log in to continue to LakeView PH</p>

          <form onSubmit={handleSubmit}>
            <input type="text" placeholder="Username" />
            <input type="password" placeholder="Password" />

            <p className="auth-forgot">Forgot Password?</p>

            <button type="submit" className="auth-btn">
              LOG IN
            </button>
          </form>

          <p className="auth-switch">
            Don’t have an account?{" "}
            <Link to="/register" className="auth-link">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;

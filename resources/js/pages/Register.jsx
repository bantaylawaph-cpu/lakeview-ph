// src/pages/Register.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();
  const [occupation, setOccupation] = useState("");
  const [customOccupation, setCustomOccupation] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // ✅ For now, skip registration logic
    navigate("/signin");
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        {/* Left Illustration */}
        <div
          className="auth-illustration"
          style={{ backgroundImage: "url('/register-illustration.png')" }}
        ></div>

        {/* Right Form */}
        <div className="auth-form">
          <h2>Create a New Account</h2>
          <p className="auth-subtitle">
            Please enter details below to register for LakeView PH
          </p>

          <form onSubmit={handleSubmit}>
            <input type="text" placeholder="Full Name" />
            <input type="email" placeholder="Email" />

            {/* Occupation dropdown */}
            <select
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
            >
              <option value="">Occupation</option>
              <option>Student</option>
              <option>Researcher</option>
              <option>Professional</option>
              <option>Other</option>
            </select>

            {/* Show input if "Other" is selected */}
            {occupation === "Other" && (
              <input
                type="text"
                placeholder="Enter your occupation"
                value={customOccupation}
                onChange={(e) => setCustomOccupation(e.target.value)}
              />
            )}

            <input type="text" placeholder="Affiliation (Optional)" />
            <input type="password" placeholder="Password" />

            {/* Checkbox */}
            <label className="auth-checkbox">
              <input type="checkbox" />
              <span>I accept Terms and Conditions</span>
            </label>

            <button type="submit" className="auth-btn">
              REGISTER
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

export default Register;

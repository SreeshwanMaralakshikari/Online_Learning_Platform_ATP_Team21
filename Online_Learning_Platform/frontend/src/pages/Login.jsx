import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../axiosInstance";

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await axiosInstance.post("/auth/login", form);
      // Pass both user payload and token — AuthContext saves token to localStorage
      login(res.data.payload, res.data.token);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <style>{`
        .login-root {
          min-height: 100vh;
          background-color: #020617;
          background-image:
            radial-gradient(ellipse 80% 60% at 20% 10%, rgba(37,99,235,0.34) 0%, transparent 60%),
            radial-gradient(ellipse 70% 55% at 80% 85%, rgba(14,165,233,0.22) 0%, transparent 58%),
            linear-gradient(135deg, #020617 0%, #08111f 42%, #0f172a 100%),
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Ccircle cx='30' cy='30' r='0.7' fill='%2338bdf8' opacity='0.28'/%3E%3C/svg%3E");
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          font-family: 'DM Sans', sans-serif;
        }

        .login-card {
          width: 100%;
          max-width: 980px;
          background: rgba(2,6,23,0.78);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(59,130,246,0.32);
          border-radius: 28px;
          box-shadow:
            0 4px 10px rgba(0,0,0,0.28),
            0 24px 70px rgba(2,6,23,0.55),
            0 0 0 1px rgba(125,211,252,0.12) inset;
          display: grid;
          grid-template-columns: 1fr 1fr;
          overflow: hidden;
          min-height: 580px;
        }

        @media (max-width: 720px) {
          .login-card { grid-template-columns: 1fr; }
          .login-left { display: none; }
        }

        /* ── Left panel ── */
        .login-left {
          background: linear-gradient(145deg, #020617 0%, #0f172a 38%, #0b4f8a 100%);
          padding: 52px 48px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }

        .login-left::before {
          content: '';
          position: absolute;
          top: -80px; right: -80px;
          width: 280px; height: 280px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(56,189,248,0.24) 0%, transparent 70%);
        }

        .login-left::after {
          content: '';
          position: absolute;
          bottom: -60px; left: -60px;
          width: 240px; height: 240px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%);
        }

        .left-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .left-logo-icon {
          width: 38px; height: 38px;
          background: linear-gradient(135deg, #38bdf8, #2563eb);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 18px rgba(37,99,235,0.42);
        }

        .left-logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.3px;
        }

        .left-hero {
          position: relative; z-index: 1;
        }

        .left-eyebrow {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          margin-bottom: 16px;
        }

        .left-heading {
          font-family: 'Playfair Display', serif;
          font-size: 32px;
          font-weight: 700;
          color: #fff;
          line-height: 1.25;
          margin-bottom: 20px;
        }

        .left-heading span {
          color: #38bdf8;
        }

        .left-desc {
          font-size: 13px;
          line-height: 1.8;
          color: rgba(255,255,255,0.45);
          max-width: 280px;
        }

        .left-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          position: relative; z-index: 1;
        }

        .stat-box {
          background: rgba(14,165,233,0.08);
          border: 1px solid rgba(125,211,252,0.16);
          border-radius: 14px;
          padding: 14px 16px;
        }

        .stat-number {
          font-family: 'Playfair Display', serif;
          font-size: 22px;
          font-weight: 700;
          color: #38bdf8;
          line-height: 1;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 11px;
          color: rgba(255,255,255,0.35);
        }

        /* ── Right panel ── */
        .login-right {
          padding: 52px 48px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: rgba(248,250,252,0.96);
        }

        .right-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 36px;
        }

        .right-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Playfair Display', serif;
          font-size: 15px;
          font-weight: 700;
          color: #020617;
        }

        .right-logo-icon {
          width: 32px; height: 32px;
          background: linear-gradient(135deg, #38bdf8, #2563eb);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
        }

        .badge {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #eff6ff;
          background: #0f172a;
          padding: 4px 10px;
          border-radius: 20px;
        }

        .form-heading {
          font-family: 'Playfair Display', serif;
          font-size: 28px;
          font-weight: 700;
          color: #020617;
          margin-bottom: 6px;
        }

        .form-sub {
          font-size: 13px;
          color: #8a8a9a;
          margin-bottom: 32px;
        }

        .form-sub a {
          color: #2563eb;
          font-weight: 600;
          text-decoration: none;
        }

        .form-sub a:hover { text-decoration: underline; }

        .field-label {
          display: block;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #8a8a9a;
          margin-bottom: 7px;
        }

        .field-input {
          width: 100%;
          background: #fff;
          border: 1.5px solid #cbd5e1;
          border-radius: 12px;
          padding: 13px 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #020617;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }

        .field-input::placeholder { color: #94a3b8; }

        .field-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.14);
        }

        .pw-wrap { position: relative; }

        .pw-toggle {
          position: absolute;
          right: 14px; top: 50%;
          transform: translateY(-50%);
          font-size: 11px;
          font-weight: 600;
          color: #8a8a9a;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          font-family: 'DM Sans', sans-serif;
        }

        .pw-toggle:hover { color: #2563eb; }

        .error-box {
          background: #fff0f0;
          border: 1px solid #fcd0d0;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          color: #c0392b;
        }

        .submit-btn {
          width: 100%;
          background: linear-gradient(135deg, #020617 0%, #1d4ed8 52%, #0284c7 100%);
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 18px rgba(37,99,235,0.34);
          display: flex; align-items: center; justify-content: center; gap: 8px;
          margin-top: 4px;
        }

        .submit-btn:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(37,99,235,0.42);
        }

        .submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .spinner {
          width: 15px; height: 15px;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .divider {
          display: flex; align-items: center; gap: 12px;
          margin: 20px 0;
        }

        .divider-line {
          flex: 1; height: 1px;
          background: linear-gradient(to right, transparent, #93c5fd, transparent);
        }

        .divider-text {
          font-size: 11px;
          color: #64748b;
          white-space: nowrap;
        }

        .trust-row {
          display: flex; align-items: center; justify-content: center;
          gap: 16px; flex-wrap: wrap;
        }

        .trust-item {
          display: flex; align-items: center; gap-5px;
          font-size: 11px;
          color: #a0a0b0;
          gap: 5px;
        }
      `}</style>

      <div className="login-root">
        <div className="login-card">

          {/* ── Left panel ── */}
          <div className="login-left">
            <div className="left-logo">
              <div className="left-logo-icon">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <path d="M2 12L6 4L10 9L12 6L14 12H2Z" fill="#020617"/>
                </svg>
              </div>
              <span className="left-logo-text">LearnHub</span>
            </div>

            <div className="left-hero">
              <p className="left-eyebrow">Online Learning Platform</p>
              <h2 className="left-heading">
                Learn skills that<br />
                <span>open doors.</span>
              </h2>
              <p className="left-desc">
                Thousands of expert-led courses in tech, design, and business — all in one place. Learn at your own pace, on any device.
              </p>
            </div>

            <div className="left-stats">
              <div className="stat-box">
                <div className="stat-number">200+</div>
                <div className="stat-label">Courses available</div>
              </div>
              <div className="stat-box">
                <div className="stat-number">50k+</div>
                <div className="stat-label">Active students</div>
              </div>
              <div className="stat-box">
                <div className="stat-number">98%</div>
                <div className="stat-label">Satisfaction rate</div>
              </div>
              <div className="stat-box">
                <div className="stat-number">4.9★</div>
                <div className="stat-label">Average rating</div>
              </div>
            </div>
          </div>

          {/* ── Right panel ── */}
          <div className="login-right">
            <div className="right-top">
              <div className="right-logo">
                <div className="right-logo-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 12L6 4L10 9L12 6L14 12H2Z" fill="#020617"/>
                  </svg>
                </div>
                LearnHub
              </div>
              <span className="badge">Sign In</span>
            </div>

            <h1 className="form-heading">Welcome back</h1>
            <p className="form-sub">
              Don't have an account?{" "}
              <Link to="/register">Create one free</Link>
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Email */}
              <div>
                <label className="field-label">Email address</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  className="field-input"
                />
              </div>

              {/* Password */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "7px" }}>
                  <label className="field-label" style={{ marginBottom: 0 }}>Password</label>
                  <Link to="/forgot-password" style={{ fontSize: "12px", fontWeight: 700, color: "#2563eb", textDecoration: "none" }}>
                    Forgot password?
                  </Link>
                </div>
                <div className="pw-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                    className="field-input"
                    style={{ paddingRight: "60px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="pw-toggle"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && <div className="error-box">{error}</div>}

              {/* Submit */}
              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? (
                  <><div className="spinner" /> Signing in...</>
                ) : (
                  "Sign in to LearnHub"
                )}
              </button>
            </form>

            <div className="divider">
              <div className="divider-line" />
              <span className="divider-text">safe & secure</span>
              <div className="divider-line" />
            </div>

            <div className="trust-row">
              <span className="trust-item">🔒 Encrypted</span>
              <span className="trust-item">✓ Verified platform</span>
              <span className="trust-item">⚡ Instant access</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

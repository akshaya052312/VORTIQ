/**
 * Login page — Redesigned split-screen layout with Inter typography.
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";
import VortiqLogo from "../components/VortiqLogo";
import { getErrorMessage } from "../utils/errorUtils";

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google/`;
  };

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email address.";
    }
    if (!formData.password) {
      newErrors.password = "Password is required.";
    }
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (apiError) setApiError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setApiError("");

    try {
      await login(formData.email, formData.password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setApiError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="split-screen-container" style={{
      background: isDarkMode
        ? 'radial-gradient(circle at top left, rgba(168,85,247,0.20), transparent 25%), radial-gradient(circle at bottom right, rgba(236,72,153,0.12), transparent 25%), #0B0715'
        : 'linear-gradient(180deg, #FAF8FF, #F3EEFF)',
    }}>
      <style>{`
        .split-screen-container {
          display: flex;
          min-height: 100vh;
          width: 100vw;
          margin: 0;
          padding: 0;
          overflow: hidden;
          font-family: 'Inter', sans-serif;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 9999;
          box-sizing: border-box;
          transition: background 0.3s ease;
        }

        .left-panel {
          width: 55%;
          position: relative;
          overflow: hidden;
          background: ${isDarkMode ? 'linear-gradient(135deg, #120D1F, #1B0128)' : 'linear-gradient(135deg, #F3EEFF, #ECE8F5)'};
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 48px;
          box-sizing: border-box;
          transition: background 0.3s ease;
        }

        .left-glow-1 {
          width: 350px;
          height: 350px;
          background: ${isDarkMode ? '#7C3AED' : '#8B5CF6'};
          filter: blur(120px);
          opacity: ${isDarkMode ? '0.2' : '0.15'};
          position: absolute;
          top: -100px;
          left: -100px;
          pointer-events: none;
        }

        .left-glow-2 {
          width: 350px;
          height: 350px;
          background: ${isDarkMode ? '#9333EA' : '#A855F7'};
          filter: blur(120px);
          opacity: ${isDarkMode ? '0.2' : '0.15'};
          position: absolute;
          bottom: -100px;
          right: -100px;
          pointer-events: none;
        }

        .left-content {
          position: relative;
          z-index: 2;
          text-align: left;
          width: 100%;
          max-width: 440px;
        }

        .left-logo {
          font-size: 52px;
          font-weight: 800;
          letter-spacing: -2px;
          color: ${isDarkMode ? 'white' : '#1E1B2E'};
          margin: 0;
          line-height: 1;
          background: ${isDarkMode ? 'linear-gradient(135deg, #C084FC, #E879F9)' : 'linear-gradient(135deg, #8B5CF6, #A855F7)'};
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .left-subtitle {
          font-size: 14px;
          color: ${isDarkMode ? '#8E7A99' : '#6F6882'};
          letter-spacing: 3px;
          text-transform: uppercase;
          margin-top: 8px;
          margin-bottom: 32px;
          font-weight: 600;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          color: ${isDarkMode ? '#B9B4C7' : '#6F6882'};
          font-size: 15px;
          margin-top: 16px;
        }

        .feature-dot {
          width: 6px;
          height: 6px;
          background: ${isDarkMode ? '#C084FC' : '#8B5CF6'};
          border-radius: 50%;
          display: inline-block;
          box-shadow: ${isDarkMode ? '0 0 8px #C084FC' : '0 0 8px #8B5CF6'};
          flex-shrink: 0;
        }

        .right-panel {
          width: 45%;
          background: ${isDarkMode ? '#0B0715' : '#F8F7FC'};
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          box-sizing: border-box;
          transition: background 0.3s ease;
        }

        .form-card {
          width: 420px;
          max-width: 90%;
          background: ${isDarkMode 
            ? 'linear-gradient(145deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02))'
            : 'linear-gradient(145deg, rgba(139, 92, 246, 0.08), rgba(139, 92, 246, 0.04))'};
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(139, 92, 246, 0.15)'};
          box-shadow: ${isDarkMode 
            ? '0 8px 32px rgba(0, 0, 0, 0.45), 0 0 40px rgba(168, 85, 247, 0.12)'
            : '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 40px rgba(139, 92, 246, 0.15)'};
          border-radius: 28px;
          padding: 48px 40px;
          box-sizing: border-box;
          animation: fadeSlideUp 0.5s ease forwards;
        }

        .card-title {
          font-size: 30px;
          font-weight: 800;
          color: ${isDarkMode ? 'white' : '#1E1B2E'};
          letter-spacing: -0.5px;
          margin: 0;
        }

        .card-subtitle {
          font-size: 14px;
          color: ${isDarkMode ? '#7E7693' : '#6F6882'};
          margin-top: 6px;
          margin-bottom: 32px;
        }

        .form-group-custom {
          display: flex;
          flex-direction: column;
          margin-bottom: 20px;
        }

        .form-label-custom {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: ${isDarkMode ? '#7E7693' : '#6F6882'};
          margin-bottom: 8px;
        }

        .input-custom {
          width: 100%;
          height: 56px;
          border-radius: 16px;
          background: ${isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(139, 92, 246, 0.05)'};
          border: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.09)' : 'rgba(139, 92, 246, 0.15)'};
          color: ${isDarkMode ? 'white' : '#1E1B2E'};
          font-size: 15px;
          padding: 0 16px;
          outline: none;
          box-sizing: border-box;
          font-family: inherit;
          transition: all 0.3s ease;
        }

        .input-custom:focus {
          border-color: ${isDarkMode ? '#C084FC' : '#8B5CF6'};
          box-shadow: ${isDarkMode 
            ? '0 0 0 4px rgba(192, 132, 252, 0.15), 0 0 20px rgba(192, 132, 252, 0.20)'
            : '0 0 0 4px rgba(139, 92, 246, 0.15), 0 0 20px rgba(139, 92, 246, 0.20)'};
          transition: all 0.3s ease;
        }

        .input-custom.error-border {
          border-color: #EF4444;
        }

        .error-message-custom {
          font-size: 12px;
          color: #EF4444;
          margin-top: 6px;
        }

        .password-container-custom {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .password-toggle-custom {
          position: absolute;
          right: 16px;
          background: none;
          border: none;
          cursor: pointer;
          color: ${isDarkMode ? '#7E7693' : '#6F6882'};
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: color 0.3s ease;
        }

        .password-toggle-custom:hover {
          color: ${isDarkMode ? 'white' : '#1E1B2E'};
        }

        .submit-btn-custom {
          width: 100%;
          height: 56px;
          border-radius: 16px;
          background: ${isDarkMode 
            ? 'linear-gradient(135deg, #F0B56B, #D97706)'
            : 'linear-gradient(135deg, #8B5CF6, #7C3AED)'};
          color: white;
          font-weight: 700;
          font-size: 16px;
          border: none;
          cursor: pointer;
          box-shadow: ${isDarkMode 
            ? '0 8px 24px rgba(240, 181, 107, 0.30)'
            : '0 8px 24px rgba(139, 92, 246, 0.30)'};
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .submit-btn-custom:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: ${isDarkMode 
            ? '0 12px 32px rgba(240, 181, 107, 0.40)'
            : '0 12px 32px rgba(139, 92, 246, 0.40)'};
        }

        .submit-btn-custom:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .divider-custom {
          display: flex;
          align-items: center;
          margin: 24px 0;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background: ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(139, 92, 246, 0.1)'};
        }

        .divider-text {
          padding: 0 16px;
          font-size: 13px;
          color: ${isDarkMode ? '#7E7693' : '#6F6882'};
        }

        .google-btn-custom {
          width: 100%;
          height: 56px;
          border-radius: 16px;
          background: ${isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(139, 92, 246, 0.05)'};
          border: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.09)' : 'rgba(139, 92, 246, 0.15)'};
          color: ${isDarkMode ? 'white' : '#1E1B2E'};
          font-weight: 600;
          font-size: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .google-btn-custom:hover {
          background: ${isDarkMode ? 'rgba(255, 255, 255, 0.10)' : 'rgba(139, 92, 246, 0.10)'};
        }

        .footer-custom {
          text-align: center;
          margin-top: 32px;
          font-size: 14px;
          color: ${isDarkMode ? '#7E7693' : '#6F6882'};
        }

        .footer-link-custom {
          color: ${isDarkMode ? '#C084FC' : '#8B5CF6'};
          text-decoration: none;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .footer-link-custom:hover {
          text-decoration: underline;
        }

        .api-error-banner-custom {
          padding: 12px 16px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #EF4444;
          border-radius: 12px;
          color: #F87171;
          font-size: 14px;
          margin-bottom: 24px;
          line-height: 1.4;
        }

        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 767px) {
          .left-panel {
            display: none;
          }
          .right-panel {
            width: 100%;
            padding: 24px;
          }
          .form-card {
            padding: 40px 24px;
          }
        }
      `}</style>

      {/* Left Decorative Panel */}
      <div className="left-panel">
        <div className="left-glow-1" />
        <div className="left-glow-2" />
        <div className="left-content">
          <div style={{ marginBottom: "16px" }}>
            <VortiqLogo size={48} isDark={true} />
          </div>
          <div className="left-subtitle">AI-Powered Meeting Intelligence</div>
          <div>
            <div className="feature-item">
              <span className="feature-dot" />
              <span>Transcribe meetings instantly</span>
            </div>
            <div className="feature-item">
              <span className="feature-dot" />
              <span>AI-generated summaries and action items</span>
            </div>
            <div className="feature-item">
              <span className="feature-dot" />
              <span>Real-time collaborative notes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="right-panel">
        <div className="form-card">
          <h2 className="card-title">Welcome Back</h2>
          <p className="card-subtitle">Sign in to your account</p>

          <form onSubmit={handleSubmit} noValidate>
            {apiError && (
              <div className="api-error-banner-custom">{apiError}</div>
            )}

            <div className="form-group-custom">
              <label htmlFor="login-email" className="form-label-custom">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                className={`input-custom ${errors.email ? "error-border" : ""}`}
                autoComplete="email"
                autoFocus
              />
              {errors.email && (
                <span className="error-message-custom">{errors.email}</span>
              )}
            </div>

            <div className="form-group-custom">
              <label htmlFor="login-password" className="form-label-custom">
                Password
              </label>
              <div className="password-container-custom">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`input-custom ${
                    errors.password ? "error-border" : ""
                  }`}
                  autoComplete="current-password"
                  style={{ paddingRight: "48px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle-custom"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <span className="error-message-custom">{errors.password}</span>
              )}
            </div>

            <button
              type="submit"
              className="submit-btn-custom"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>Logging in...</span>
                </span>
              ) : (
                "Login"
              )}
            </button>

            <div className="divider-custom">
              <div className="divider-line" />
              <span className="divider-text">or</span>
              <div className="divider-line" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="google-btn-custom"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 18 18"
                style={{ flexShrink: 0 }}
              >
                <path
                  fill="#4285F4"
                  d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.24h2.9c1.69-1.55 2.69-3.84 2.69-6.57z"
                />
                <path
                  fill="#34A853"
                  d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.24c-.8.54-1.84.87-3.06.87-2.35 0-4.34-1.58-5.05-3.71H.94v2.32C2.42 16 5.48 18 9 18z"
                />
                <path
                  fill="#FBBC05"
                  d="M3.95 10.74c-.18-.54-.28-1.12-.28-1.74s.1-1.2.28-1.74V4.94H.94A8.98 8.98 0 0 0 0 9c0 1.5.37 2.93 1.02 4.2l2.93-2.46z"
                />
                <path
                  fill="#EA4335"
                  d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.47.89 11.43 0 9 0 5.48 0 2.42 2 1.02 4.94l2.93 2.46C4.66 5.17 6.65 3.58 9 3.58z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>
          </form>

          <p className="footer-custom">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="footer-link-custom">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

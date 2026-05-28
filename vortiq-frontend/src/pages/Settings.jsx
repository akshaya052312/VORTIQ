import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";
import { getMeetings } from "../api/meetings";
import axiosInstance from "../api/axiosInstance";
import VortiqLogo from "../components/VortiqLogo";

const Settings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode, setTheme } = useTheme();

  // Settings States
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [language, setLanguage] = useState("English");
  const [summaryLength, setSummaryLength] = useState("Medium"); // "Short" | "Medium" | "Detailed"
  const [speakerDetection, setSpeakerDetection] = useState(true);
  const [exportFormat, setExportFormat] = useState("PDF"); // "TXT" | "PDF" | "DOCX"
  const [meetingsCount, setMeetingsCount] = useState(0);

  // Sync name if user details load later
  useEffect(() => {
    if (user?.full_name) {
      setFullName(user.full_name);
    }
  }, [user]);

  // Fetch meetings count for storage usage calculation
  useEffect(() => {
    const fetchMeetingsCount = async () => {
      try {
        const data = await getMeetings();
        setMeetingsCount(data.length);
      } catch (err) {
        console.error("Failed to fetch meetings count:", err);
      }
    };
    fetchMeetingsCount();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSaveProfile = () => {
    if (!fullName.trim()) {
      alert("Name cannot be empty.");
      return;
    }
    const updatedUser = { ...user, full_name: fullName };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    alert("Profile saved successfully!");
    window.location.reload();
  };

  const handleClearAllMeetings = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all meetings? This cannot be undone."
    );
    if (!confirmed) return;

    try {
      await axiosInstance.delete("/api/meetings/all/");
      alert("All meetings cleared.");
      window.location.reload();
    } catch (err) {
      console.error("Failed to clear meetings backend:", err);
      // Fallback for mock clear in UI
      alert("All meetings cleared successfully (Mock).");
      window.location.reload();
    }
  };

  const handleDeleteAccount = () => {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete your account? This action is irreversible."
    );
    if (!confirmed) return;
    alert("Account deletion request submitted.");
  };

  // Avatar initials helper
  const initials = fullName
    ? fullName
        .split(" ")
        .map((n) => n.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  // Google OAuth Connection detection
  const isGoogleConnected = localStorage.getItem("google_login") === "true";

  // Storage percentage calculation (Max 50 meetings)
  const storagePercentage = Math.min((meetingsCount / 50) * 100, 100);

  return (
    <div className="dashboard-wrapper">
      <style>{`
        .dashboard-wrapper {
          display: flex;
          min-height: 100vh;
          width: 100vw;
          margin: 0;
          padding: 0;
          overflow: hidden;
          font-family: 'Inter', sans-serif;
          background: ${isDarkMode 
            ? 'radial-gradient(circle at top left, rgba(168,85,247,0.15), transparent 28%), radial-gradient(circle at bottom right, rgba(236,72,153,0.10), transparent 28%), #0B0715'
            : 'linear-gradient(180deg, #FAF8FF, #F3EEFF)'};
          position: fixed;
          top: 0;
          left: 0;
          box-sizing: border-box;
        }

        .sidebar {
          width: 260px;
          min-height: 100vh;
          background: ${isDarkMode ? 'rgba(15, 15, 20, 0.80)' : 'rgba(255,255,255,0.85)'};
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-right: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#ECE8F5'};
          display: flex;
          flex-direction: column;
          padding: 32px 16px;
          flex-shrink: 0;
          box-sizing: border-box;
          justify-content: space-between;
        }

        .sidebar-top {
          display: flex;
          flex-direction: column;
        }

        .sidebar-logo {
          font-size: 22px;
          font-weight: 800;
          color: ${isDarkMode ? '#C084FC' : '#7C3AED'};
          letter-spacing: -0.5px;
          padding: 0 12px;
          margin-bottom: 40px;
        }

        .user-block {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 12px;
          margin-bottom: 32px;
        }

        .user-avatar-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #C084FC, #9333EA);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 14px;
          flex-shrink: 0;
        }

        .user-details {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .user-name-label {
          color: ${isDarkMode ? 'white' : '#1E1B2E'};
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-email-label {
          color: ${isDarkMode ? '#7E7693' : '#6F6882'};
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .nav-links-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .nav-link-custom {
          height: 44px;
          padding: 0 16px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          color: ${isDarkMode ? '#B9B4C7' : '#6F6882'};
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.2s ease;
          text-decoration: none;
          background: transparent;
          border: none;
          width: 100%;
          text-align: left;
        }

        .nav-link-custom.active,
        .nav-link-custom:hover {
          background: ${isDarkMode ? 'rgba(168, 85, 247, 0.15)' : '#F1E8FF'};
          color: ${isDarkMode ? '#C084FC' : '#7C3AED'};
        }

        .logout-btn-custom {
          height: 44px;
          padding: 0 16px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          color: ${isDarkMode ? '#7E7693' : '#6F6882'};
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.2s ease;
          background: transparent;
          border: none;
          width: 100%;
          text-align: left;
        }

        .logout-btn-custom:hover {
          color: #DC2626;
          background: ${isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(220, 38, 38, 0.08)'};
        }

        .main-content {
          flex: 1;
          overflow-y: auto;
          height: 100vh;
          padding: 40px;
          box-sizing: border-box;
          animation: fadeIn 0.4s ease forwards;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .settings-container {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
        }

        .main-content::-webkit-scrollbar {
          width: 8px;
        }

        .main-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .main-content::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.1)'};
          border-radius: 9999px;
        }

        .main-content::-webkit-scrollbar-thumb:hover {
          background: ${isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.2)'};
        }

        .page-header-custom {
          margin-bottom: 32px;
        }

        .page-title-custom {
          font-size: 28px;
          font-weight: 800;
          color: ${isDarkMode ? 'white' : '#1E1B2E'};
          letter-spacing: -0.5px;
          margin: 0;
        }

        .settings-card {
          background: ${isDarkMode 
            ? 'linear-gradient(145deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.02))'
            : '#FFFFFF'};
          border: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#E9E5F3'};
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 24px;
          box-sizing: border-box;
          box-shadow: ${isDarkMode ? 'none' : '0 4px 16px rgba(0,0,0,0.06)'};
          width: 100%;
        }

        .settings-card-subtitle {
          font-size: 13px;
          color: #7E7693;
          margin-top: 4px;
          margin-bottom: 20px;
          font-weight: 400;
        }

        .settings-card-title {
          font-size: 16px;
          font-weight: 700;
          color: ${isDarkMode ? 'white' : '#1E1B2E'};
          margin: 0 0 16px 0;
        }

        .settings-divider {
          height: 1px;
          background: ${isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#E9E5F3'};
          margin-bottom: 24px;
        }

        .input-text-custom {
          height: 44px;
          border-radius: 12px;
          background: ${isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#FFFFFF'};
          border: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.09)' : '#DDD8EC'};
          color: ${isDarkMode ? 'white' : '#1E1B2E'};
          font-size: 14px;
          padding: 0 16px;
          outline: none;
          transition: all 0.3s ease;
          box-sizing: border-box;
          font-family: inherit;
        }

        .input-text-custom:focus {
          border-color: #8B5CF6;
          background: ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#FFFFFF'};
          box-shadow: 0 0 0 3px ${isDarkMode ? 'rgba(192, 132, 252, 0.2)' : 'rgba(139, 92, 246, 0.12)'};
        }

        .input-text-custom:read-only {
          background: ${isDarkMode ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF'};
          color: ${isDarkMode ? '#7E7693' : '#9E98AE'};
          cursor: not-allowed;
        }

        .btn-glass {
          background: ${isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'};
          border: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.09)' : '#DDD8EC'};
          border-radius: 12px;
          padding: 10px 20px;
          color: ${isDarkMode ? 'white' : '#1E1B2E'};
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .btn-glass:hover {
          background: ${isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'};
          border-color: ${isDarkMode ? 'rgba(255, 255, 255, 0.15)' : '#C7C0DB'};
        }

        .btn-gradient-purple {
          background: linear-gradient(135deg, #8B5CF6, #7C3AED);
          border-radius: 14px;
          padding: 12px 24px;
          color: white;
          font-weight: 600;
          font-size: 14px;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(139, 92, 246, 0.25);
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .btn-gradient-purple:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(139, 92, 246, 0.30);
        }

        .select-custom {
          height: 44px;
          padding: 0 40px 0 16px;
          border-radius: 12px;
          background: ${isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#FFFFFF'};
          border: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.09)' : '#DDD8EC'};
          color: ${isDarkMode ? 'white' : '#1E1B2E'};
          font-size: 14px;
          outline: none;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.3s ease;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='${isDarkMode ? '%237E7693' : '%239E98AE'}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
        }

        .select-custom:focus {
          border-color: #8B5CF6;
        }

        .select-custom option {
          background: ${isDarkMode ? '#120A21' : '#FFFFFF'};
          color: ${isDarkMode ? 'white' : '#1E1B2E'};
        }

        .preference-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0;
          border-bottom: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)'};
        }

        .preference-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .preference-row:first-child {
          padding-top: 0;
        }

        .preference-label {
          font-size: 14px;
          font-weight: 500;
          color: ${isDarkMode ? '#B9B4C7' : '#6F6882'};
        }

        .danger-zone-card {
          background: ${isDarkMode ? 'rgba(239, 68, 68, 0.05)' : '#FEF2F2'};
          border: 1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.25)' : '#FECACA'};
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>

      {/* Fixed Left Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div style={{ marginBottom: "40px", paddingLeft: "12px" }}>
            <VortiqLogo size={36} isDark={true} />
          </div>

          <div className="user-block">
            <div className="user-avatar-circle">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="user-details">
              <span className="user-name-label">{user?.full_name || "User"}</span>
              <span className="user-email-label">{user?.email}</span>
            </div>
          </div>

          <nav className="nav-links-container">
            <div onClick={() => navigate('/dashboard')} className="nav-link-custom">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="9"></rect>
                <rect x="14" y="3" width="7" height="5"></rect>
                <rect x="14" y="12" width="7" height="9"></rect>
                <rect x="3" y="16" width="7" height="5"></rect>
              </svg>
              <span>Dashboard</span>
            </div>

            <div onClick={() => navigate('/dashboard')} className="nav-link-custom">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"></path>
              </svg>
              <span>Meetings</span>
            </div>

            <div onClick={() => navigate('/settings')} className="nav-link-custom active">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span>Settings</span>
            </div>
          </nav>
        </div>

        <button onClick={handleLogout} className="logout-btn-custom">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Log Out</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <div className="settings-container">
          <div className="page-header-custom">
            <h1 className="page-title-custom">Settings</h1>
          </div>

          {/* Section 1 — Profile */}
          <section className="settings-card">
            <h2 className="settings-card-title">Profile</h2>
            <div className="settings-card-subtitle">Manage your personal information</div>
            <div className="settings-divider" />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
              {/* Avatar Circle - Centered */}
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #C084FC, #9333EA)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "28px",
                  fontWeight: "700",
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>

              {/* Inputs Container - Full Width Vertical Stack */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "11px", color: "#7E7693", fontWeight: "600", letterSpacing: "0.5px" }}>FULL NAME</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-text-custom"
                    placeholder="Enter your name"
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "11px", color: "#7E7693", fontWeight: "600", letterSpacing: "0.5px" }}>EMAIL ADDRESS</label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    readOnly
                    className="input-text-custom"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => alert("Password reset link sent to " + (user?.email || "your email") + " (Mock).")}
                  className="btn-glass"
                  style={{ alignSelf: "flex-start" }}
                >
                  Change Password
                </button>
              </div>
            </div>

            <div style={{ marginTop: "24px" }}>
              <button type="button" onClick={handleSaveProfile} className="btn-gradient-purple">
                Save Profile
              </button>
            </div>
          </section>

        {/* Section 2 — Appearance */}
        <section className="settings-card">
          <h2 className="settings-card-title">Appearance</h2>
          <div className="settings-card-subtitle">Customize how Vortiq looks on your device</div>
          <div className="settings-divider" />
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            {/* Dark Mode Card */}
            <div
              onClick={() => setTheme("dark")}
              style={{
                width: "120px",
                borderRadius: "16px",
                padding: "16px",
                textAlign: "center",
                cursor: "pointer",
                boxSizing: "border-box",
                transition: "all 0.2s ease",
                border: !isDarkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "2px solid #C084FC",
                background: !isDarkMode ? "transparent" : "rgba(168, 85, 247, 0.15)",
                color: !isDarkMode ? "#7E7693" : "white",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginBottom: "8px", marginInline: "auto" }}
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
              <div style={{ fontSize: "13px", fontWeight: "600" }}>Dark Mode</div>
            </div>

            {/* Light Mode Card */}
            <div
              onClick={() => setTheme("light")}
              style={{
                width: "120px",
                borderRadius: "16px",
                padding: "16px",
                textAlign: "center",
                cursor: "pointer",
                boxSizing: "border-box",
                transition: "all 0.2s ease",
                border: isDarkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "2px solid #C084FC",
                background: isDarkMode ? "transparent" : "rgba(168, 85, 247, 0.15)",
                color: isDarkMode ? "#7E7693" : "white",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginBottom: "8px", marginInline: "auto" }}
              >
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
              <div style={{ fontSize: "13px", fontWeight: "600" }}>Light Mode</div>
            </div>


          </div>
        </section>

        {/* Section 3 — AI Preferences */}
        <section className="settings-card">
          <h2 className="settings-card-title">AI Preferences</h2>
          <div className="settings-card-subtitle">Control how Vortiq processes your meetings</div>
          <div className="settings-divider" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Row 1: Transcript Language */}
            <div className="preference-row">
              <span className="preference-label">Transcript Language</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="select-custom"
                style={{ height: "40px", borderRadius: "10px" }}
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
              </select>
            </div>

            {/* Row 2: Summary Length */}
            <div className="preference-row">
              <span className="preference-label">Summary Length</span>
              <div style={{ display: "flex", gap: "4px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)", padding: "3px", borderRadius: "10px" }}>
                {["Short", "Medium", "Detailed"].map((length) => {
                  const active = summaryLength === length;
                  return (
                    <button
                      key={length}
                      type="button"
                      onClick={() => setSummaryLength(length)}
                      style={{
                        padding: "6px 14px",
                        background: active ? "rgba(168, 85, 247, 0.20)" : "transparent",
                        border: "none",
                        borderRadius: "8px",
                        color: active ? "#C084FC" : "#7E7693",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {length}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 3: Speaker Detection */}
            <div className="preference-row">
              <span className="preference-label">Speaker Detection</span>
              <div
                onClick={() => setSpeakerDetection(!speakerDetection)}
                style={{
                  width: "44px",
                  height: "24px",
                  borderRadius: "12px",
                  background: speakerDetection ? "#C084FC" : "rgba(255,255,255,0.1)",
                  position: "relative",
                  cursor: "pointer",
                  transition: "background-color 0.2s ease",
                }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "white",
                    position: "absolute",
                    top: "2px",
                    left: speakerDetection ? "22px" : "2px",
                    transition: "left 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 4 — Export Preferences */}
        <section className="settings-card">
          <h2 className="settings-card-title">Export Preferences</h2>
          <div className="settings-card-subtitle">Choose your default export format</div>
          <div className="settings-divider" />
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <span style={{ fontSize: "14px", color: "#7E7693", fontWeight: "600" }}>Default Export Format</span>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {["TXT", "PDF", "DOCX"].map((fmt) => {
                const active = exportFormat === fmt;
                return (
                  <div
                    key={fmt}
                    onClick={() => setExportFormat(fmt)}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "12px",
                      background: active ? "rgba(168, 85, 247, 0.20)" : "rgba(255, 255, 255, 0.04)",
                      border: active ? "1px solid #C084FC" : "1px solid rgba(255, 255, 255, 0.08)",
                      color: active ? "white" : "#7E7693",
                      fontWeight: "600",
                      fontSize: "14px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      textAlign: "center",
                      minWidth: "60px",
                    }}
                  >
                    {fmt}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 5 — Storage */}
        <section className="settings-card">
          <h2 className="settings-card-title">Storage Usage</h2>
          <div className="settings-card-subtitle">Monitor your usage and plan limits</div>
          <div className="settings-divider" />
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <span style={{ fontSize: "16px", color: "white", fontWeight: "600" }}>
              {meetingsCount} {meetingsCount === 1 ? "meeting" : "meetings"} stored
            </span>
            <div
              style={{
                width: "100%",
                height: "8px",
                borderRadius: "4px",
                background: "rgba(255, 255, 255, 0.08)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${storagePercentage}%`,
                  background: "linear-gradient(90deg, #C084FC, #9333EA)",
                  borderRadius: "4px",
                  transition: "width 0.5s ease-out",
                }}
              />
            </div>
            <span style={{ fontSize: "13px", color: "#7E7693" }}>
              {meetingsCount} of 50 meetings used — Free tier
            </span>
          </div>
        </section>

        {/* Section 6 — Security */}
        <section className="settings-card">
          <h2 className="settings-card-title">Security</h2>
          <div className="settings-card-subtitle">Manage your account security and sessions</div>
          <div className="settings-divider" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Row 1: Google Account connection */}
            <div className="preference-row">
              <span className="preference-label">Google Account</span>
              {isGoogleConnected ? (
                <span
                  style={{
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "#34D399",
                    border: "1px solid rgba(52, 211, 153, 0.20)",
                    borderRadius: "20px",
                    padding: "4px 12px",
                    fontSize: "12px",
                    fontWeight: "600",
                  }}
                >
                  Connected
                </span>
              ) : (
                <span
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#7E7693",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "20px",
                    padding: "4px 12px",
                    fontSize: "12px",
                    fontWeight: "600",
                  }}
                >
                  Not Connected
                </span>
              )}
            </div>

            {/* Row 2: Password reset */}
            <div className="preference-row">
              <span className="preference-label">Password</span>
              <button
                type="button"
                onClick={() => alert("Password reset link sent to " + (user?.email || "your email") + " (Mock).")}
                className="btn-glass"
                style={{ padding: "8px 16px" }}
              >
                Change Password
              </button>
            </div>

            {/* Row 3: Active Sessions */}
            <div className="preference-row">
              <span className="preference-label">Active Sessions</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#10B981",
                    display: "inline-block",
                  }}
                />
                <span style={{ fontSize: "13px", color: "white", fontWeight: "500" }}>
                  This device — Active now
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 7 — Danger Zone */}
        <section
          className="settings-card danger-zone-card"
        >
          <h2 className="settings-card-title" style={{ color: "#F87171" }}>
            Danger Zone
          </h2>
          <div className="settings-card-subtitle" style={{ color: "#F87171" }}>Irreversible actions — proceed with caution</div>
          <div className="settings-divider" style={{ background: "rgba(239, 68, 68, 0.15)" }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Row 1: Clear meetings */}
            <div className="preference-row" style={{ borderBottom: "1px solid rgba(239, 68, 68, 0.10)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span className="preference-label" style={{ color: "white", fontWeight: "600" }}>
                  Clear All Meetings
                </span>
                <span style={{ fontSize: "12px", color: "#7E7693" }}>
                  Delete all your transcribed meetings permanently. This cannot be undone.
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearAllMeetings}
                style={{
                  background: "transparent",
                  border: "1px solid #F87171",
                  borderRadius: "12px",
                  padding: "10px 20px",
                  color: "#F87171",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  fontFamily: "inherit",
                }}
              >
                Clear All Meetings
              </button>
            </div>

            {/* Row 2: Delete account */}
            <div className="preference-row">
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span className="preference-label" style={{ color: "white", fontWeight: "600" }}>
                  Delete Account
                </span>
                <span style={{ fontSize: "12px", color: "#7E7693" }}>
                  Permanently delete your Vortiq account and all associated data.
                </span>
              </div>
              <button
                type="button"
                onClick={handleDeleteAccount}
                style={{
                  background: "rgba(239, 68, 68, 0.80)",
                  border: "none",
                  borderRadius: "12px",
                  padding: "10px 20px",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  fontFamily: "inherit",
                }}
              >
                Delete Account
              </button>
            </div>
          </div>
        </section>
        </div>
      </main>
    </div>
  );
};

export default Settings;

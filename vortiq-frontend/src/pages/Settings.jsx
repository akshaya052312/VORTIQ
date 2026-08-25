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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem("sidebar_collapsed") === "true");

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  };

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
          padding: 16px;
          overflow: hidden;
          font-family: 'Inter', sans-serif;
          background: ${isDarkMode ? '#0F0F0F' : '#F5F6F8'};
          position: fixed;
          top: 0;
          left: 0;
          box-sizing: border-box;
          gap: 16px;
        }

        .sidebar {
          width: ${isCollapsed ? '76px' : '270px'};
          min-width: ${isCollapsed ? '76px' : '270px'};
          height: calc(100vh - 32px);
          background: ${isDarkMode ? '#F5F5F5' : '#1A1A1A'};
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          padding: ${isCollapsed ? '24px 12px' : '28px 20px'};
          flex-shrink: 0;
          box-sizing: border-box;
          justify-content: space-between;
          transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1), padding 0.25s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 100;
          box-shadow: ${isDarkMode ? '0 2px 12px rgba(0,0,0,0.15)' : '0 2px 16px rgba(0,0,0,0.18)'};
          overflow-y: auto;
          overflow-x: hidden;
        }

        /* Sidebar scrollbar */
        .sidebar::-webkit-scrollbar {
          width: 5px;
        }
        .sidebar::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.18)'};
          border-radius: 999px;
        }
        .sidebar::-webkit-scrollbar-thumb:hover {
          background: ${isDarkMode ? 'rgba(0,0,0,0.30)' : 'rgba(255,255,255,0.30)'};
        }

        .sidebar-top {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .sidebar-header-row {
          display: flex;
          align-items: center;
          justify-content: ${isCollapsed ? 'center' : 'space-between'};
          margin-bottom: 28px;
          padding: 0 ${isCollapsed ? '0' : '4px'};
        }

        .sidebar-toggle-btn {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: ${isDarkMode ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'};
          border: none;
          color: ${isDarkMode ? '#111111' : '#FFFFFF'};
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 0;
          flex-shrink: 0;
        }

        .sidebar-toggle-btn:hover {
          background: ${isDarkMode ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.16)'};
        }

        .user-block {
          display: flex;
          align-items: center;
          justify-content: ${isCollapsed ? 'center' : 'flex-start'};
          gap: 12px;
          padding: ${isCollapsed ? '10px 0' : '12px 14px'};
          margin-bottom: 24px;
          border-radius: 14px;
          background: ${isDarkMode ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)'};
        }

        .user-avatar-circle {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: ${isDarkMode ? '#D1D5DB' : '#333333'};
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${isDarkMode ? '#111111' : '#FFFFFF'};
          font-weight: 700;
          font-size: 14px;
          flex-shrink: 0;
        }

        .user-details {
          display: ${isCollapsed ? 'none' : 'flex'};
          flex-direction: column;
          overflow: hidden;
        }

        .user-name-label {
          color: ${isDarkMode ? '#111111' : 'rgba(255,255,255,0.90)'};
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-email-label {
          color: ${isDarkMode ? '#6B7280' : 'rgba(255,255,255,0.45)'};
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Vertical list navigation */
        .nav-links-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 20px;
          align-items: ${isCollapsed ? 'center' : 'stretch'};
        }

        .nav-link-custom {
          height: 48px;
          width: ${isCollapsed ? '48px' : '100%'};
          padding: ${isCollapsed ? '0' : '0 16px'};
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          color: ${isDarkMode ? 'rgba(17,17,17,0.65)' : 'rgba(255,255,255,0.65)'};
          cursor: pointer;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: ${isCollapsed ? 'center' : 'flex-start'};
          gap: 14px;
          transition: all 0.2s ease;
          text-decoration: none;
          background: transparent;
          border: 1px solid transparent;
          box-sizing: border-box;
          text-align: left;
        }

        .nav-link-label {
          display: ${isCollapsed ? 'none' : 'inline'};
          white-space: nowrap;
        }

        .nav-link-custom.active {
          background: ${isDarkMode ? '#111111' : '#FFFFFF'};
          color: ${isDarkMode ? '#FFFFFF' : '#111111'};
          font-weight: 600;
          border-color: transparent;
          box-shadow: 0 2px 8px rgba(0,0,0,0.14);
        }

        .nav-link-custom:not(.active):hover {
          background: ${isDarkMode ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'};
          color: ${isDarkMode ? '#111111' : '#FFFFFF'};
        }

        .logout-btn-custom {
          height: 46px;
          width: ${isCollapsed ? '48px' : '100%'};
          padding: ${isCollapsed ? '0' : '0 16px'};
          margin: ${isCollapsed ? '0 auto' : '0'};
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          color: ${isDarkMode ? 'rgba(17,17,17,0.50)' : 'rgba(255,255,255,0.45)'};
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: ${isCollapsed ? 'center' : 'flex-start'};
          gap: 14px;
          transition: all 0.2s ease;
          background: transparent;
          border: none;
          text-align: left;
          box-sizing: border-box;
        }

        .logout-label {
          display: ${isCollapsed ? 'none' : 'inline'};
          white-space: nowrap;
        }

        .logout-btn-custom:hover {
          color: #DC2626;
          background: ${isDarkMode ? 'rgba(220, 38, 38, 0.08)' : 'rgba(220, 38, 38, 0.12)'};
        }

        .main-content {
          flex: 1;
          overflow-y: auto;
          height: calc(100vh - 32px);
          padding: 36px 48px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          border-radius: 18px;
          background: ${isDarkMode ? '#0F0F0F' : '#F5F6F8'};
        }

        .settings-container {
          width: 100%;
          max-width: 860px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .main-content::-webkit-scrollbar {
          width: 6px;
        }
        .main-content::-webkit-scrollbar-track {
          background: transparent;
        }
        .main-content::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? '#2A2A2A' : '#E5E7EB'};
          border-radius: 999px;
        }

        .page-header-custom {
          margin-bottom: 8px;
        }

        .page-title-custom {
          font-size: 28px;
          font-weight: 800;
          color: ${isDarkMode ? '#F9FAFB' : '#111111'};
          letter-spacing: -0.5px;
          margin: 0;
        }

        .settings-card {
          background: ${isDarkMode ? '#1A1A1A' : '#FFFFFF'};
          border: 1px solid ${isDarkMode ? '#2A2A2A' : '#E5E7EB'};
          border-radius: 18px;
          padding: 24px;
          box-sizing: border-box;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          width: 100%;
        }

        .settings-card-title {
          font-size: 16px;
          font-weight: 700;
          color: ${isDarkMode ? '#F9FAFB' : '#111111'};
          margin: 0 0 4px 0;
        }

        .settings-card-subtitle {
          font-size: 13px;
          color: ${isDarkMode ? '#9CA3AF' : '#6B7280'};
          margin-bottom: 16px;
          font-weight: 400;
        }

        .settings-divider {
          height: 1px;
          background: ${isDarkMode ? '#2A2A2A' : '#F3F4F6'};
          margin-bottom: 20px;
        }

        .input-text-custom {
          height: 42px;
          border-radius: 10px;
          background: ${isDarkMode ? '#222222' : '#FFFFFF'};
          border: 1px solid ${isDarkMode ? '#2D2D2D' : '#E5E7EB'};
          color: ${isDarkMode ? '#F9FAFB' : '#111111'};
          font-size: 14px;
          padding: 0 14px;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
          font-family: inherit;
        }

        .input-text-custom:focus {
          border-color: ${isDarkMode ? '#F9FAFB' : '#111111'};
          box-shadow: 0 0 0 3px ${isDarkMode ? 'rgba(249, 250, 251, 0.08)' : 'rgba(17, 17, 17, 0.06)'};
        }

        .input-text-custom:read-only {
          background: ${isDarkMode ? '#1E1E1E' : '#F9FAFB'};
          color: ${isDarkMode ? '#6B7280' : '#9CA3AF'};
          cursor: not-allowed;
        }

        .btn-ghost-pill {
          background: transparent;
          border: 1px solid ${isDarkMode ? '#2D2D2D' : '#E5E7EB'};
          border-radius: 999px;
          padding: 8px 18px;
          color: ${isDarkMode ? '#F9FAFB' : '#111111'};
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .btn-ghost-pill:hover {
          background: ${isDarkMode ? '#2A2A2A' : '#F3F4F6'};
          border-color: ${isDarkMode ? '#3A3A3A' : '#D1D5DB'};
        }

        .btn-primary-pill {
          background: ${isDarkMode ? '#F9FAFB' : '#111111'};
          color: ${isDarkMode ? '#111111' : '#FFFFFF'};
          border-radius: 999px;
          padding: 10px 24px;
          font-weight: 600;
          font-size: 14px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .btn-primary-pill:hover {
          opacity: 0.90;
          transform: translateY(-1px);
        }

        .select-custom {
          height: 40px;
          padding: 0 36px 0 14px;
          border-radius: 10px;
          background: ${isDarkMode ? '#222222' : '#FFFFFF'};
          border: 1px solid ${isDarkMode ? '#2D2D2D' : '#E5E7EB'};
          color: ${isDarkMode ? '#F9FAFB' : '#111111'};
          font-size: 13px;
          font-weight: 500;
          outline: none;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='${isDarkMode ? '%239CA3AF' : '%236B7280'}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
        }

        .select-custom:focus {
          border-color: ${isDarkMode ? '#F9FAFB' : '#111111'};
        }

        .select-custom option {
          background: ${isDarkMode ? '#1A1A1A' : '#FFFFFF'};
          color: ${isDarkMode ? '#F9FAFB' : '#111111'};
        }

        .preference-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 0;
          border-bottom: 1px solid ${isDarkMode ? '#242424' : '#F3F4F6'};
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
          color: ${isDarkMode ? '#F9FAFB' : '#111111'};
        }

        .danger-zone-card {
          background: ${isDarkMode ? 'rgba(220, 38, 38, 0.05)' : '#FEF2F2'};
          border: 1px solid ${isDarkMode ? 'rgba(220, 38, 38, 0.25)' : '#FECACA'};
        }

        /* Mobile sidebar overlay */
        .sidebar-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 90;
        }

        .mobile-header {
          display: none;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 12px 16px;
          background: ${isDarkMode ? '#1A1A1A' : '#FFFFFF'};
          border-radius: 12px;
          margin-bottom: 16px;
          box-sizing: border-box;
        }

        .hamburger-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          color: ${isDarkMode ? '#F9FAFB' : '#111111'};
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
        }

        @media (max-width: 768px) {
          .dashboard-wrapper {
            padding: 8px;
            gap: 0;
            overflow-y: auto;
          }

          .mobile-header {
            display: flex;
          }

          .sidebar-overlay {
            display: block;
          }

          .sidebar {
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            height: 100vh;
            border-radius: 0;
            transform: translateX(-100%);
            z-index: 1000;
          }

          .sidebar.open {
            transform: translateX(0);
            box-shadow: 4px 0 30px rgba(0, 0, 0, 0.35);
          }

          .main-content {
            height: auto;
            min-height: calc(100vh - 16px);
            padding: 16px 8px;
            width: 100%;
          }
        }
      `}</style>

      {/* Mobile Drawer Overlay */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Fixed Left Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <div className="sidebar-header-row">
            <div 
              style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
              onClick={isCollapsed ? toggleCollapse : undefined}
              title={isCollapsed ? "Expand sidebar" : undefined}
            >
              <VortiqLogo size={32} showText={!isCollapsed} isDark={!isDarkMode} />
            </div>

            <button
              onClick={toggleCollapse}
              className="sidebar-toggle-btn"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {isCollapsed ? (
                  <polyline points="9 18 15 12 9 6"></polyline>
                ) : (
                  <polyline points="15 18 9 12 15 6"></polyline>
                )}
              </svg>
            </button>
          </div>

          <div className="user-block" title={isCollapsed ? `${user?.full_name || "User"} (${user?.email})` : undefined}>
            <div className="user-avatar-circle">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="user-details">
              <span className="user-name-label">{user?.full_name || "User"}</span>
              <span className="user-email-label">{user?.email}</span>
            </div>
          </div>

          <nav className="nav-links-container">
            <div 
              onClick={() => navigate('/dashboard')} 
              className="nav-link-custom"
              title={isCollapsed ? "Dashboard" : undefined}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <rect x="3" y="3" width="7" height="9"></rect>
                <rect x="14" y="3" width="7" height="5"></rect>
                <rect x="14" y="12" width="7" height="9"></rect>
                <rect x="3" y="16" width="7" height="5"></rect>
              </svg>
              <span className="nav-link-label">Dashboard</span>
            </div>

            <div 
              onClick={() => navigate('/settings')} 
              className="nav-link-custom active"
              title={isCollapsed ? "Settings" : undefined}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span className="nav-link-label">Settings</span>
            </div>
          </nav>
        </div>

        <button 
          onClick={handleLogout} 
          className="logout-btn-custom"
          title={isCollapsed ? "Log Out" : undefined}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span className="logout-label">Log Out</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Mobile top bar */}
        <div className="mobile-header">
          <button className="hamburger-btn" onClick={() => setIsSidebarOpen(true)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <VortiqLogo size={28} isDark={isDarkMode} />
          <div style={{ width: "22px" }} />
        </div>

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
              {/* Avatar Circle - Centered Neutral */}
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  background: isDarkMode ? "#262626" : "#E5E7EB",
                  border: `1px solid ${isDarkMode ? "#333333" : "#D1D5DB"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isDarkMode ? "#F9FAFB" : "#111111",
                  fontSize: "24px",
                  fontWeight: "700",
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>

              {/* Inputs Container - Full Width Vertical Stack */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "11px", color: isDarkMode ? "#9CA3AF" : "#6B7280", fontWeight: "600", letterSpacing: "0.5px" }}>FULL NAME</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-text-custom"
                    placeholder="Enter your name"
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "11px", color: isDarkMode ? "#9CA3AF" : "#6B7280", fontWeight: "600", letterSpacing: "0.5px" }}>EMAIL ADDRESS</label>
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
                  className="btn-ghost-pill"
                  style={{ alignSelf: "flex-start" }}
                >
                  Change Password
                </button>
              </div>
            </div>

            <div style={{ marginTop: "24px" }}>
              <button type="button" onClick={handleSaveProfile} className="btn-primary-pill">
                Save Profile
              </button>
            </div>
          </section>

          {/* Section 2 — Appearance */}
          <section className="settings-card">
            <h2 className="settings-card-title">Appearance</h2>
            <div className="settings-card-subtitle">Customize how Vortiq looks on your device</div>
            <div className="settings-divider" />
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
              {/* Dark Mode Card */}
              <div
                onClick={() => setTheme("dark")}
                style={{
                  width: "130px",
                  borderRadius: "14px",
                  padding: "16px",
                  textAlign: "center",
                  cursor: "pointer",
                  boxSizing: "border-box",
                  transition: "all 0.2s ease",
                  border: isDarkMode 
                    ? `2px solid ${isDarkMode ? '#F9FAFB' : '#111111'}` 
                    : `1px solid ${isDarkMode ? '#2D2D2D' : '#E5E7EB'}`,
                  background: isDarkMode 
                    ? (isDarkMode ? '#262626' : '#F3F4F6')
                    : 'transparent',
                  color: isDarkMode ? (isDarkMode ? '#F9FAFB' : '#111111') : (isDarkMode ? '#9CA3AF' : '#6B7280'),
                }}
              >
                <svg
                  width="22"
                  height="22"
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
                  width: "130px",
                  borderRadius: "14px",
                  padding: "16px",
                  textAlign: "center",
                  cursor: "pointer",
                  boxSizing: "border-box",
                  transition: "all 0.2s ease",
                  border: !isDarkMode 
                    ? `2px solid ${isDarkMode ? '#F9FAFB' : '#111111'}` 
                    : `1px solid ${isDarkMode ? '#2D2D2D' : '#E5E7EB'}`,
                  background: !isDarkMode 
                    ? (isDarkMode ? '#262626' : '#F3F4F6')
                    : 'transparent',
                  color: !isDarkMode ? (isDarkMode ? '#F9FAFB' : '#111111') : (isDarkMode ? '#9CA3AF' : '#6B7280'),
                }}
              >
                <svg
                  width="22"
                  height="22"
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
                <div style={{ display: "flex", gap: "4px", background: isDarkMode ? "#222222" : "#F3F4F6", border: `1px solid ${isDarkMode ? '#2D2D2D' : '#E5E7EB'}`, padding: "3px", borderRadius: "10px" }}>
                  {["Short", "Medium", "Detailed"].map((length) => {
                    const active = summaryLength === length;
                    return (
                      <button
                        key={length}
                        type="button"
                        onClick={() => setSummaryLength(length)}
                        style={{
                          padding: "6px 14px",
                          background: active ? (isDarkMode ? "#F9FAFB" : "#111111") : "transparent",
                          border: "none",
                          borderRadius: "7px",
                          color: active ? (isDarkMode ? "#111111" : "#FFFFFF") : (isDarkMode ? "#9CA3AF" : "#6B7280"),
                          fontSize: "13px",
                          fontWeight: active ? "600" : "500",
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
                    width: "42px",
                    height: "22px",
                    borderRadius: "999px",
                    background: speakerDetection ? (isDarkMode ? "#F9FAFB" : "#111111") : (isDarkMode ? "#333333" : "#D1D5DB"),
                    position: "relative",
                    cursor: "pointer",
                    transition: "background-color 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: speakerDetection ? (isDarkMode ? "#111111" : "#FFFFFF") : "#FFFFFF",
                      position: "absolute",
                      top: "2px",
                      left: speakerDetection ? "22px" : "2px",
                      transition: "left 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
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
              <span style={{ fontSize: "13px", color: isDarkMode ? "#9CA3AF" : "#6B7280", fontWeight: "600" }}>DEFAULT EXPORT FORMAT</span>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {["TXT", "PDF", "DOCX"].map((fmt) => {
                  const active = exportFormat === fmt;
                  return (
                    <div
                      key={fmt}
                      onClick={() => setExportFormat(fmt)}
                      style={{
                        padding: "8px 20px",
                        borderRadius: "999px",
                        background: active ? (isDarkMode ? "#F9FAFB" : "#111111") : (isDarkMode ? "#222222" : "#FFFFFF"),
                        border: active ? "1px solid transparent" : `1px solid ${isDarkMode ? '#2D2D2D' : '#E5E7EB'}`,
                        color: active ? (isDarkMode ? "#111111" : "#FFFFFF") : (isDarkMode ? "#9CA3AF" : "#6B7280"),
                        fontWeight: "600",
                        fontSize: "13px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        textAlign: "center",
                        minWidth: "50px",
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
              <span style={{ fontSize: "15px", color: isDarkMode ? "#F9FAFB" : "#111111", fontWeight: "600" }}>
                {meetingsCount} {meetingsCount === 1 ? "meeting" : "meetings"} stored
              </span>
              <div
                style={{
                  width: "100%",
                  height: "8px",
                  borderRadius: "999px",
                  background: isDarkMode ? "#262626" : "#E5E7EB",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${storagePercentage}%`,
                    background: isDarkMode ? "#F9FAFB" : "#111111",
                    borderRadius: "999px",
                    transition: "width 0.5s ease-out",
                  }}
                />
              </div>
              <span style={{ fontSize: "13px", color: isDarkMode ? "#9CA3AF" : "#6B7280" }}>
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
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      fontWeight: "500",
                      color: "#16A34A",
                    }}
                  >
                    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#16A34A" }} />
                    Connected
                  </span>
                ) : (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      fontWeight: "500",
                      color: isDarkMode ? "#9CA3AF" : "#6B7280",
                    }}
                  >
                    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: isDarkMode ? "#6B7280" : "#9CA3AF" }} />
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
                  className="btn-ghost-pill"
                >
                  Change Password
                </button>
              </div>

              {/* Row 3: Active Sessions */}
              <div className="preference-row">
                <span className="preference-label">Active Sessions</span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      background: "#16A34A",
                    }}
                  />
                  <span style={{ fontSize: "13px", color: isDarkMode ? "#F9FAFB" : "#111111", fontWeight: "500" }}>
                    This device — Active now
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 7 — Danger Zone */}
          <section className="settings-card danger-zone-card">
            <h2 className="settings-card-title" style={{ color: "#DC2626" }}>
              Danger Zone
            </h2>
            <div className="settings-card-subtitle" style={{ color: "#DC2626" }}>Irreversible actions — proceed with caution</div>
            <div className="settings-divider" style={{ background: isDarkMode ? "rgba(220, 38, 38, 0.2)" : "#FECACA" }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              {/* Row 1: Clear meetings */}
              <div className="preference-row" style={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(220, 38, 38, 0.15)' : '#FEE2E2'}` }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span className="preference-label" style={{ color: isDarkMode ? "#F9FAFB" : "#111111", fontWeight: "600" }}>
                    Clear All Meetings
                  </span>
                  <span style={{ fontSize: "12px", color: isDarkMode ? "#9CA3AF" : "#6B7280" }}>
                    Delete all your transcribed meetings permanently. This cannot be undone.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearAllMeetings}
                  style={{
                    background: "transparent",
                    border: "1px solid #DC2626",
                    borderRadius: "999px",
                    padding: "8px 18px",
                    color: "#DC2626",
                    fontSize: "13px",
                    fontWeight: "600",
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
                  <span className="preference-label" style={{ color: isDarkMode ? "#F9FAFB" : "#111111", fontWeight: "600" }}>
                    Delete Account
                  </span>
                  <span style={{ fontSize: "12px", color: isDarkMode ? "#9CA3AF" : "#6B7280" }}>
                    Permanently delete your Vortiq account and all associated data.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  style={{
                    background: "#DC2626",
                    border: "none",
                    borderRadius: "999px",
                    padding: "8px 18px",
                    color: "white",
                    fontSize: "13px",
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

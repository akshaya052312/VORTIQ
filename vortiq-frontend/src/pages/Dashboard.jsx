import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";
import { getMeetings, deleteMeeting } from "../api/meetings";
import VortiqLogo from "../components/VortiqLogo";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pollIntervalRef = useRef(null);

  // Layout & UI States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Close three-dot menu when clicking elsewhere
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const fetchMeetings = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await getMeetings();
      setMeetings(data);
      setError("");
    } catch (err) {
      console.error("Error fetching meetings:", err);
      setError("Failed to load meetings. Please try again later.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Initial fetch and token check from Google OAuth callback redirect
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const access = searchParams.get("access");
    const refresh = searchParams.get("refresh");

    if (access && refresh) {
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);

      try {
        const payloadBase64 = access.split(".")[1];
        const payloadJson = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
        const payload = JSON.parse(payloadJson);
        const userData = {
          id: payload.user_id,
          email: payload.email,
          full_name: payload.full_name,
        };
        localStorage.setItem("user", JSON.stringify(userData));
      } catch (e) {
        console.error("Error decoding token in Dashboard:", e);
      }

      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }

    fetchMeetings(true);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Poll if any meeting is in pending or processing status
  useEffect(() => {
    const hasActiveMeetings = meetings.some(
      (m) => m.status === "pending" || m.status === "processing"
    );

    if (hasActiveMeetings) {
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(() => {
          fetchMeetings(false);
        }, 4000);
      }
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [meetings]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Calculate stats from full meetings array (not filtered)
  const stats = {
    total: meetings.length,
    completed: meetings.filter(m => m.status === "completed").length,
    failed: meetings.filter(m => m.status === "failed").length,
    processing: meetings.filter(m => m.status === "processing" || m.status === "pending").length,
  };

  const handleDelete = async (e, meetingId) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      "Are you sure you want to delete this meeting? This cannot be undone."
    );
    if (!confirmed) return;

    try {
      await deleteMeeting(meetingId);
      setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete meeting.");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Filter and sort logic
  const filteredAndSortedMeetings = meetings
    .filter((meeting) => {
      const titleMatch = (meeting.title || "").toLowerCase().includes(searchQuery.toLowerCase());
      const transcriptMatch = (meeting.raw_text || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      let statusMatch = true;
      if (statusFilter !== "all") {
        if (statusFilter === "processing") {
          statusMatch = meeting.status === "processing" || meeting.status === "pending";
        } else {
          statusMatch = meeting.status === statusFilter;
        }
      }
      
      return (titleMatch || transcriptMatch) && statusMatch;
    })
    .sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.created_at) - new Date(a.created_at);
      } else if (sortBy === "oldest") {
        return new Date(a.created_at) - new Date(b.created_at);
      } else if (sortBy === "name") {
        return (a.title || "").localeCompare(b.title || "");
      }
      return 0;
    });

  // Waveform height mock data generator
  const mockWaveformBars = [12, 8, 16, 4, 18, 10, 14, 6, 20, 12, 8, 16, 4, 18, 10, 14, 6, 20, 12, 10];

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

        .top-bar-custom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          gap: 16px;
          flex-wrap: wrap;
        }

        .page-title-custom {
          font-size: 28px;
          font-weight: 800;
          color: ${isDarkMode ? 'white' : '#1E1B2E'};
          letter-spacing: -0.5px;
          margin: 0;
        }

        .search-filter-controls {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon-custom {
          position: absolute;
          left: 12px;
          color: ${isDarkMode ? '#7E7693' : '#9E98AE'};
          pointer-events: none;
        }

        .search-input-custom {
          height: 44px;
          width: 220px;
          border-radius: 12px;
          background: ${isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#FFFFFF'};
          border: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.09)' : '#DDD8EC'};
          color: ${isDarkMode ? 'white' : '#1E1B2E'};
          font-size: 14px;
          padding: 0 16px 0 40px;
          outline: none;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .search-input-custom:focus {
          border-color: #8B5CF6;
          background: ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#FFFFFF'};
          box-shadow: 0 0 0 3px ${isDarkMode ? 'rgba(192, 132, 252, 0.2)' : 'rgba(139, 92, 246, 0.12)'};
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

        .view-toggle-buttons {
          display: flex;
          gap: 4px;
          background: ${isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.04)'};
          border: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#E9E5F3'};
          padding: 3px;
          border-radius: 10px;
        }

        .view-btn {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: ${isDarkMode ? '#7E7693' : '#9E98AE'};
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-btn.active {
          background: ${isDarkMode ? 'rgba(168, 85, 247, 0.20)' : 'rgba(139, 92, 246, 0.15)'};
          color: ${isDarkMode ? '#C084FC' : '#7C3AED'};
          border-radius: 8px;
        }

        .view-btn:hover:not(.active) {
          color: ${isDarkMode ? 'white' : '#1E1B2E'};
        }

        .stats-row-custom {
          display: flex;
          gap: 16px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }

        .stat-chip-custom {
          flex: 1;
          min-width: 140px;
          background: ${isDarkMode 
            ? 'linear-gradient(145deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.02))'
            : '#FFFFFF'};
          border: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#E9E5F3'};
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          box-shadow: ${isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.05)'};
          transition: all 0.2s ease;
        }

        .stat-chip-custom:hover {
          box-shadow: ${isDarkMode ? '0 8px 16px rgba(0,0,0,0.2)' : '0 6px 16px rgba(0,0,0,0.08)'};
          transform: translateY(-2px);
        }

        .stat-number-custom {
          font-size: 24px;
          font-weight: 700;
          color: ${isDarkMode ? 'white' : '#1E1B2E'};
        }

        .stat-label-custom {
          font-size: 13px;
          font-weight: 500;
          color: ${isDarkMode ? '#9E98AE' : '#9E98AE'};
        }

        .meeting-cards-grid-custom {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        @media (max-width: 1024px) {
          .meeting-cards-grid-custom {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .meeting-cards-grid-custom {
            grid-template-columns: 1fr;
          }
        }

        .meeting-card-custom {
          position: relative;
          background: ${isDarkMode 
            ? 'linear-gradient(145deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.02))'
            : '#FFFFFF'};
          border: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#E9E5F3'};
          border-radius: 20px;
          padding: 24px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-sizing: border-box;
          box-shadow: ${isDarkMode ? 'none' : '0 4px 16px rgba(0,0,0,0.06)'};
        }

        .meeting-card-custom:hover {
          transform: translateY(-4px);
          box-shadow: ${isDarkMode 
            ? '0 20px 48px rgba(0, 0, 0, 0.30), 0 0 20px rgba(168, 85, 247, 0.08)'
            : '0 12px 32px rgba(0,0,0,0.10)'};
        }

        .card-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .status-badge-custom {
          border-radius: 20px;
          padding: 4px 12px;
          font-size: 12px;
          font-weight: 600;
          display: inline-block;
        }

        .status-badge-completed {
          background: ${isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5'};
          color: ${isDarkMode ? '#34D399' : '#059669'};
          border: 1px solid ${isDarkMode ? 'rgba(52, 211, 153, 0.20)' : '#A7F3D0'};
        }

        .status-badge-failed {
          background: ${isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2'};
          color: ${isDarkMode ? '#F87171' : '#DC2626'};
          border: 1px solid ${isDarkMode ? 'rgba(248, 113, 113, 0.20)' : '#FECACA'};
        }

        .status-badge-pending {
          background: ${isDarkMode ? 'rgba(251, 191, 36, 0.15)' : '#FFFBEB'};
          color: ${isDarkMode ? '#FBBF24' : '#D97706'};
          border: 1px solid ${isDarkMode ? 'rgba(252, 211, 77, 0.20)' : '#FDE68A'};
        }

        .menu-dropdown-card {
          position: absolute;
          top: 48px;
          right: 24px;
          background: ${isDarkMode ? '#1B162B' : '#FFFFFF'};
          border: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#E9E5F3'};
          border-radius: 12px;
          padding: 8px;
          z-index: 10;
          width: 120px;
          box-shadow: ${isDarkMode ? '0 10px 25px rgba(0, 0, 0, 0.5)' : '0 8px 24px rgba(0,0,0,0.10)'};
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .menu-dropdown-item {
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 500;
          color: ${isDarkMode ? '#B9B4C7' : '#6F6882'};
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .menu-dropdown-item:hover {
          background: ${isDarkMode ? 'rgba(168, 85, 247, 0.15)' : '#F1E8FF'};
          color: ${isDarkMode ? 'white' : '#7C3AED'};
        }

        .menu-dropdown-item.delete-option {
          color: ${isDarkMode ? '#F87171' : '#DC2626'};
        }

        .menu-dropdown-item.delete-option:hover {
          background: ${isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(220, 38, 38, 0.08)'};
          color: ${isDarkMode ? '#F87171' : '#DC2626'};
        }

        .meeting-card-title {
          font-size: 17px;
          font-weight: 700;
          color: ${isDarkMode ? 'white' : '#1E1B2E'};
          margin-top: 14px;
          margin-bottom: 8px;
          line-height: 1.4;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .view-notes-btn-custom {
          color: ${isDarkMode ? '#C084FC' : '#8B5CF6'};
          font-size: 13px;
          font-weight: 600;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          margin-top: 16px;
          display: inline-block;
          font-family: inherit;
          transition: opacity 0.2s ease;
          text-align: left;
        }

        .view-notes-btn-custom:hover {
          opacity: 0.8;
        }

        .meeting-list-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          background: ${isDarkMode 
            ? 'linear-gradient(145deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.02))'
            : '#FFFFFF'};
          border: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#E9E5F3'};
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-sizing: border-box;
          box-shadow: ${isDarkMode ? 'none' : '0 4px 16px rgba(0,0,0,0.06)'};
        }

        .meeting-list-row:hover {
          transform: translateY(-2px);
          box-shadow: ${isDarkMode 
            ? '0 8px 24px rgba(0, 0, 0, 0.20), 0 0 15px rgba(168, 85, 247, 0.05)'
            : '0 12px 32px rgba(0,0,0,0.10)'};
        }

        .skeleton-card {
          border-radius: 20px;
          padding: 24px;
          height: 250px;
          background: ${isDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)'};
          border: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#E9E5F3'};
          animation: shimmer 1.2s infinite alternate ease-in-out;
        }

        .empty-state-custom {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 100px 24px;
          text-align: center;
        }

        .empty-emoji {
          font-size: 64px;
          margin: 0;
        }

        .empty-title {
          font-size: 22px;
          font-weight: 700;
          color: ${isDarkMode ? 'white' : '#1E1B2E'};
          margin: 16px 0 0 0;
        }

        .empty-subtitle {
          color: ${isDarkMode ? '#7E7693' : '#9E98AE'};
          font-size: 15px;
          margin: 8px 0 0 0;
        }

        .empty-btn-custom {
          background: linear-gradient(135deg, #8B5CF6, #7C3AED);
          border-radius: 14px;
          padding: 12px 24px;
          color: white;
          font-weight: 600;
          font-size: 14px;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(139, 92, 246, 0.25);
          margin-top: 24px;
          text-decoration: none;
          transition: all 0.3s ease;
          display: inline-block;
        }

        .empty-btn-custom:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(139, 92, 246, 0.30);
        }

        .error-banner-custom {
          padding: 12px 16px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #EF4444;
          border-radius: 12px;
          color: #F87171;
          font-size: 14px;
          margin-bottom: 24px;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes shimmer {
          from {
            opacity: 0.4;
          }
          to {
            opacity: 0.8;
          }
        }
      `}</style>

      {/* Fixed Sidebar */}
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
            <div onClick={() => navigate('/dashboard')} className="nav-link-custom active">
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

            <div onClick={() => navigate('/settings')} className="nav-link-custom">
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
        
        {/* Top Bar with Search & Filters */}
        <div className="top-bar-custom">
          <h1 className="page-title-custom">Meetings</h1>
          
          <div className="search-filter-controls">
            {/* Search Input */}
            <div className="search-input-wrapper">
              <svg className="search-icon-custom" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Search meetings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input-custom"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select-custom"
            >
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="select-custom"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name A-Z</option>
            </select>

            {/* Grid / List View Toggle */}
            <div className="view-toggle-buttons">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
                title="Grid View"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`view-btn ${viewMode === "list" ? "active" : ""}`}
                title="List View"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {error && <div className="error-banner-custom">{error}</div>}

        {/* Stats Row */}
        {!loading && meetings.length > 0 && (
          <div className="stats-row-custom">
            <div className="stat-chip-custom">
              <div className="stat-number-custom">{stats.total}</div>
              <div className="stat-label-custom">Total Meetings</div>
            </div>
            <div className="stat-chip-custom">
              <div className="stat-number-custom">{stats.completed}</div>
              <div className="stat-label-custom">Completed</div>
            </div>
            <div className="stat-chip-custom">
              <div className="stat-number-custom">{stats.failed}</div>
              <div className="stat-label-custom">Failed</div>
            </div>
            <div className="stat-chip-custom">
              <div className="stat-number-custom">{stats.processing}</div>
              <div className="stat-label-custom">Processing</div>
            </div>
          </div>
        )}

        {loading ? (
          /* Loading State: 6 Shimmer Skeleton Cards */
          <div className="meeting-cards-grid-custom">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        ) : filteredAndSortedMeetings.length === 0 ? (
          /* Empty State - check if filtered or fully empty */
          <div className="empty-state-custom">
            {(searchQuery || statusFilter !== "all") && meetings.length > 0 ? (
              <>
                <p className="empty-emoji">🔍</p>
                <h3 className="empty-title">No meetings match your search</h3>
                <p className="empty-subtitle">Try adjusting your filters or search terms</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  className="empty-btn-custom"
                  style={{ marginTop: "16px" }}
                >
                  Clear Filters
                </button>
              </>
            ) : (
              <>
                <p className="empty-emoji">🎙️</p>
                <h3 className="empty-title">No meetings found</h3>
                <p className="empty-subtitle">
                  Upload your first recording to get started
                </p>
                <Link to="/upload" className="empty-btn-custom">
                  New Meeting
                </Link>
              </>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View (Default) */
          <div className="meeting-cards-grid-custom">
            {filteredAndSortedMeetings.map((meeting) => (
              <div
                key={meeting.id}
                className="meeting-card-custom"
                style={{ cursor: "pointer" }}
                onClick={() => navigate("/meetings/" + meeting.id + "/notes")}
              >
                {/* Top Row: status pill left, three-dot menu right */}
                <div className="card-top-row">
                  {meeting.status === "completed" && (
                    <span className="status-badge-custom status-badge-completed">
                      Completed
                    </span>
                  )}
                  {meeting.status === "failed" && (
                    <span className="status-badge-custom status-badge-failed">
                      Failed
                    </span>
                  )}
                  {meeting.status !== "completed" && meeting.status !== "failed" && (
                    <span className="status-badge-custom status-badge-pending">
                      {meeting.status === "processing" ? "Processing" : "Uploading"}
                    </span>
                  )}

                  {/* Three-dot menu button */}
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === meeting.id ? null : meeting.id);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#7E7693",
                        cursor: "pointer",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      title="Menu"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="5" r="1.5"></circle>
                        <circle cx="12" cy="12" r="1.5"></circle>
                        <circle cx="12" cy="19" r="1.5"></circle>
                      </svg>
                    </button>

                    {/* Dropdown Menu Card */}
                    {activeMenuId === meeting.id && (
                      <div
                        className="menu-dropdown-card"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div onClick={() => alert("Rename is coming soon!")} className="menu-dropdown-item">Rename</div>
                        <div onClick={() => alert("Download is coming soon!")} className="menu-dropdown-item">Download</div>
                        <div onClick={() => alert("Share is coming soon!")} className="menu-dropdown-item">Share</div>
                        <div
                          onClick={(e) => {
                            setActiveMenuId(null);
                            handleDelete(e, meeting.id);
                          }}
                          className="menu-dropdown-item delete-option"
                        >
                          Delete
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="meeting-card-title" title={meeting.title || "Untitled Meeting"}>
                  {meeting.title || "Untitled Meeting"}
                </h3>

                {/* Transcript Preview */}
                <p
                  style={{
                    color: "#7E7693",
                    fontSize: "13px",
                    lineHeight: "1.5",
                    margin: "8px 0 0 0",
                    height: "39px",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    wordBreak: "break-word"
                  }}
                >
                  {meeting.raw_text || "No transcript yet"}
                </p>

                {/* Waveform Placeholder */}
                <div style={{ display: "flex", gap: "2px", alignItems: "end", marginTop: "16px", height: "20px" }}>
                  {mockWaveformBars.map((height, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: "3px",
                        height: `${height}px`,
                        borderRadius: "2px",
                        background: isDarkMode ? "rgba(168,85,247,0.35)" : "rgba(139,92,246,0.25)"
                      }}
                    />
                  ))}
                </div>

                {/* Date & Duration Row */}
                <div style={{ display: "flex", justifyContent: "space-between", color: "#7E7693", fontSize: "12px", marginTop: "12px" }}>
                  <span>{formatDate(meeting.created_at)}</span>
                  <span>{meeting.duration || "5:00"}</span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/meetings/" + meeting.id + "/notes");
                  }}
                  className="view-notes-btn-custom"
                >
                  View Notes
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "24px" }}>
            {filteredAndSortedMeetings.map((meeting) => (
              <div
                key={meeting.id}
                onClick={() => navigate("/meetings/" + meeting.id + "/notes")}
                className="meeting-list-row"
              >
                {/* Status pill on left */}
                <div style={{ flexShrink: 0 }}>
                  {meeting.status === "completed" && (
                    <span className="status-badge-custom status-badge-completed">Completed</span>
                  )}
                  {meeting.status === "failed" && (
                    <span className="status-badge-custom status-badge-failed">Failed</span>
                  )}
                  {meeting.status !== "completed" && meeting.status !== "failed" && (
                    <span className="status-badge-custom status-badge-pending">
                      {meeting.status === "processing" ? "Processing" : "Uploading"}
                    </span>
                  )}
                </div>

                {/* Title and Date Stacked */}
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <h4 style={{ margin: 0, color: isDarkMode ? "white" : "#1E1B2E", fontSize: "16px", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {meeting.title || "Untitled Meeting"}
                  </h4>
                  <span style={{ fontSize: "13px", color: "#7E7693" }}>
                    {formatDate(meeting.created_at)}
                  </span>
                </div>

                {/* Actions on right */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }} onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => navigate("/meetings/" + meeting.id + "/notes")}
                    className="view-notes-btn-custom"
                    style={{ marginTop: 0 }}
                  >
                    View Notes
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, meeting.id)}
                    style={{
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "none",
                      color: "#F87171",
                      borderRadius: "8px",
                      padding: "8px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                    title="Delete meeting"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;

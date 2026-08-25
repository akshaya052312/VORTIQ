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
  
  // Responsive mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Desktop sidebar collapse / expand state
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem("sidebar_collapsed") === "true");

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  };

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

  const handleNavClick = (path) => {
    navigate(path);
    setIsSidebarOpen(false);
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
          background: rgba(220, 38, 38, 0.08);
        }

        .main-content {
          flex: 1;
          overflow-y: auto;
          height: calc(100vh - 32px);
          padding: 36px 44px;
          box-sizing: border-box;
          animation: fadeIn 0.35s ease forwards;
          border-radius: 18px;
          background: ${isDarkMode ? '#0F0F0F' : '#F5F6F8'};
        }

        .main-content::-webkit-scrollbar {
          width: 6px;
        }

        .main-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .main-content::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'};
          border-radius: 9999px;
        }

        .main-content::-webkit-scrollbar-thumb:hover {
          background: ${isDarkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'};
        }

        .top-bar-custom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
          gap: 16px;
          flex-wrap: wrap;
        }

        .page-title-custom {
          font-size: 26px;
          font-weight: 800;
          color: ${isDarkMode ? '#F9FAFB' : '#111111'};
          letter-spacing: -0.5px;
          margin: 0;
        }

        .search-filter-controls {
          display: flex;
          align-items: center;
          gap: 10px;
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
          color: ${isDarkMode ? '#6B7280' : '#9CA3AF'};
          pointer-events: none;
        }

        .search-input-custom {
          height: 40px;
          width: 210px;
          border-radius: 10px;
          background: ${isDarkMode ? '#1A1A1A' : '#FFFFFF'};
          border: 1px solid ${isDarkMode ? '#2A2A2A' : '#E5E7EB'};
          color: ${isDarkMode ? '#F9FAFB' : '#111111'};
          font-size: 13px;
          padding: 0 14px 0 38px;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          font-family: inherit;
        }

        .search-input-custom::placeholder {
          color: ${isDarkMode ? '#4B5563' : '#9CA3AF'};
        }

        .search-input-custom:focus {
          border-color: ${isDarkMode ? '#4B5563' : '#6B7280'};
          box-shadow: 0 0 0 3px ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
        }

        .select-custom {
          height: 40px;
          padding: 0 36px 0 14px;
          border-radius: 10px;
          background: ${isDarkMode ? '#1A1A1A' : '#FFFFFF'};
          border: 1px solid ${isDarkMode ? '#2A2A2A' : '#E5E7EB'};
          color: ${isDarkMode ? '#F9FAFB' : '#111111'};
          font-size: 13px;
          outline: none;
          cursor: pointer;
          font-family: inherit;
          transition: border-color 0.2s ease;
          appearance: none;
          -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='${isDarkMode ? '%236B7280' : '%239CA3AF'}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
        }

        .select-custom:focus {
          border-color: ${isDarkMode ? '#4B5563' : '#6B7280'};
        }

        .select-custom option {
          background: ${isDarkMode ? '#1A1A1A' : '#FFFFFF'};
          color: ${isDarkMode ? '#F9FAFB' : '#111111'};
        }

        .view-toggle-buttons {
          display: flex;
          gap: 2px;
          background: ${isDarkMode ? '#1A1A1A' : '#FFFFFF'};
          border: 1px solid ${isDarkMode ? '#2A2A2A' : '#E5E7EB'};
          padding: 3px;
          border-radius: 10px;
        }

        .view-btn {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: ${isDarkMode ? '#6B7280' : '#9CA3AF'};
          cursor: pointer;
          transition: all 0.15s ease;
          border-radius: 7px;
        }

        .view-btn.active {
          background: ${isDarkMode ? '#F9FAFB' : '#111111'};
          color: ${isDarkMode ? '#111111' : '#FFFFFF'};
        }

        .view-btn:hover:not(.active) {
          color: ${isDarkMode ? '#F9FAFB' : '#111111'};
        }

        .stats-row-custom {
          display: flex;
          gap: 14px;
          margin-bottom: 28px;
          flex-wrap: wrap;
        }

        .stat-chip-custom {
          flex: 1;
          min-width: 130px;
          background: ${isDarkMode ? '#1A1A1A' : '#FFFFFF'};
          border: 1px solid ${isDarkMode ? '#2A2A2A' : '#E5E7EB'};
          border-radius: 16px;
          padding: 20px 22px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
          box-shadow: ${isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.05)'};
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .stat-chip-custom:hover {
          transform: translateY(-2px);
          box-shadow: ${isDarkMode ? '0 6px 16px rgba(0,0,0,0.25)' : '0 4px 12px rgba(0,0,0,0.08)'};
        }

        .stat-number-custom {
          font-size: 30px;
          font-weight: 800;
          letter-spacing: -1px;
          color: ${isDarkMode ? '#F9FAFB' : '#111111'};
          line-height: 1;
        }

        .stat-label-custom {
          font-size: 12px;
          font-weight: 500;
          color: ${isDarkMode ? '#6B7280' : '#9CA3AF'};
        }

        .meeting-cards-grid-custom {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        @media (max-width: 1200px) {
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
          background: ${isDarkMode ? '#1A1A1A' : '#FFFFFF'};
          border: 1px solid ${isDarkMode ? '#2A2A2A' : '#E5E7EB'};
          border-radius: 18px;
          padding: 22px 24px;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
          box-shadow: ${isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.05)'};
        }

        .meeting-card-custom:hover {
          transform: translateY(-3px);
          box-shadow: ${isDarkMode ? '0 12px 32px rgba(0,0,0,0.35)' : '0 8px 24px rgba(0,0,0,0.09)'};
        }

        .card-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        /* Status: dot + label */
        .status-badge-custom {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 12.5px;
          font-weight: 500;
          color: ${isDarkMode ? '#9CA3AF' : '#374151'};
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
          display: inline-block;
        }

        .status-badge-completed .status-dot { background: #16A34A; }
        .status-badge-failed    .status-dot { background: #DC2626; }
        .status-badge-pending   .status-dot {
          background: #D97706;
          animation: pulse-dot 1.8s ease-in-out infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }

        .menu-dropdown-card {
          position: absolute;
          top: 40px;
          right: 0;
          background: ${isDarkMode ? '#1E1E1E' : '#FFFFFF'};
          border: 1px solid ${isDarkMode ? '#2A2A2A' : '#E5E7EB'};
          border-radius: 12px;
          padding: 6px;
          z-index: 20;
          width: 130px;
          box-shadow: ${isDarkMode ? '0 10px 30px rgba(0,0,0,0.50)' : '0 8px 24px rgba(0,0,0,0.10)'};
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .menu-dropdown-item {
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 500;
          color: ${isDarkMode ? '#9CA3AF' : '#374151'};
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }

        .menu-dropdown-item:hover {
          background: ${isDarkMode ? '#2A2A2A' : '#F3F4F6'};
          color: ${isDarkMode ? '#F9FAFB' : '#111111'};
        }

        .menu-dropdown-item.delete-option {
          color: #DC2626;
        }

        .menu-dropdown-item.delete-option:hover {
          background: rgba(220, 38, 38, 0.08);
          color: #DC2626;
        }

        .meeting-card-title {
          font-size: 16px;
          font-weight: 700;
          color: ${isDarkMode ? '#F9FAFB' : '#111111'};
          margin-top: 14px;
          margin-bottom: 6px;
          line-height: 1.4;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .view-notes-btn-custom {
          color: ${isDarkMode ? '#9CA3AF' : '#6B7280'};
          font-size: 12.5px;
          font-weight: 600;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          margin-top: 14px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-family: inherit;
          transition: color 0.15s ease;
          text-align: left;
        }

        .view-notes-btn-custom:hover {
          color: ${isDarkMode ? '#F9FAFB' : '#111111'};
        }

        .meeting-list-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 20px;
          background: ${isDarkMode ? '#1A1A1A' : '#FFFFFF'};
          border: 1px solid ${isDarkMode ? '#2A2A2A' : '#E5E7EB'};
          border-radius: 14px;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
        }

        .meeting-list-row:hover {
          transform: translateY(-2px);
          box-shadow: ${isDarkMode ? '0 6px 20px rgba(0,0,0,0.30)' : '0 6px 20px rgba(0,0,0,0.08)'};
        }

        .skeleton-card {
          border-radius: 18px;
          padding: 24px;
          height: 240px;
          background: ${isDarkMode ? '#1A1A1A' : '#EFEFEF'};
          border: 1px solid ${isDarkMode ? '#2A2A2A' : '#E5E7EB'};
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
          font-size: 56px;
          margin: 0;
        }

        .empty-title {
          font-size: 20px;
          font-weight: 700;
          color: ${isDarkMode ? '#F9FAFB' : '#111111'};
          margin: 16px 0 0;
        }

        .empty-subtitle {
          color: ${isDarkMode ? '#6B7280' : '#9CA3AF'};
          font-size: 14px;
          margin: 8px 0 0;
        }

        .empty-btn-custom {
          background: ${isDarkMode ? '#F9FAFB' : '#111111'};
          border-radius: 999px;
          padding: 11px 24px;
          color: ${isDarkMode ? '#111111' : '#FFFFFF'};
          font-weight: 600;
          font-size: 14px;
          border: none;
          cursor: pointer;
          margin-top: 24px;
          text-decoration: none;
          transition: opacity 0.2s ease, transform 0.2s ease;
          display: inline-block;
          font-family: inherit;
        }

        .empty-btn-custom:hover {
          opacity: 0.88;
          transform: translateY(-1px);
        }

        .error-banner-custom {
          padding: 12px 16px;
          background: rgba(220, 38, 38, 0.06);
          border: 1px solid rgba(220, 38, 38, 0.25);
          border-radius: 10px;
          color: #DC2626;
          font-size: 13.5px;
          margin-bottom: 24px;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @keyframes shimmer {
          from { opacity: 0.5; }
          to   { opacity: 0.85; }
        }

        /* Mobile */
        .mobile-hamburger-btn {
          display: none;
          background: transparent;
          border: none;
          color: ${isDarkMode ? '#F9FAFB' : '#111111'};
          cursor: pointer;
          padding: 8px;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: background-color 0.15s;
          margin-right: 4px;
        }

        .mobile-hamburger-btn:hover {
          background: ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'};
        }

        .new-meeting-top-btn {
          background: ${isDarkMode ? '#F9FAFB' : '#111111'};
          border-radius: 999px;
          padding: 9px 20px;
          color: ${isDarkMode ? '#111111' : '#FFFFFF'};
          font-weight: 600;
          font-size: 13px;
          border: none;
          cursor: pointer;
          text-decoration: none;
          transition: opacity 0.2s ease, transform 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
          letter-spacing: 0.1px;
          font-family: inherit;
        }

        .new-meeting-top-btn:hover {
          opacity: 0.88;
          transform: translateY(-1px);
        }

        .sidebar-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(4px);
          z-index: 99;
          animation: fadeIn 0.2s ease forwards;
        }

        @media (max-width: 768px) {
          .dashboard-wrapper {
            padding: 0;
            gap: 0;
          }

          .mobile-hamburger-btn {
            display: flex;
          }

          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            border-radius: 0;
            transform: translateX(-100%);
            box-shadow: none;
          }

          .sidebar.open {
            transform: translateX(0);
            box-shadow: 4px 0 40px rgba(0, 0, 0, 0.35);
          }

          .main-content {
            height: 100vh;
            border-radius: 0;
            padding: 20px 16px;
          }

          .search-filter-controls {
            flex-direction: column;
            align-items: stretch;
            width: 100%;
            gap: 10px;
          }

          .search-input-wrapper,
          .search-input-custom,
          .select-custom {
            width: 100% !important;
          }

          .view-toggle-buttons {
            justify-content: center;
            width: 100%;
          }

          .view-btn { flex: 1; }

          .stats-row-custom {
            flex-wrap: nowrap;
            overflow-x: auto;
            padding-bottom: 8px;
            -webkit-overflow-scrolling: touch;
          }

          .stats-row-custom::-webkit-scrollbar { display: none; }

          .stat-chip-custom {
            flex: 0 0 140px;
            min-width: 140px;
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

      {/* Responsive Sidebar */}
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
              onClick={() => handleNavClick('/dashboard')} 
              className="nav-link-custom active"
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
              onClick={() => handleNavClick('/settings')} 
              className="nav-link-custom"
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
        
        {/* Top Bar with Search & Filters */}
        <div className="top-bar-custom">
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Hamburger button on mobile */}
            <button 
              className="mobile-hamburger-btn" 
              onClick={() => setIsSidebarOpen(true)}
              title="Open Sidebar"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <h1 className="page-title-custom">Meetings</h1>
            <Link to="/upload" className="new-meeting-top-btn">
              + New Meeting
            </Link>
          </div>
          
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
                {/* Top Row: status dot+label left, three-dot menu right */}
                <div className="card-top-row">
                  {meeting.status === "completed" && (
                    <span className="status-badge-custom status-badge-completed">
                      <span className="status-dot" />
                      Completed
                    </span>
                  )}
                  {meeting.status === "failed" && (
                    <span className="status-badge-custom status-badge-failed">
                      <span className="status-dot" />
                      Failed
                    </span>
                  )}
                  {meeting.status !== "completed" && meeting.status !== "failed" && (
                    <span className="status-badge-custom status-badge-pending">
                      <span className="status-dot" />
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
                        color: isDarkMode ? "#6B7280" : "#9CA3AF",
                        cursor: "pointer",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "6px",
                        transition: "color 0.15s ease"
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
                        background: idx === 8 || idx === 14
                          ? (isDarkMode ? "#F9FAFB" : "#111111")
                          : (isDarkMode ? "#2A2A2A" : "#E5E7EB")
                      }}
                    />
                  ))}
                </div>

                {/* Date & Duration Row */}
                <div style={{ display: "flex", justifyContent: "space-between", color: isDarkMode ? "#6B7280" : "#9CA3AF", fontSize: "12px", marginTop: "12px" }}>
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
                {/* Status dot+label on left */}
                <div style={{ flexShrink: 0 }}>
                  {meeting.status === "completed" && (
                    <span className="status-badge-custom status-badge-completed">
                      <span className="status-dot" />Completed
                    </span>
                  )}
                  {meeting.status === "failed" && (
                    <span className="status-badge-custom status-badge-failed">
                      <span className="status-dot" />Failed
                    </span>
                  )}
                  {meeting.status !== "completed" && meeting.status !== "failed" && (
                    <span className="status-badge-custom status-badge-pending">
                      <span className="status-dot" />
                      {meeting.status === "processing" ? "Processing" : "Uploading"}
                    </span>
                  )}
                </div>

                {/* Title and Date Stacked */}
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <h4 style={{ margin: 0, color: isDarkMode ? "#F9FAFB" : "#111111", fontSize: "15px", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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

/**
 * MeetingLayout — shared sidebar + content layout for Meeting Detail and Meeting Notes.
 *
 * Props:
 *   meetingId    (string)  – UUID of the meeting, used to build sidebar links.
 *   meetingTitle (string)  – Display title shown in the sidebar header.
 *   activePage   (string)  – Either "detail" or "notes" to highlight the active nav link.
 *   children     (node)    – The right-side page content to render.
 */

import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import VortiqLogo from "./VortiqLogo";

const SIDEBAR_WIDTH = 270;

// ── inline style objects ────────────────────────────────────────────────────

const getStyles = (isDarkMode, isCollapsed) => ({
  root: {
    display: "flex",
    minHeight: "100vh",
    background: isDarkMode ? "#0F0F0F" : "#F5F6F8",
    color: isDarkMode ? "#F9FAFB" : "#111111",
    fontFamily: "'Inter', system-ui, sans-serif",
    padding: "16px",
    gap: "16px",
    boxSizing: "border-box",
  },

  // Sidebar — floating dark/light panel
  sidebar: {
    width: isCollapsed ? "76px" : `${SIDEBAR_WIDTH}px`,
    minWidth: isCollapsed ? "76px" : `${SIDEBAR_WIDTH}px`,
    maxWidth: isCollapsed ? "76px" : `${SIDEBAR_WIDTH}px`,
    height: "calc(100vh - 32px)",
    position: "sticky",
    top: "16px",
    background: isDarkMode ? "#F5F5F5" : "#1A1A1A",
    borderRadius: "18px",
    boxShadow: isDarkMode
      ? "0 2px 12px rgba(0,0,0,0.12)"
      : "0 2px 16px rgba(0,0,0,0.18)",
    display: "flex",
    flexDirection: "column",
    padding: isCollapsed ? "24px 12px" : "28px 20px",
    gap: 0,
    flexShrink: 0,
    overflowY: "auto",
    overflowX: "hidden",
    boxSizing: "border-box",
    scrollbarWidth: "thin",
    transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1), padding 0.25s ease",
    scrollbarColor: isDarkMode
      ? "rgba(0,0,0,0.18) transparent"
      : "rgba(255,255,255,0.18) transparent",
  },

  // Sidebar brand/logo row
  sidebarBrand: {
    display: "flex",
    alignItems: "center",
    justifyContent: isCollapsed ? "center" : "space-between",
    marginBottom: "24px",
    paddingBottom: "18px",
    borderBottom: `1px solid ${isDarkMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
  },
  brandLink: {
    fontSize: "18px",
    fontWeight: "800",
    color: isDarkMode ? "#111111" : "#FFFFFF",
    letterSpacing: "-0.4px",
    textDecoration: "none",
  },
  backBtn: {
    display: isCollapsed ? "none" : "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 14px",
    borderRadius: "999px",
    background: isDarkMode ? "#111111" : "#FFFFFF",
    color: isDarkMode ? "#FFFFFF" : "#111111",
    fontSize: "12px",
    fontWeight: "600",
    textDecoration: "none",
    border: "none",
    cursor: "pointer",
    transition: "opacity 0.15s ease",
    fontFamily: "'Inter', sans-serif",
  },
  toggleBtn: {
    width: "30px",
    height: "30px",
    borderRadius: "8px",
    background: isDarkMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)",
    border: "none",
    color: isDarkMode ? "#111111" : "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s ease",
    padding: 0,
    flexShrink: 0,
  },

  // Meeting title block
  meetingTitleBlock: {
    display: isCollapsed ? "none" : "block",
    marginBottom: "24px",
    paddingBottom: "18px",
    borderBottom: `1px solid ${isDarkMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
  },
  meetingTitleLabel: {
    fontSize: "11px",
    fontWeight: "600",
    letterSpacing: "0.8px",
    color: isDarkMode ? "#9CA3AF" : "rgba(255,255,255,0.45)",
    textTransform: "uppercase",
    marginBottom: "6px",
  },
  meetingTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: isDarkMode ? "#111111" : "#FFFFFF",
    letterSpacing: "-0.3px",
    lineHeight: "1.3",
    wordBreak: "break-word",
  },

  // Navigation section label
  navGroupLabel: {
    display: isCollapsed ? "none" : "block",
    fontSize: "11px",
    fontWeight: "600",
    letterSpacing: "0.8px",
    color: isDarkMode ? "#9CA3AF" : "rgba(255,255,255,0.45)",
    textTransform: "uppercase",
    padding: "0 8px",
    marginBottom: "8px",
    marginTop: "4px",
  },

  // Nav items — vertical list
  navGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "20px",
    alignItems: isCollapsed ? "center" : "stretch",
  },
  navLink: {
    height: "48px",
    width: isCollapsed ? "48px" : "100%",
    padding: isCollapsed ? 0 : "0 16px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "500",
    color: isDarkMode ? "rgba(17,17,17,0.65)" : "rgba(255,255,255,0.65)",
    textDecoration: "none",
    transition: "all 0.2s ease",
    border: "1px solid transparent",
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: isCollapsed ? "center" : "flex-start",
    gap: "14px",
    textAlign: "left",
    boxSizing: "border-box",
  },
  navLinkActive: {
    background: isDarkMode ? "#111111" : "#FFFFFF",
    color: isDarkMode ? "#FFFFFF" : "#111111",
    fontWeight: "600",
    borderColor: "transparent",
    boxShadow: "0 2px 8px rgba(0,0,0,0.14)",
  },

  // Right content area
  content: {
    flex: 1,
    minWidth: 0,
    overflowY: "auto",
    height: "calc(100vh - 32px)",
    background: isDarkMode ? "#0F0F0F" : "#F5F6F8",
    borderRadius: "18px",
  },
});

// ── Nav icons ───────────────────────────────────────────────────────────────

const DetailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
  </svg>
);

const NotesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0 }}>
    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
  </svg>
);

// ── Component ────────────────────────────────────────────────────────────────

import { useState } from "react";

const MeetingLayout = ({ meetingId, meetingTitle, activePage, children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode } = useTheme();

  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem("sidebar_collapsed") === "true");

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const styles = getStyles(isDarkMode, isCollapsed);

  const isDetail = activePage === "detail";
  const isNotes  = activePage === "notes";

  return (
    <div style={styles.root}>

      {/* ── Sidebar ── */}
      <aside style={styles.sidebar}>

        {/* Brand + back to dashboard / toggle */}
        <div style={styles.sidebarBrand}>
          <div 
            style={{ cursor: isCollapsed ? "pointer" : "default", display: "flex", alignItems: "center" }}
            onClick={isCollapsed ? toggleCollapse : undefined}
            title={isCollapsed ? "Expand sidebar" : undefined}
          >
            <VortiqLogo size={28} showText={!isCollapsed} isDark={!isDarkMode} />
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Link to="/" style={styles.backBtn}>← Back</Link>
            <button
              onClick={toggleCollapse}
              style={styles.toggleBtn}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {isCollapsed ? (
                  <polyline points="9 18 15 12 9 6"></polyline>
                ) : (
                  <polyline points="15 18 9 12 15 6"></polyline>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Meeting title block */}
        <div style={styles.meetingTitleBlock}>
          <div style={styles.meetingTitleLabel}>Current Meeting</div>
          <div style={styles.meetingTitle}>
            {meetingTitle || "Untitled Meeting"}
          </div>
        </div>

        {/* Nav group */}
        <div style={styles.navGroupLabel}>Navigation</div>
        <div style={styles.navGrid}>
          <Link
            to={`/meetings/${meetingId}`}
            style={{
              ...styles.navLink,
              ...(location.pathname === `/meetings/${meetingId}` ? styles.navLinkActive : {}),
            }}
            title={isCollapsed ? "Detail" : undefined}
          >
            <DetailIcon />
            {!isCollapsed && <span>Detail</span>}
          </Link>
          <Link
            to={`/meetings/${meetingId}/notes`}
            style={{
              ...styles.navLink,
              ...(location.pathname === `/meetings/${meetingId}/notes` ? styles.navLinkActive : {}),
            }}
            title={isCollapsed ? "Notes" : undefined}
          >
            <NotesIcon />
            {!isCollapsed && <span>Notes</span>}
          </Link>
        </div>

        {/* User info + logout at bottom */}
        <div style={{ marginTop: "auto", paddingTop: "16px", borderTop: `1px solid ${isDarkMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}` }}>
          <div 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: isCollapsed ? "center" : "flex-start",
              gap: "8px", 
              padding: isCollapsed ? "6px 0" : "8px", 
              borderRadius: "12px", 
              background: isDarkMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.07)", 
              marginBottom: "8px" 
            }}
            title={isCollapsed ? `${user?.full_name || "User"} (${user?.email})` : undefined}
          >
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: isDarkMode ? "#D1D5DB" : "#333333", color: isDarkMode ? "#111111" : "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "12px", flexShrink: 0 }}>
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
            </div>
            {!isCollapsed && (
              <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: isDarkMode ? "#111111" : "rgba(255,255,255,0.90)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.full_name || "User"}</span>
                <span style={{ fontSize: "10px", color: isDarkMode ? "#6B7280" : "rgba(255,255,255,0.45)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</span>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            style={{ 
              height: "36px", 
              width: isCollapsed ? "44px" : "100%",
              padding: isCollapsed ? "0" : "0 12px", 
              margin: isCollapsed ? "0 auto" : "0",
              borderRadius: "10px", 
              fontSize: "12px", 
              fontWeight: "500", 
              color: isDarkMode ? "rgba(17,17,17,0.45)" : "rgba(255,255,255,0.40)", 
              cursor: "pointer", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: isCollapsed ? "center" : "flex-start",
              gap: "8px", 
              transition: "all 0.15s ease", 
              background: "transparent", 
              border: "none", 
              textAlign: "left", 
              fontFamily: "'Inter', sans-serif" 
            }}
            title={isCollapsed ? "Log Out" : undefined}
            onMouseEnter={e => { e.currentTarget.style.color = "#DC2626"; e.currentTarget.style.background = "rgba(220,38,38,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = isDarkMode ? "rgba(17,17,17,0.45)" : "rgba(255,255,255,0.40)"; e.currentTarget.style.background = "transparent"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            {!isCollapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={styles.content}>
        {children}
      </main>
    </div>
  );
};

export default MeetingLayout;

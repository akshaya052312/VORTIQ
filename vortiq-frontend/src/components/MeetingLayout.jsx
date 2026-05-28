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

const SIDEBAR_WIDTH = 252;

// ── inline style objects ────────────────────────────────────────────────────

const styles = {
  root: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    background: "transparent",
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-body)",
  },

  // Top navbar
  navbar: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 32px",
    height: "68px",
    background: "var(--color-surface)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderBottom: "1px solid var(--color-glass-border)",
  },
  navBrand: {
    fontSize: "22px",
    fontWeight: "700",
    color: "var(--color-primary)",
    fontFamily: "var(--font-display)",
    textDecoration: "none",
  },
  navActions: {
    display: "flex",
    alignItems: "center",
    gap: "1.5rem",
  },
  navLinkBtn: {
    padding: "11px 28px",
    borderRadius: "999px",
    background: "var(--color-surface-strong)",
    border: "1px solid var(--color-glass-border)",
    color: "var(--color-text-primary)",
    fontSize: "14px",
    fontWeight: "600",
    textDecoration: "none",
    transition: "var(--transition)",
  },
  logoutBtn: {
    padding: "11px 28px",
    borderRadius: "999px",
    background: "rgba(255, 255, 255, 0.08)",
    border: "1px solid var(--color-glass-border)",
    color: "var(--color-text-primary)",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "var(--transition)",
  },
  navTabs: {
    display: "flex",
    gap: "4px",
    alignItems: "center",
  },
  navTab: {
    padding: "8px 18px",
    borderRadius: "20px",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    background: "transparent",
    color: "#8E7A99",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    textDecoration: "none",
    transition: "all 0.3s ease",
  },
  navTabActive: {
    background: "rgba(168, 85, 247, 0.20)",
    border: "1px solid #C084FC",
    color: "#C084FC",
  },
  navTabLight: {
    border: "1px solid #D9D0EC",
    color: "#6F6882",
  },
  navTabActiveLightMode: {
    background: "#F1E8FF",
    border: "1px solid #8B5CF6",
    color: "#7C3AED",
  },
  userProfile: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "var(--color-accent)",
    color: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "600",
    fontSize: "14px",
    marginBottom: "2px",
    border: "none",
  },
  userInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  userName: {
    fontSize: "10px",
    fontWeight: "600",
    color: "var(--color-text-primary)",
    lineHeight: "1.1",
  },
  userEmail: {
    fontSize: "9px",
    color: "var(--color-text-secondary)",
    lineHeight: "1.1",
  },

  // Body beneath navbar: sidebar + content side by side
  body: {
    display: "flex",
    flex: 1,
    minHeight: 0,
  },

  // Sidebar
  sidebar: {
    width: `${SIDEBAR_WIDTH}px`,
    minWidth: `${SIDEBAR_WIDTH}px`,
    maxWidth: `${SIDEBAR_WIDTH}px`,
    position: "sticky",
    top: "68px",           // below navbar
    height: "calc(100vh - 68px)",
    overflowY: "auto",
    overflowX: "hidden",
    background: "var(--color-surface)",
    backdropFilter: "var(--glass-blur)",
    WebkitBackdropFilter: "var(--glass-blur)",
    borderRight: "1px solid var(--color-glass-border)",
    display: "flex",
    flexDirection: "column",
    padding: "1.5rem 0 2rem",
    gap: 0,
    flexShrink: 0,
  },

  sidebarSection: {
    padding: "0 1rem",
  },

  meetingTitleBlock: {
    padding: "0 1.5rem 1rem",
    borderBottom: "1px solid var(--color-border)",
    marginBottom: "0.25rem",
  },
  meetingTitleLabel: {
    fontSize: "12px",
    fontWeight: "600",
    letterSpacing: "0.6px",
    color: "var(--color-text-secondary)",
    textTransform: "uppercase",
    marginBottom: "0.5rem",
  },
  meetingTitle: {
    fontSize: "28px",
    fontWeight: "700",
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-display)",
    letterSpacing: "-0.5px",
    lineHeight: "1.3",
    wordBreak: "break-word",
  },

  navGroupLabel: {
    fontSize: "12px",
    fontWeight: "600",
    letterSpacing: "0.6px",
    color: "var(--color-text-secondary)",
    textTransform: "uppercase",
    padding: "1.25rem 1.5rem 0.5rem",
  },

  navLink: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    padding: "11px 28px",
    borderRadius: "var(--radius-pill)",
    margin: "0 0.5rem 0.15rem",
    fontSize: "14px",
    fontWeight: "500",
    color: "var(--color-text-secondary)",
    textDecoration: "none",
    transition: "var(--transition)",
    border: "1px solid transparent",
    background: "transparent",
    cursor: "pointer",
    width: "calc(100% - 1rem)",
    textAlign: "left",
  },
  navLinkActive: {
    background: "linear-gradient(135deg, rgba(155,111,212,0.25), rgba(155,111,212,0.15))",
    borderColor: "var(--color-glass-border-hover)",
    color: "var(--color-text-primary)",
    fontWeight: "600",
  },

  // Right content area
  content: {
    flex: 1,
    minWidth: 0,
    overflowY: "auto",
  },
};

// ── Nav icons ───────────────────────────────────────────────────────────────

const DetailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0, opacity: 0.8 }}>
    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
  </svg>
);

const NotesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0, opacity: 0.8 }}>
    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
  </svg>
);

// ── Component ────────────────────────────────────────────────────────────────

const MeetingLayout = ({ meetingId, meetingTitle, activePage, children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode } = useTheme();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isDetail = activePage === "detail";
  const isNotes  = activePage === "notes";

  return (
    <div style={styles.root}>
      {/* ── Top Navbar ── */}
      <header style={styles.navbar}>
        <Link to="/" style={styles.navBrand}>Vortiq</Link>
        <div style={styles.navActions}>
          <Link to="/" style={styles.navLinkBtn}>Dashboard</Link>
          
          {/* Navigation Tabs for Meeting Detail/Notes */}
          <div style={styles.navTabs}>
            <Link
              to={`/meetings/${meetingId}`}
              style={{
                ...styles.navTab,
                ...(isDarkMode ? {} : styles.navTabLight),
                ...(location.pathname === `/meetings/${meetingId}` && (isDarkMode ? styles.navTabActive : styles.navTabActiveLightMode)),
              }}
            >
              Meeting Detail
            </Link>
            <Link
              to={`/meetings/${meetingId}/notes`}
              style={{
                ...styles.navTab,
                ...(isDarkMode ? {} : styles.navTabLight),
                ...(location.pathname === `/meetings/${meetingId}/notes` && (isDarkMode ? styles.navTabActive : styles.navTabActiveLightMode)),
              }}
            >
              Meeting Notes
            </Link>
          </div>
          
          <div style={styles.userProfile}>
            <div style={styles.userAvatar}>
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
            </div>
            <div style={styles.userInfo}>
              <span style={styles.userName}>{user?.full_name || "User"}</span>
              <span style={styles.userEmail}>{user?.email}</span>
            </div>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>Log Out</button>
        </div>
      </header>

      {/* ── Body: sidebar + content ── */}
      <div style={styles.body}>

        {/* ── Sidebar ── */}
        <aside style={styles.sidebar}>

          {/* Meeting title block */}
          <div style={styles.meetingTitleBlock}>
            <div style={styles.meetingTitleLabel}>Current Meeting</div>
            <div style={styles.meetingTitle}>
              {meetingTitle || "Untitled Meeting"}
            </div>
          </div>


        </aside>

        {/* ── Main content ── */}
        <main style={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default MeetingLayout;

/**
 * MeetingLayout — shared sidebar + content layout for Meeting Detail and Meeting Notes.
 *
 * Props:
 *   meetingId    (string)  – UUID of the meeting, used to build sidebar links.
 *   meetingTitle (string)  – Display title shown in the sidebar header.
 *   activePage   (string)  – Either "detail" or "notes" to highlight the active nav link.
 *   children     (node)    – The right-side page content to render.
 */

import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const SIDEBAR_WIDTH = 252;

// ── inline style objects ────────────────────────────────────────────────────

const styles = {
  root: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    background: "#0a0a0f",
    color: "#e4e4e7",
    fontFamily: "'Inter', 'Outfit', sans-serif",
  },

  // Top navbar
  navbar: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 2rem",
    height: "60px",
    background: "rgba(10, 10, 15, 0.85)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  navBrand: {
    fontSize: "1.3rem",
    fontWeight: "800",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    textDecoration: "none",
  },
  navActions: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  navLinkBtn: {
    padding: "0.4rem 0.9rem",
    borderRadius: "8px",
    color: "#a1a1aa",
    fontSize: "0.875rem",
    fontWeight: "500",
    textDecoration: "none",
    transition: "color 0.15s, background 0.15s",
    background: "transparent",
  },
  logoutBtn: {
    padding: "0.4rem 0.9rem",
    borderRadius: "8px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#a1a1aa",
    fontSize: "0.875rem",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.15s",
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
    top: "60px",           // below navbar
    height: "calc(100vh - 60px)",
    overflowY: "auto",
    overflowX: "hidden",
    background: "rgba(15,15,22,0.95)",
    borderRight: "1px solid rgba(255,255,255,0.06)",
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
    padding: "0 1rem 1rem",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    marginBottom: "0.25rem",
  },
  meetingTitleLabel: {
    fontSize: "0.65rem",
    fontWeight: "700",
    letterSpacing: "0.1em",
    color: "#52525b",
    textTransform: "uppercase",
    marginBottom: "0.5rem",
  },
  meetingTitle: {
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "#d4d4d8",
    lineHeight: "1.4",
    wordBreak: "break-word",
  },

  navGroupLabel: {
    fontSize: "0.65rem",
    fontWeight: "700",
    letterSpacing: "0.1em",
    color: "#52525b",
    textTransform: "uppercase",
    padding: "1.25rem 1rem 0.5rem",
  },

  navLink: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    padding: "0.5rem 1rem",
    borderRadius: "8px",
    margin: "0 0.5rem 0.15rem",
    fontSize: "0.875rem",
    fontWeight: "500",
    color: "#a1a1aa",
    textDecoration: "none",
    transition: "all 0.15s",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    width: "calc(100% - 1rem)",
    textAlign: "left",
  },
  navLinkActive: {
    background: "rgba(99,102,241,0.15)",
    color: "#818cf8",
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
  const { logout } = useAuth();
  const navigate = useNavigate();

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

          {/* Navigation links */}
          <div style={styles.navGroupLabel}>Navigate</div>

          <Link
            to={`/meetings/${meetingId}`}
            style={{ ...styles.navLink, ...(isDetail ? styles.navLinkActive : {}) }}
          >
            <DetailIcon />
            Meeting Detail
          </Link>

          <Link
            to={`/meetings/${meetingId}/notes`}
            style={{ ...styles.navLink, ...(isNotes ? styles.navLinkActive : {}) }}
          >
            <NotesIcon />
            Meeting Notes
          </Link>
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

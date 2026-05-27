import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getMeetings, deleteMeeting } from "../api/meetings";
import "./Dashboard.css";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pollIntervalRef = useRef(null);

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

  // Initial fetch
  useEffect(() => {
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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const STATUS_LABEL = {
    pending: "Uploading",
    processing: "Transcribing",
    reviewing: "Reviewing",
    completed: "Completed",
    failed: "Failed",
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "completed":
        return "status-completed";
      case "processing":
      case "reviewing":
        return "status-processing";
      case "failed":
        return "status-failed";
      default:
        return "status-pending";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return (
          <svg className="status-svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case "failed":
        return (
          <svg className="status-svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case "processing":
      case "reviewing":
      case "pending":
      default:
        return <div className="status-spinner" />;
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Navbar */}
      <header className="navbar">
        <div className="navbar-brand">
          <Link to="/" className="navbar-logo">Vortiq</Link>
        </div>
        <div className="navbar-actions">
          <Link to="/" className="nav-link-btn">Dashboard</Link>
          <div className="user-profile">
            <div className="user-avatar">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.full_name || "User"}</span>
              <span className="user-email">{user?.email}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Log Out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="dashboard-content">
        <div className="content-header">
          <div>
            <h1 className="page-title">My Meetings</h1>
            <p className="page-subtitle">Upload audio recordings and view AI-generated transcriptions</p>
          </div>
          <Link to="/upload" className="new-meeting-btn">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            New Meeting
          </Link>
        </div>

        {error && <div className="error-alert">{error}</div>}

        {loading ? (
          <div className="loading-container">
            <div className="main-spinner" />
            <p>Loading your meetings...</p>
          </div>
        ) : meetings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
              </svg>
            </div>
            <h3>No meetings yet</h3>
            <p>Upload your first meeting recording to get started with transcription.</p>
            <Link to="/upload" className="new-meeting-btn" style={{ marginTop: "1.5rem" }}>
              Upload Audio File
            </Link>
          </div>
        ) : (
          <div className="meetings-grid">
            {meetings.map((meeting) => (
              <div
                key={meeting.id}
                className="meeting-card"
                onClick={() => navigate(`/meetings/${meeting.id}`)}
                style={{ position: "relative" }}
              >
                {/* Delete button — top-right corner */}
                <button
                  id={`delete-meeting-${meeting.id}`}
                  onClick={(e) => handleDelete(e, meeting.id)}
                  title="Delete meeting"
                  style={{
                    position: "absolute",
                    top: "0.75rem",
                    right: "0.75rem",
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: "7px",
                    padding: "0.35rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#f87171",
                    transition: "background 0.15s ease, border-color 0.15s ease",
                    zIndex: 2,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(239, 68, 68, 0.22)";
                    e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.45)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                    e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.2)";
                  }}
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    style={{ width: "0.95rem", height: "0.95rem" }}
                  >
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <div className="meeting-card-header">
                  <h3 className="meeting-title">{meeting.title || "Untitled Meeting"}</h3>
                  <span className={`status-badge ${getStatusClass(meeting.status)}`}>
                    {getStatusIcon(meeting.status)}
                    {STATUS_LABEL[meeting.status] || meeting.status}
                  </span>
                </div>
                <div className="meeting-card-footer">
                  <span className="meeting-date">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    {formatDate(meeting.created_at)}
                  </span>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    {meeting.status === "completed" && (
                      <span
                        onClick={(e) => { e.stopPropagation(); navigate(`/meetings/${meeting.id}/notes`); }}
                        className="view-details-link"
                        style={{ color: "#c4b5fd", fontSize: "0.78rem" }}
                      >
                        Notes
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                    <span className="view-details-link">
                      View
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </div>
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

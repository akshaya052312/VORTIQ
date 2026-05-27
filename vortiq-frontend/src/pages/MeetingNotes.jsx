import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getMeetingDetail } from "../api/meetings";
import MeetingLayout from "../components/MeetingLayout";
import "./MeetingNotes.css";

const TABS = [
  {
    id: "summary",
    label: "Summary",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    id: "action_items",
    label: "Action Items",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    id: "speaker_segments",
    label: "Speaker Breakdown",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: "decisions",
    label: "Decisions",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: "open_questions",
    label: "Open Questions",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
];

const VortiqLoadingScreen = ({ message }) => (
  <div className="mn-loading-screen">
    <div className="mn-loading-brand">
      <div className="mn-brand-orb-wrap">
        <div className="mn-brand-orb-glow" />
        <div className="mn-brand-orb" />
      </div>
      <span className="mn-brand-name">Vortiq</span>
    </div>
    <p className="mn-loading-message">{message}</p>
    <div className="mn-loading-dots">
      <span />
      <span />
      <span />
    </div>
  </div>
);

const MeetingNotes = () => {
  const { meetingId } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("summary");
  const pollIntervalRef = useRef(null);

  const fetchMeetingDetail = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await getMeetingDetail(meetingId);
      setMeeting(data);
      setError("");
    } catch (err) {
      console.error("Error fetching meeting detail:", err);
      if (err.response?.status === 404) {
        setError("Meeting not found or you do not have permission to view it.");
      } else {
        setError("Failed to load meeting details. Please try again.");
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetingDetail(true);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [meetingId]);

  // Poll if status is pending or processing
  useEffect(() => {
    if (!meeting) return;

    const needsPolling =
      meeting.status === "pending" ||
      meeting.status === "processing";

    if (needsPolling) {
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(() => {
          fetchMeetingDetail(false);
        }, 3000);
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
  }, [meeting]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderTabContent = (notes) => {
    switch (activeTab) {
      case "summary":
        return (
          <div className="mn-tab-content-inner">
            <div className="mn-content-header">
              <h2 className="mn-content-title">Summary</h2>
              <p className="mn-content-subtitle">AI-generated overview of the meeting</p>
            </div>
            <div className="mn-summary-card">
              <p className="mn-summary-text">
                {notes.summary || "No summary available."}
              </p>
            </div>
          </div>
        );

      case "action_items":
        return (
          <div className="mn-tab-content-inner">
            <div className="mn-content-header">
              <h2 className="mn-content-title">Action Items</h2>
              <p className="mn-content-subtitle">
                {notes.action_items?.length || 0} task{notes.action_items?.length !== 1 ? "s" : ""} identified
              </p>
            </div>
            {notes.action_items && notes.action_items.length > 0 ? (
              <div className="mn-table-wrap">
                <table className="mn-action-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Assignee</th>
                      <th>Task</th>
                      <th>Deadline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notes.action_items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="mn-row-num">{idx + 1}</td>
                        <td>
                          <div className="mn-assignee-chip">
                            <span className="mn-assignee-avatar">
                              {item.assignee?.charAt(0)?.toUpperCase() || "?"}
                            </span>
                            <strong>{item.assignee}</strong>
                          </div>
                        </td>
                        <td className="mn-task-cell">{item.task}</td>
                        <td>
                          {item.deadline ? (
                            <span className="mn-deadline-chip">{item.deadline}</span>
                          ) : (
                            <span className="mn-no-deadline">No deadline</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mn-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="9 11 12 14 22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                <p>No action items detected in this meeting.</p>
              </div>
            )}
          </div>
        );

      case "speaker_segments":
        return (
          <div className="mn-tab-content-inner">
            <div className="mn-content-header">
              <h2 className="mn-content-title">Speaker Breakdown</h2>
              <p className="mn-content-subtitle">
                {notes.speaker_segments?.length || 0} segment{notes.speaker_segments?.length !== 1 ? "s" : ""} identified
              </p>
            </div>
            {notes.speaker_segments && notes.speaker_segments.length > 0 ? (
              <div className="mn-speaker-list">
                {notes.speaker_segments.map((seg, idx) => (
                  <div key={idx} className="mn-speaker-turn">
                    <div className="mn-speaker-avatar">
                      {seg.speaker?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="mn-speaker-bubble">
                      <span className="mn-speaker-name">{seg.speaker}</span>
                      <p className="mn-speaker-text">{seg.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mn-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                <p>No speaker breakdown available.</p>
              </div>
            )}
          </div>
        );

      case "decisions":
        return (
          <div className="mn-tab-content-inner">
            <div className="mn-content-header">
              <h2 className="mn-content-title">Decisions Made</h2>
              <p className="mn-content-subtitle">
                {notes.decisions?.length || 0} decision{notes.decisions?.length !== 1 ? "s" : ""} recorded
              </p>
            </div>
            {notes.decisions && notes.decisions.length > 0 ? (
              <ol className="mn-decisions-list">
                {notes.decisions.map((decision, idx) => (
                  <li key={idx} className="mn-decision-item">
                    <span className="mn-decision-num">{idx + 1}</span>
                    <p>{decision}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mn-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <p>No decisions recorded for this meeting.</p>
              </div>
            )}
          </div>
        );

      case "open_questions":
        return (
          <div className="mn-tab-content-inner">
            <div className="mn-content-header">
              <h2 className="mn-content-title">Open Questions</h2>
              <p className="mn-content-subtitle">
                {notes.open_questions?.length || 0} question{notes.open_questions?.length !== 1 ? "s" : ""} remaining
              </p>
            </div>
            {notes.open_questions && notes.open_questions.length > 0 ? (
              <ol className="mn-questions-list">
                {notes.open_questions.map((question, idx) => (
                  <li key={idx} className="mn-question-item">
                    <span className="mn-question-num">{idx + 1}</span>
                    <p>{question}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mn-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <p>No open questions detected.</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // ── Loading State ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <MeetingLayout meetingId={meetingId} meetingTitle="Loading..." activePage="notes">
        <VortiqLoadingScreen message="Loading meeting notes..." />
      </MeetingLayout>
    );
  }

  // ── Error State ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <MeetingLayout meetingId={meetingId} meetingTitle="Error" activePage="notes">
        <div className="dashboard-content" style={{ maxWidth: "600px", padding: "4rem 2rem" }}>
          <div className="error-alert" style={{ marginBottom: "2rem" }}>{error}</div>
          <Link to="/" className="cancel-btn" style={{ display: "inline-block", width: "100%" }}>
            Return to Dashboard
          </Link>
        </div>
      </MeetingLayout>
    );
  }

  // ── Main Render ────────────────────────────────────────────────────────────
  const notes = meeting?.structured_notes;
  const isPendingOrProcessing =
    meeting?.status === "pending" || meeting?.status === "processing";
  const isCompleted = meeting?.status === "completed";

  return (
    <MeetingLayout
      meetingId={meetingId}
      meetingTitle={meeting?.title}
      activePage="notes"
    >
      {/* Meeting Title Bar */}
      <div className="mn-meeting-header">
        <div className="mn-meeting-title-row">
          <h1 className="mn-meeting-title">
            {meeting?.title || "Untitled Meeting"}
          </h1>
          <span className={`mn-status-badge mn-status-${meeting?.status}`}>
            {meeting?.status === "completed" ? "✓ Completed" :
              meeting?.status === "processing" ? "⏳ Processing" :
              meeting?.status === "pending" ? "⏳ Pending" :
              meeting?.status === "failed" ? "✕ Failed" : meeting?.status}
          </span>
        </div>
        {meeting?.created_at && (
          <p className="mn-meeting-date">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            Uploaded on {formatDate(meeting.created_at)}
          </p>
        )}
      </div>

      {/* Notes sections tab nav (horizontal, inside content area) */}
      {notes && (
        <nav className="mn-tabs-nav mn-tabs-horizontal" aria-label="Notes sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`mn-tab-btn ${activeTab === tab.id ? "mn-tab-btn-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="mn-tab-icon">{tab.icon}</span>
              <span className="mn-tab-label">{tab.label}</span>
              {activeTab === tab.id && <span className="mn-tab-indicator" />}
            </button>
          ))}
        </nav>
      )}

      {/* Content Area */}
      <div className="mn-content-area">
        {isPendingOrProcessing ? (
          <VortiqLoadingScreen message="Your meeting is being transcribed and analyzed. This may take a few minutes…" />
        ) : isCompleted && !notes ? (
          <VortiqLoadingScreen message="Notes are being generated by our AI. This page will update automatically." />
        ) : notes ? (
          <div className="mn-tab-content">
            {renderTabContent(notes)}
          </div>
        ) : (
          <div className="mn-empty-state" style={{ marginTop: "4rem" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p>No notes available for this meeting.</p>
          </div>
        )}
      </div>
    </MeetingLayout>
  );
};

export default MeetingNotes;

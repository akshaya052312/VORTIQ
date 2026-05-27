import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getMeetingDetail } from "../api/meetings";
import { useCollaborativeNotes } from "../hooks/useCollaborativeNotes";
import MeetingLayout from "../components/MeetingLayout";
import "./MeetingDetail.css";

const MeetingDetail = () => {
  const { meetingId } = useParams();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const pollIntervalRef = useRef(null);

  // States for local editing inputs to prevent cursor jump / input stutter
  const [summaryVal, setSummaryVal] = useState("");

  // Fetch meeting detail helper
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

  // Initial fetch
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

  // Instantiate collaborative notes hook
  const { notes, updateField, isConnected, activeUsers, toast } = useCollaborativeNotes(
    meetingId,
    meeting?.structured_notes
  );

  // Synchronize local states when notes change from WebSocket or API
  useEffect(() => {
    if (notes) {
      setSummaryVal(notes.summary || "");
    }
  }, [notes]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleCopy = async () => {
    if (!meeting?.transcription?.raw_text) return;
    try {
      await navigator.clipboard.writeText(meeting.transcription.raw_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy transcript:", err);
    }
  };

  const handleDownload = () => {
    if (!meeting?.transcription?.raw_text) return;
    const element = document.createElement("a");
    const file = new Blob([meeting.transcription.raw_text], {
      type: "text/plain;charset=utf-8",
    });
    element.href = URL.createObjectURL(file);
    element.download = `${meeting.title || "meeting-transcript"}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Blur saves handlers
  const handleSummaryBlur = () => {
    if (summaryVal !== notes?.summary) {
      updateField("summary", summaryVal);
    }
  };



  // Dynamically map name strings to consistent presence avatar colors matching mod 8 palette
  const getAvatarColor = (name) => {
    const colors = [
      "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
      "#8B5CF6", "#EC4899", "#06B6D4", "#14B8A6"
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % colors.length;
    return colors[idx];
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

  if (loading) {
    return (
      <MeetingLayout meetingId={meetingId} meetingTitle="Loading..." activePage="detail">
        <div className="loading-container" style={{ minHeight: "70vh" }}>
          <div className="main-spinner" />
          <p>Loading meeting details...</p>
        </div>
      </MeetingLayout>
    );
  }

  if (error) {
    return (
      <MeetingLayout meetingId={meetingId} meetingTitle="Error" activePage="detail">
        <div className="dashboard-content" style={{ maxWidth: "600px", padding: "4rem 2rem" }}>
          <div className="error-alert" style={{ marginBottom: "2rem" }}>
            {error}
          </div>
          <Link to="/" className="cancel-btn" style={{ display: "inline-block", width: "100%" }}>
            Return to Dashboard
          </Link>
        </div>
      </MeetingLayout>
    );
  }

  return (
    <MeetingLayout
      meetingId={meetingId}
      meetingTitle={meeting?.title}
      activePage="detail"
    >
      {/* Toast Notification */}
      {toast && (
        <div className="toast-notification" key={toast.key}>
          <svg className="toast-icon" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="dashboard-content detail-content-layout">
        {meeting && (
          <div className="meeting-detail-container">
            <div className="meeting-detail-navigation">
              <Link to="/" className="back-breadcrumb-link">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Back to Dashboard
              </Link>

              {/* Google Docs style active presence avatars */}
              {activeUsers && activeUsers.length > 0 && (
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "#71717a", marginRight: "4px", fontWeight: "700", letterSpacing: "0.05em" }}>
                    ACTIVE:
                  </span>
                  {activeUsers.map((name) => {
                    const initials = name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);
                    const color = getAvatarColor(name);
                    return (
                      <div
                        key={name}
                        title={name}
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          backgroundColor: color,
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                          border: "2px solid #0a0a0f",
                          boxShadow: "0 0 4px rgba(0,0,0,0.5)",
                          cursor: "default",
                          userSelect: "none"
                        }}
                      >
                        {initials}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>

            {/* Detail Header */}
            <div className="detail-header-card">
              <div className="detail-meta-row">
                <span className="detail-date">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Uploaded on {formatDate(meeting.created_at)}
                </span>
                <span className={`status-badge ${getStatusClass(meeting.status)}`}>
                  {STATUS_LABEL[meeting.status] || meeting.status}
                </span>

              </div>
              <h1 className="detail-title">{meeting.title || "Untitled Meeting"}</h1>
            </div>

            {/* Transcription State Router */}
            {meeting.status === "completed" ? (
              <div className="completed-meeting-layout">
                {notes ? (
                  <div className="structured-notes-container">
                    {/* 1) Summary Section */}
                    <section id="summary" className="detail-section summary-section">
                      <h2 className="section-title">Summary</h2>
                      <textarea
                        className="editable-summary-textarea"
                        value={summaryVal}
                        onChange={(e) => setSummaryVal(e.target.value)}
                        onBlur={handleSummaryBlur}
                        placeholder="Edit summary..."
                      />
                      {notes.last_edited_by_name && (
                        <div className="last-edited-attribution">
                          Last edited by {notes.last_edited_by_name}{" "}
                          {notes.last_edited_at && `at ${formatDate(notes.last_edited_at)}`}
                        </div>
                      )}
                    </section>

                    {/* Integrations Section */}
                    {meeting.integration_logs && meeting.integration_logs.length > 0 && (
                      <section style={{
                        marginTop: "2rem",
                        padding: "1.5rem",
                        backgroundColor: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        borderRadius: "12px",
                      }}>
                        <h2 style={{
                          fontSize: "1.2rem",
                          fontWeight: "600",
                          color: "#f4f4f5",
                          marginBottom: "1rem",
                          letterSpacing: "-0.01em",
                        }}>
                          Integrations
                        </h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                          {meeting.integration_logs.map((log, idx) => {
                            const isSuccess = log.status === "success";
                            const nameMap = {
                              slack: "Slack",
                              notion: "Notion",
                              google_calendar: "Google Calendar"
                            };
                            const displayName = nameMap[log.integration_type] || log.integration_type;
                            
                            return (
                              <div key={idx} style={{
                                display: "flex",
                                alignItems: "center",
                                justifyItem: "center",
                                justifyContent: "space-between",
                                padding: "0.75rem 1rem",
                                backgroundColor: "rgba(255, 255, 255, 0.01)",
                                border: "1px solid rgba(255, 255, 255, 0.03)",
                                borderRadius: "8px",
                              }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                  <span style={{
                                    color: isSuccess ? "#10b981" : "#ef4444",
                                    fontWeight: "bold",
                                    fontSize: "1.1rem",
                                    display: "flex",
                                    alignItems: "center"
                                  }}>
                                    {isSuccess ? "✓" : "X"}
                                  </span>
                                  <span style={{
                                    color: "#e4e4e7",
                                    fontWeight: "500",
                                    fontSize: "0.95rem",
                                  }}>
                                    {displayName}
                                  </span>
                                </div>
                                <span style={{
                                  color: "#a1a1aa",
                                  fontSize: "0.85rem",
                                }}>
                                  {formatDate(log.ran_at)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    )}

                  </div>
                ) : (
                  <div
                    className="status-message-box box-processing"
                    style={{
                      padding: "4rem 2rem",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                      marginBottom: "2rem",
                    }}
                  >
                    <div className="status-spinner" />
                    <h3>Notes are being generated</h3>
                    <p>Our AI is compiling the meeting insights. This page will automatically update once they are ready.</p>
                  </div>
                )}

                {/* Collapsible Full Transcript Section */}
                <div className="collapsible-section transcript-collapsible">
                  <button
                    className="collapsible-header"
                    onClick={() => setTranscriptOpen(!transcriptOpen)}
                    aria-expanded={transcriptOpen}
                  >
                    <div className="collapsible-title-row">
                      <svg
                        className={`chevron-icon ${transcriptOpen ? "open" : ""}`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        style={{
                          width: "1.25rem",
                          height: "1.25rem",
                          transition: "transform 0.2s ease",
                          transform: transcriptOpen ? "rotate(180deg)" : "rotate(0deg)",
                        }}
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>Full Transcript</span>
                      {meeting.transcription?.language && (
                        <span className="language-badge" style={{ marginLeft: "0.75rem" }}>
                          {meeting.transcription.language.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </button>

                  {transcriptOpen && (
                    <div className="collapsible-content">
                      <div className="transcript-actions-bar">
                        <button
                          onClick={handleCopy}
                          className={`action-btn ${copied ? "copied" : ""}`}
                          title="Copy to clipboard"
                        >
                          {copied ? (
                            <>
                              <svg viewBox="0 0 20 20" fill="currentColor">
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Copied!
                            </>
                          ) : (
                            <>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                              Copy
                            </>
                          )}
                        </button>
                        <button onClick={handleDownload} className="action-btn" title="Download transcript as TXT">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                          </svg>
                          Download
                        </button>
                      </div>

                      <div
                        className="transcript-text-container"
                        style={{
                          maxHeight: "none",
                          overflow: "visible",
                          padding: "1.5rem 0 0 0",
                          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        {meeting.transcription?.raw_text ? (
                          <p className="transcript-text">{meeting.transcription.raw_text}</p>
                        ) : (
                          <p className="transcript-empty-text">No transcription text returned.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : meeting.status === "failed" ? (
              <div className="status-message-box box-failed">
                <div className="status-message-icon icon-failed">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
                <span className={`status-badge ${getStatusClass("failed")}`}>Failed</span>
                <Link to="/upload" className="new-meeting-btn" style={{ marginTop: "1.5rem" }}>
                  Retry Upload
                </Link>
              </div>
            ) : (
              // Pending / Processing state
              <div className="status-message-box box-processing">
                <div className="processing-orb-container">
                  <div className="processing-orb-glow" />
                  <div className="processing-orb" />
                </div>
                <span className={`status-badge large-badge ${getStatusClass(meeting.status)}`}>
                  <div className="status-spinner" />
                  {STATUS_LABEL[meeting.status] || meeting.status}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </MeetingLayout>
  );
};

export default MeetingDetail;

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import axiosInstance from "../api/axiosInstance";
import "./Dashboard.css";

const INTEGRATIONS_CONFIG = [
  {
    type: "slack",
    name: "Slack",
    description: "Send meeting summaries, action items, and alerts directly to your Slack channels.",
    color: "#4a154b",
    letter: "S",
    redirectPath: "slack/connect",
  },
  {
    type: "notion",
    name: "Notion",
    description: "Sync meeting notes, transcripts, and action items to your Notion database.",
    color: "#000000",
    letter: "N",
    redirectPath: "notion/connect",
  },
  {
    type: "google_calendar",
    name: "Google Calendar",
    description: "Automatically link transcriptions and notes to your Google Calendar events.",
    color: "#1a73e8",
    letter: "G",
    redirectPath: "google/connect",
  },
];

const Integrations = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [connectedList, setConnectedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchIntegrations = async () => {
    try {
      const response = await axiosInstance.get("/api/integrations/");
      setConnectedList(response.data);
      setError("");
    } catch (err) {
      console.error("Error fetching integrations:", err);
      setError("Failed to load integrations. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleConnect = (redirectPath) => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || "";
    // Remove duplicate trailing/leading slashes if any
    const cleanBaseURL = baseURL.endsWith("/") ? baseURL.slice(0, -1) : baseURL;
    window.location.href = `${cleanBaseURL}/api/integrations/${redirectPath}/`;
  };

  const handleDisconnect = async (integrationType) => {
    const displayName = integrationType === "google_calendar" ? "Google Calendar" : integrationType.charAt(0).toUpperCase() + integrationType.slice(1);
    const confirmed = window.confirm(`Are you sure you want to disconnect ${displayName}?`);
    if (!confirmed) return;

    try {
      await axiosInstance.delete(`/api/integrations/${integrationType}/disconnect/`);
      await fetchIntegrations();
    } catch (err) {
      console.error("Error disconnecting integration:", err);
      alert("Failed to disconnect integration. Please try again.");
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
          <Link to="/integrations" className="nav-link-btn" style={{ background: "rgba(255, 255, 255, 0.08)", color: "#ffffff" }}>Integrations</Link>
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

      {/* Main Content */}
      <main className="dashboard-content" style={{ padding: "2.5rem 2rem", maxWidth: "1200px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <div className="content-header" style={{ marginBottom: "2.5rem" }}>
          <div>
            <h1 className="page-title" style={{ fontSize: "2rem", fontWeight: "700", color: "#ffffff", margin: "0 0 0.5rem 0" }}>Integrations</h1>
            <p className="page-subtitle" style={{ fontSize: "0.95rem", color: "#a1a1aa", margin: 0 }}>Connect Vortiq with third-party tools to automate your workflows.</p>
          </div>
        </div>

        {error && (
          <div className="error-alert" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "200px" }}>
            <div className="main-spinner" style={{ width: "40px", height: "40px", borderRadius: "50%", border: "3px solid rgba(139, 92, 246, 0.1)", borderTopColor: "#8b5cf6", animation: "spin 1s linear infinite" }} />
            <p style={{ marginTop: "1rem", color: "#a1a1aa" }}>Loading integrations...</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
            {INTEGRATIONS_CONFIG.map((integration) => {
              const connectedItem = connectedList.find(
                (item) => item.integration_type === integration.type
              );
              const isConnected = !!connectedItem && connectedItem.is_active;

              return (
                <div
                  key={integration.type}
                  style={{
                    background: "rgba(15, 15, 22, 0.8)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: "16px",
                    padding: "2rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: "280px",
                    boxSizing: "border-box",
                  }}
                >
                  <div>
                    {/* Header: logo circle + status badge */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "50%",
                          backgroundColor: integration.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.4rem",
                          fontWeight: "700",
                          color: "#ffffff",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                        }}
                      >
                        {integration.letter}
                      </div>

                      {isConnected ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "0.25rem 0.75rem",
                            borderRadius: "20px",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            backgroundColor: "rgba(16, 185, 129, 0.12)",
                            color: "#10b981",
                            border: "1px solid rgba(16, 185, 129, 0.2)",
                          }}
                        >
                          Connected
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "0.25rem 0.75rem",
                            borderRadius: "20px",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            backgroundColor: "rgba(113, 113, 122, 0.12)",
                            color: "#a1a1aa",
                            border: "1px solid rgba(113, 113, 122, 0.2)",
                          }}
                        >
                          Not Connected
                        </span>
                      )}
                    </div>

                    {/* Title & Description */}
                    <h3 style={{ fontSize: "1.2rem", fontWeight: "600", color: "#ffffff", margin: "0 0 0.5rem 0" }}>
                      {integration.name}
                    </h3>
                    <p style={{ fontSize: "0.875rem", color: "#a1a1aa", margin: 0, lineHeight: "1.5" }}>
                      {integration.description}
                    </p>
                  </div>

                  {/* Actions */}
                  <div style={{ marginTop: "2rem" }}>
                    {isConnected ? (
                      <button
                        onClick={() => handleDisconnect(integration.type)}
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          borderRadius: "10px",
                          border: "1px solid rgba(239, 68, 68, 0.25)",
                          backgroundColor: "rgba(239, 68, 68, 0.06)",
                          color: "#ef4444",
                          fontWeight: "600",
                          fontSize: "0.9rem",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.12)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.06)";
                        }}
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(integration.redirectPath)}
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          borderRadius: "10px",
                          border: "none",
                          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                          color: "#ffffff",
                          fontWeight: "600",
                          fontSize: "0.9rem",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = "0.9";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Integrations;

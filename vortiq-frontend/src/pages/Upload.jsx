import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { uploadMeeting, getMeetingDetail } from "../api/meetings";
import "./Upload.css";

const ALLOWED_EXTENSIONS = [".mp3", ".wav", ".m4a"];
const MAX_FILE_SIZE_MB = 50;

const Upload = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Tabs: "file" or "record"
  const [activeTab, setActiveTab] = useState("file");

  // File Upload State
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  // General Status & Error States
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  // Polling State
  const [uploadedMeetingId, setUploadedMeetingId] = useState(null);
  const [pollingStatus, setPollingStatus] = useState(null); // null, 'pending', 'processing', 'completed', 'failed'
  const pollIntervalRef = useRef(null);

  // Cleanup timers & recording resources on unmount
  useEffect(() => {
    return () => {
      stopRecordingTimer();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Polling effect
  useEffect(() => {
    if (!uploadedMeetingId) return;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const detail = await getMeetingDetail(uploadedMeetingId);
        setPollingStatus(detail.status);

        if (detail.status === "completed") {
          clearInterval(pollIntervalRef.current);
          navigate(`/meetings/${uploadedMeetingId}`);
        } else if (detail.status === "failed") {
          clearInterval(pollIntervalRef.current);
        }
      } catch (err) {
        console.error("Polling error:", err);
        // We don't clear the interval immediately on network blips, just let it retry.
      }
    }, 3000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [uploadedMeetingId, navigate]);

  // Recording Timer
  const startRecordingTimer = () => {
    setRecordingSeconds(0);
    timerIntervalRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopRecordingTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Start MediaRecorder
  const startRecording = async () => {
    setError("");
    setRecordedBlob(null);
    setRecordedUrl("");
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Use m4a/webm options where supported, or let browser decide
      let options = {};
      if (MediaRecorder.isTypeSupported("audio/webm")) {
        options = { mimeType: "audio/webm" };
      } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
        options = { mimeType: "audio/ogg" };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || "audio/wav";
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedBlob(audioBlob);
        setRecordedUrl(URL.createObjectURL(audioBlob));

        // Stop all tracks in stream
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250); // Get data slices every 250ms
      setIsRecording(true);
      startRecordingTimer();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Microphone access denied. Please check site permissions.");
    }
  };

  // Stop MediaRecorder
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopRecordingTimer();
    }
  };

  // Client side file checks
  const validateFile = (selectedFile) => {
    if (!selectedFile) return "No file selected.";

    const name = selectedFile.name.toLowerCase();
    const isAllowedExt = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
    if (!isAllowedExt) {
      return `Invalid file format. Allowed formats: ${ALLOWED_EXTENSIONS.join(", ")}`;
    }

    const fileSizeMB = selectedFile.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      return `File size exceeds the limit of ${MAX_FILE_SIZE_MB}MB.`;
    }

    return "";
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileError = validateFile(selectedFile);
      if (fileError) {
        setError(fileError);
        setFile(null);
      } else {
        setFile(selectedFile);
        setError("");
        if (!title) {
          const baseName = selectedFile.name.substring(
            0,
            selectedFile.name.lastIndexOf(".")
          ) || selectedFile.name;
          setTitle(baseName);
        }
      }
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const fileError = validateFile(droppedFile);
      if (fileError) {
        setError(fileError);
        setFile(null);
      } else {
        setFile(droppedFile);
        setError("");
        if (!title) {
          const baseName = droppedFile.name.substring(
            0,
            droppedFile.name.lastIndexOf(".")
          ) || droppedFile.name;
          setTitle(baseName);
        }
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    let fileToUpload = null;
    let finalTitle = title.trim();

    if (activeTab === "file") {
      if (!file) {
        setError("Please select an audio file.");
        return;
      }
      fileToUpload = file;
    } else {
      if (!recordedBlob) {
        setError("Please record some audio first.");
        return;
      }
      // Determine file extension based on recorder mimeType
      const mime = mediaRecorderRef.current?.mimeType || "audio/wav";
      const ext = mime.includes("webm") ? ".wav" : mime.includes("mp4") || mime.includes("m4a") ? ".m4a" : ".wav";
      const filename = `recording_${Date.now()}${ext}`;
      fileToUpload = new File([recordedBlob], filename, { type: mime });
      if (!finalTitle) {
        finalTitle = `Voice Recording - ${new Date().toLocaleDateString()}`;
      }
    }

    setIsUploading(true);

    try {
      const response = await uploadMeeting(fileToUpload, finalTitle);
      const meetingId = response.meeting?.id || response.id;
      setUploadedMeetingId(meetingId);
      setPollingStatus("pending");
    } catch (err) {
      console.error("Upload error:", err);
      const data = err.response?.data;
      if (data) {
        if (typeof data === "object") {
          const errorsObj = {};
          if (data.title) errorsObj.title = Array.isArray(data.title) ? data.title.join(" ") : data.title;
          if (data.audio_file) errorsObj.audio_file = Array.isArray(data.audio_file) ? data.audio_file.join(" ") : data.audio_file;

          if (Object.keys(errorsObj).length > 0) {
            setFieldErrors(errorsObj);
          } else {
            setError(data.message || data.error || "Failed to upload meeting.");
          }
        } else {
          setError(String(data));
        }
      } else {
        setError("Network error. Please check your connection.");
      }
      setIsUploading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "completed":
        return "status-completed";
      case "processing":
        return "status-processing";
      case "failed":
        return "status-failed";
      default:
        return "status-pending";
    }
  };

  // Status label map — single-word user-facing labels
  const STATUS_LABEL = {
    pending: "Uploading",
    processing: "Transcribing",
    completed: "Completed",
    failed: "Failed",
  };

  // RENDER POLLING SCREEN ONCE UPLOADED
  if (uploadedMeetingId && pollingStatus) {
    const isFailed = pollingStatus === "failed";
    const label = STATUS_LABEL[pollingStatus] || pollingStatus;

    return (
      <div className="dashboard-layout">
        <header className="navbar">
          <div className="navbar-brand">
            <Link to="/" className="navbar-logo">Vortiq</Link>
          </div>
        </header>
        <main className="dashboard-content upload-content-layout">
          <div className="upload-card text-center polling-view-card">
            {!isFailed && (
              <div className="processing-orb-container m-auto">
                <div className="processing-orb-glow" />
                <div className="processing-orb" />
              </div>
            )}

            {isFailed && (
              <div className="status-message-icon icon-failed" style={{ margin: "0 auto 1.5rem" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
            )}

            <div className="polling-status-box">
              <span className={`status-badge large-badge ${getStatusClass(pollingStatus)}`}>
                {!isFailed && <div className="status-spinner" />}
                {label}
              </span>
            </div>

            {isFailed ? (
              <div className="polling-failure-area">
                <button
                  onClick={() => {
                    setUploadedMeetingId(null);
                    setPollingStatus(null);
                    setFile(null);
                    setRecordedBlob(null);
                    setRecordedUrl("");
                    setTitle("");
                    setIsUploading(false);
                  }}
                  className="submit-btn mt-3"
                >
                  Retry Upload
                </button>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Navbar */}
      <header className="navbar">
        <div className="navbar-brand">
          <Link to="/" className="navbar-logo">Vortiq</Link>
        </div>
        <div className="navbar-actions">
          <Link to="/" className="nav-link-btn">
            Back to Dashboard
          </Link>
          <button onClick={handleLogout} className="logout-btn">
            Log Out
          </button>
        </div>
      </header>

      {/* Main Upload Card */}
      <main className="dashboard-content upload-content-layout">
        <div className="upload-card">
          <div className="upload-header">
            <h1 className="upload-title">New Meeting</h1>
            <p className="upload-subtitle">
              Choose to upload an existing audio file or record directly in your browser.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="upload-tabs">
            <button
              type="button"
              className={`tab-btn ${activeTab === "file" ? "tab-btn-active" : ""}`}
              onClick={() => {
                setActiveTab("file");
                setError("");
              }}
              disabled={isUploading}
            >
              Upload File
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === "record" ? "tab-btn-active" : ""}`}
              onClick={() => {
                setActiveTab("record");
                setError("");
              }}
              disabled={isUploading}
            >
              Record Audio
            </button>
          </div>

          <form onSubmit={handleSubmit} className="upload-form">
            {error && <div className="error-alert">{error}</div>}

            <div className="form-group">
              <label htmlFor="meeting-title">Meeting Title</label>
              <input
                id="meeting-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  activeTab === "file"
                    ? "e.g. Weekly Review, Project Sync"
                    : "e.g. Browser Voice Memo (default: Auto-generated)"
                }
                className={fieldErrors.title ? "input-error" : ""}
                disabled={isUploading}
              />
              {fieldErrors.title && (
                <span className="field-error">{fieldErrors.title}</span>
              )}
            </div>

            {/* TAB 1: FILE UPLOAD */}
            {activeTab === "file" && (
              <div className="form-group">
                <label>Audio File</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".mp3,.wav,.m4a"
                  className="hidden-file-input"
                  disabled={isUploading}
                />

                <div
                  className={`dropzone ${isDragActive ? "dropzone-active" : ""} ${
                    file ? "dropzone-has-file" : ""
                  } ${fieldErrors.audio_file ? "dropzone-error" : ""}`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={!file ? triggerFileInput : undefined}
                >
                  {!file ? (
                    <div className="dropzone-empty-state">
                      <div className="dropzone-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                        </svg>
                      </div>
                      <p className="dropzone-text">
                        Drag & drop your file, or{" "}
                        <span className="browse-link">browse</span>
                      </p>
                      <p className="dropzone-subtext">
                        MP3, WAV, or M4A only (Max 50MB)
                      </p>
                    </div>
                  ) : (
                    <div className="dropzone-file-state">
                      <div className="file-icon">
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="file-details">
                        <p className="file-name">{file.name}</p>
                        <p className="file-size">{formatBytes(file.size)}</p>
                      </div>
                      <button
                        type="button"
                        className="remove-file-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          setTitle("");
                        }}
                        disabled={isUploading}
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                {fieldErrors.audio_file && (
                  <span className="field-error">{fieldErrors.audio_file}</span>
                )}
              </div>
            )}

            {/* TAB 2: LIVE RECORDER */}
            {activeTab === "record" && (
              <div className="form-group">
                <label>Microphone Recorder</label>
                <div className="recorder-panel">
                  {isRecording ? (
                    <div className="recorder-active-state">
                      <div className="pulse-container">
                        <div className="recording-wave-dot" />
                        <div className="recording-wave-pulse" />
                      </div>
                      <span className="recorder-timer">{formatTime(recordingSeconds)}</span>
                      <p className="recorder-hint">Recording in progress. Speak clearly.</p>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="stop-record-btn"
                      >
                        Stop Recording
                      </button>
                    </div>
                  ) : (
                    <div className="recorder-idle-state">
                      {!recordedUrl ? (
                        <div className="recorder-start-view">
                          <div className="mic-icon-container">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
                            </svg>
                          </div>
                          <button
                            type="button"
                            onClick={startRecording}
                            className="start-record-btn"
                            disabled={isUploading}
                          >
                            Start Recording
                          </button>
                          <p className="mic-helper-text">Requires microphone permissions</p>
                        </div>
                      ) : (
                        <div className="recorder-preview-view">
                          <div className="preview-header">
                            <span className="preview-label">Recording Finished</span>
                            <span className="file-size">{formatBytes(recordedBlob?.size || 0)}</span>
                          </div>
                          <audio src={recordedUrl} controls className="audio-preview-player" />
                          <div className="recorder-actions">
                            <button
                              type="button"
                              onClick={startRecording}
                              className="re-record-btn"
                              disabled={isUploading}
                            >
                              Record Again
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="upload-actions">
              <Link to="/" className="cancel-btn">
                Cancel
              </Link>
              <button
                type="submit"
                className="submit-btn"
                disabled={
                  isUploading ||
                  (activeTab === "file" && !file) ||
                  (activeTab === "record" && !recordedBlob && !isRecording) ||
                  isRecording
                }
              >
                {isUploading ? (
                  <span className="btn-loading">
                    <span className="btn-spinner" />
                    Uploading...
                  </span>
                ) : (
                  "Start Transcription"
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Upload;

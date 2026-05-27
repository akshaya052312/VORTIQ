import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Custom hook for real-time collaborative editing of structured notes.
 *
 * Connects to:
 *   ws://<VITE_WS_BASE_URL>/ws/meetings/<meetingId>/notes/?token=<jwt_token>
 *
 * Exposes:
 *   - notes: reactive local state of all structured notes fields
 *   - updateField(field, value): function to immediately update local state and broadcast change
 *   - isConnected: connection status
 *   - activeUsers: array of string names currently active in the notes session
 *   - toast: active notification state { message: string, key: number }
 */
export const useCollaborativeNotes = (meetingId, initialNotesData) => {
  const [notes, setNotes] = useState(initialNotesData || null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [toast, setToast] = useState(null);
  const wsRef = useRef(null);

  // Synchronize state when initialNotesData loads/updates
  useEffect(() => {
    if (initialNotesData) {
      setNotes(initialNotesData);
    }
  }, [initialNotesData]);

  useEffect(() => {
    if (!meetingId) return;

    const token = localStorage.getItem("access_token");
    if (!token) {
      console.warn("WebSocket skipped: no access_token found in localStorage.");
      return;
    }

    const wsBase = import.meta.env.VITE_WS_BASE_URL || "localhost:8000";
    const wsUrl = `ws://${wsBase}/ws/meetings/${meetingId}/notes/?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Collaborative notes WebSocket connected.");
      setIsConnected(true);
      
      // Request initial list of active users on connection
      ws.send(JSON.stringify({ type: "get_presence" }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // 1. Handle presence messages
        if (data.type === "presence_list") {
          setActiveUsers(data.users || []);
        } else if (data.type === "user_joined") {
          setActiveUsers((prev) => {
            if (prev.includes(data.full_name)) return prev;
            return [...prev, data.full_name];
          });
        } else if (data.type === "user_left") {
          setActiveUsers((prev) => prev.filter((name) => name !== data.full_name));
        }

        // 2. Handle note updates
        else if (data.type === "note_update") {
          const { field, value, edited_by, edited_at } = data;

          setNotes((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              [field]: value,
              last_edited_by_name: edited_by,
              last_edited_at: edited_at,
            };
          });

          // Trigger a self-dismissing toast notification
          const displayField = field
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");

          setToast({
            message: `"${displayField}" edited by ${edited_by}`,
            key: Date.now(),
          });
        } else if (data.type === "error") {
          console.error("WebSocket notes error message:", data.message);
          alert(`Error updating notes: ${data.message}`);
        }
      } catch (err) {
        console.error("Failed to parse notes update event:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("Collaborative notes WebSocket error:", err);
    };

    ws.onclose = (event) => {
      console.log(`Collaborative notes WebSocket closed (code: ${event.code})`);
      setIsConnected(false);
      setActiveUsers([]);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      wsRef.current = null;
      setIsConnected(false);
      setActiveUsers([]);
    };
  }, [meetingId]);

  // Update a field: immediately update local state and stream JSON to backend
  const updateField = useCallback((field, value) => {
    // 1. Update local state immediately
    setNotes((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: value,
      };
    });

    // 2. Stream update over WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          field,
          value,
        })
      );
    } else {
      console.warn("WebSocket is closed. Saved change locally, but did not sync.");
    }
  }, []);

  // Dismiss toast notification after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return {
    notes,
    updateField,
    isConnected,
    activeUsers,
    toast,
  };
};

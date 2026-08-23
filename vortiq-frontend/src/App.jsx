/**
 * App — root component with routing and auth context.
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import MeetingDetail from "./pages/MeetingDetail";
import MeetingNotes from "./pages/MeetingNotes";
import Settings from "./pages/Settings";
import Home from "./pages/Home";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="app-layout-wrapper">
            <div className="bg-orb-1" />
            <div className="bg-orb-2" />
            <div className="app-content-container">
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />

                {/* Protected routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/upload"
                  element={
                    <ProtectedRoute>
                      <Upload />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/meetings/:meetingId"
                  element={
                    <ProtectedRoute>
                      <MeetingDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/meetings/:meetingId/notes"
                  element={
                    <ProtectedRoute>
                      <MeetingNotes />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />

                {/* Default redirect to dashboard */}
                <Route path="/" element={<Home />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

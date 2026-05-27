/**
 * AuthContext — global authentication state.
 *
 * Stores JWT access token in localStorage.
 * Exposes login, register, logout functions that call the backend API.
 * Exposes isAuthenticated boolean.
 */

import { createContext, useState, useEffect } from "react";
import { loginUser, registerUser } from "../api/auth";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const accessToken = localStorage.getItem("access_token");

    if (storedUser && accessToken) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("user");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
      }
    }
    setLoading(false);
  }, []);

  const saveSession = (userData, tokens) => {
    localStorage.setItem("access_token", tokens.access);
    localStorage.setItem("refresh_token", tokens.refresh);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  /**
   * Register a new user.
   * Calls POST /api/auth/register/, stores tokens, sets user.
   * Throws on failure so the caller can display errors.
   */
  const register = async (email, fullName, password) => {
    const data = await registerUser(email, fullName, password);
    saveSession(data.user, data.tokens);
    return data;
  };

  /**
   * Log in an existing user.
   * Calls POST /api/auth/login/, stores tokens, sets user.
   * Throws on failure so the caller can display errors.
   */
  const login = async (email, password) => {
    const data = await loginUser(email, password);
    saveSession(data.user, data.tokens);
    return data;
  };

  /**
   * Log out — clears all stored auth data.
   */
  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{ user, loading, isAuthenticated, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

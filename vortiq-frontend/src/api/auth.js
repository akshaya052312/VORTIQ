/**
 * API functions for authentication — register and login.
 */

import axiosInstance from "./axiosInstance";

export const registerUser = async (email, fullName, password) => {
  const response = await axiosInstance.post("/api/auth/register/", {
    email,
    full_name: fullName,
    password,
  });
  return response.data;
};

export const loginUser = async (email, password) => {
  const response = await axiosInstance.post("/api/auth/login/", {
    email,
    password,
  });
  return response.data;
};

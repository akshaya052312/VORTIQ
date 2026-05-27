/**
 * API functions for meetings — list, detail, upload, and delete.
 */

import axiosInstance from "./axiosInstance";

export const getMeetings = async () => {
  const response = await axiosInstance.get("/api/meetings/");
  return response.data;
};

export const getMeetingDetail = async (meetingId) => {
  const response = await axiosInstance.get(`/api/meetings/${meetingId}/`);
  return response.data;
};

export const uploadMeeting = async (audioFile, title = "") => {
  const formData = new FormData();
  if (audioFile) {
    formData.append("audio_file", audioFile);
  }
  if (title) {
    formData.append("title", title);
  }

  const response = await axiosInstance.post("/api/meetings/upload/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const deleteMeeting = async (meetingId) => {
  await axiosInstance.delete(`/api/meetings/${meetingId}/`);
};

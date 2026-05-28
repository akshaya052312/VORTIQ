/**
 * Safely parses and extracts a user-friendly error message from any error object.
 * Centralizes error handling for Axios, DRF validation errors, and standard JS errors.
 * 
 * @param {any} error - The caught error object
 * @returns {string} - A readable error message
 */
export const getErrorMessage = (error) => {
  if (!error) return "";

  // 1. If it's a string, return it directly
  if (typeof error === "string") {
    return error;
  }

  // Handle network/connection errors explicitly
  if (error.message === "Network Error" || error.code === "ERR_NETWORK") {
    return "Network error. Please check your connection.";
  }

  // 2. Extract error data from Axios response if available
  const errorData = error.response?.data;

  if (errorData) {
    // If errorData is a string (e.g. an HTML error page or raw string)
    if (typeof errorData === "string") {
      return errorData;
    }

    // If it has a detail property (common in DRF)
    if (errorData.detail) {
      if (typeof errorData.detail === "string") {
        return errorData.detail;
      }
      if (Array.isArray(errorData.detail)) {
        return errorData.detail.join(" ");
      }
      if (typeof errorData.detail === "object" && errorData.detail !== null) {
        return getErrorMessage({ response: { data: errorData.detail } });
      }
    }

    // If it has a message property
    if (errorData.message && typeof errorData.message === "string") {
      return errorData.message;
    }

    // If it has an error property
    if (errorData.error && typeof errorData.error === "string") {
      return errorData.error;
    }

    // Handle array of errors
    if (Array.isArray(errorData)) {
      return errorData
        .map((item) => (typeof item === "object" && item !== null ? getErrorMessage({ response: { data: item } }) : String(item)))
        .join(" ");
    }

    // Handle nested or flat objects (like DRF field-level validation errors)
    if (typeof errorData === "object" && errorData !== null) {
      const messages = [];
      for (const [key, value] of Object.entries(errorData)) {
        if (value === undefined || value === null) continue;
        
        let msg = "";
        if (Array.isArray(value)) {
          msg = value.map(val => typeof val === "object" && val !== null ? JSON.stringify(val) : String(val)).join(" ");
        } else if (typeof value === "object") {
          msg = JSON.stringify(value);
        } else {
          msg = String(value);
        }

        if (msg) {
          messages.push(msg);
        }
      }
      return messages.join(" ").trim() || "An error occurred.";
    }

    return JSON.stringify(errorData);
  }

  // 3. Fallback to standard JavaScript Error message
  if (error.message) {
    return error.message;
  }

  // 4. Try JSON stringification
  try {
    const stringified = JSON.stringify(error);
    if (stringified === "{}" || stringified === "[]") {
      return String(error);
    }
    return stringified;
  } catch (e) {
    return String(error);
  }
};

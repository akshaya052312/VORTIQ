export function getErrorMessage(error) {
  if (!error) return "Something went wrong. Please try again.";

  // Network/no response errors
  if (!error.response) return error.message || "Network error. Please check your connection.";

  const data = error.response.data;

  // Plain string
  if (typeof data === "string") return data;

  // DRF standard: { detail: "..." }
  if (data?.detail) return data.detail;

  // DRF validation errors: { field: ["msg1", "msg2"], ... }
  if (typeof data === "object") {
    const messages = Object.entries(data)
      .map(([field, msgs]) => {
        const text = Array.isArray(msgs) ? msgs.join(", ") : String(msgs);
        return field === "non_field_errors" ? text : `${field}: ${text}`;
      })
      .join(" | ");
    if (messages) return messages;
  }

  return "An unexpected error occurred.";
}

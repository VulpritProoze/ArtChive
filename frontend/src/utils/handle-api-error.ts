import axios from "axios";
import { type StatusMessageMap } from '@types'

/**
 * Handles API errors and returns an appropriate user-facing message.
 *
 * @param error - The caught error (expected to be an AxiosError or generic error)
 * @param statusMessages - Optional map of HTTP status codes to custom messages
 * @param useResponseMessage - If true, attempts to extract error message from response data (e.g., Django validation errors)
 * @returns A user-friendly error message string
 *
 * TODO: Refactor in the future to support returning an array of error messages instead of just the first one.
 */
const handleApiError = (
  error: unknown,
  statusMessages: StatusMessageMap = {},
  useResponseMessage: boolean = false
) => {
  let message: string | undefined;

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const responseData = error.response?.data;

    // Try to extract validation error message if flag is enabled
    if (useResponseMessage && responseData && typeof responseData === 'object') {
      // Handle Django-style non_field_errors
      if (Array.isArray(responseData.non_field_errors) && responseData.non_field_errors.length > 0) {
        message = responseData.non_field_errors[0]; // Return first error only
      }
      // TODO: Consider other field-level errors or generalize error extraction
    }

    // If no message extracted from response data, fall back to status-based logic
    if (!message) {
      if (status && status in statusMessages) {
        message = statusMessages[status];
      } else if (status) {
        message = `Error: ${status}`;
      } else {
        message = "Network error or request failed";
      }
    }
  } else {
    message = "An unexpected error occurred";
  }

  console.error(message, error);
  return message;
};

export default handleApiError;
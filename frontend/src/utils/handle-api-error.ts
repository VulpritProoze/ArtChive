import axios from "axios";
import { type StatusMessageMap } from '@types'

const handleApiError = (error: unknown, statusMessages: StatusMessageMap = {}) => {
  let message: string | undefined;

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    
    if (status && status in statusMessages) {
      // Use custom message if status code exists in the provided map
      message = statusMessages[status];
    } else if (status) {
      // Fallback to generic status message if no custom mapping provided
      message = `Error: ${status}`;
    } else {
      // No status (network error, etc.)
      message = "Network error or request failed";
    }
  } else {
    // Non-Axios error
    message = "An unexpected error occurred";
  }

  console.error(message, error);
  return message;
};

export default handleApiError;
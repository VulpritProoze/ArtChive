import axios from "axios";
import { type StatusMessageMap } from '@types'

/**
 * Handles API errors and returns an appropriate user-facing message.
 *
 * @param error - The caught error (expected to be an AxiosError or generic error)
 * @param statusMessages - Optional map of HTTP status codes to custom messages
 * @param useResponseMessage - If true, attempts to extract error message from response data (e.g., Django validation errors)
 * @param returnAllMessagesAsArray - If true, returns an array of error messages (useful for Django REST Framework multiple errors). If false, returns a single string.
 * @returns A user-friendly error message string, or an array of error messages if returnAllMessagesAsArray is true
 */
const handleApiError = (
  error: unknown,
  statusMessages: StatusMessageMap = {},
  useResponseMessage: boolean = false,
  returnAllMessagesAsArray: boolean = false
): string | string[] => {
  let message: string | undefined;
  let messages: string[] = [];

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const responseData = error.response?.data;

    // Try to extract validation error message if flag is enabled
    if (useResponseMessage && responseData && typeof responseData === 'object') {
      // Handle Django REST Framework error responses
      
      // Collect all error messages
      const collectedErrors: string[] = [];
      
      // Handle Django-style non_field_errors (general errors)
      if (Array.isArray(responseData.non_field_errors) && responseData.non_field_errors.length > 0) {
        collectedErrors.push(...responseData.non_field_errors);
      }
      
      // Handle single 'error' field (string or array)
      if (responseData.error) {
        if (typeof responseData.error === 'string') {
          collectedErrors.push(responseData.error);
        } else if (Array.isArray(responseData.error)) {
          collectedErrors.push(...responseData.error);
        }
      }
      
      // Recursive function to extract nested errors
      const extractNestedErrors = (obj: any, prefix: string = ''): void => {
        Object.keys(obj).forEach((key) => {
          if (key === 'non_field_errors' || key === 'error') {
            return; // Skip these as they're handled separately
          }

          const value = obj[key];
          const fieldPath = prefix ? `${prefix}.${key}` : key;

          if (Array.isArray(value)) {
            // Direct array of error messages
            value.forEach((err: string) => {
              if (typeof err === 'string') {
                collectedErrors.push(`${fieldPath}: ${err}`);
              }
            });
          } else if (typeof value === 'string') {
            // Direct string error
            collectedErrors.push(`${fieldPath}: ${value}`);
          } else if (typeof value === 'object' && value !== null) {
            // Nested object - recurse
            extractNestedErrors(value, fieldPath);
          }
        });
      };

      // Handle field-specific errors (including nested ones)
      extractNestedErrors(responseData);
      
      // Set messages based on returnAllMessagesAsArray flag
      if (collectedErrors.length > 0) {
        if (returnAllMessagesAsArray) {
          messages = collectedErrors;
        } else {
          message = collectedErrors[0]; // Return first error for backward compatibility
        }
      }
    }

    // If no message extracted from response data, fall back to status-based logic
    if (!message && messages.length === 0) {
      if (status && status in statusMessages) {
        const statusMsg = statusMessages[status];
        if (returnAllMessagesAsArray) {
          messages = [statusMsg];
        } else {
          message = statusMsg;
        }
      } else if (status) {
        const statusMsg = `Error: ${status}`;
        if (returnAllMessagesAsArray) {
          messages = [statusMsg];
        } else {
          message = statusMsg;
        }
      } else {
        const defaultMsg = "Network error or request failed";
        if (returnAllMessagesAsArray) {
          messages = [defaultMsg];
        } else {
          message = defaultMsg;
        }
      }
    }
  } else {
    const unexpectedMsg = "An unexpected error occurred";
    if (returnAllMessagesAsArray) {
      messages = [unexpectedMsg];
    } else {
      message = unexpectedMsg;
    }
  }

  // Return array or string based on flag
  if (returnAllMessagesAsArray) {
    const result = messages.length > 0 ? messages : (message ? [message] : ["An unexpected error occurred"]);
    console.error(result, error);
    return result;
  } else {
    const result = message || "An unexpected error occurred";
    console.error(result, error);
    return result;
  }
};

export default handleApiError;
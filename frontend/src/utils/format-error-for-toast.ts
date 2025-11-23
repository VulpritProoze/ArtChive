/**
 * Formats the output of handleApiError for display in toast notifications
 *
 * Now returns string | string[] to allow the toast utility to create separate toasts for each error
 *
 * @param errorMessage - The error message from handleApiError (can be string or string[])
 * @returns The error message as-is (string or string[]) for toast display
 */
export default function formatErrorForToast(errorMessage: string | string[]): string | string[] {
  // Simply return as-is - the toast utility will handle arrays by creating multiple toasts
  return errorMessage;
}

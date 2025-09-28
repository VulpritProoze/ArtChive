import { type StatusMessageMap } from "@types";

/**
 * Generic, user-friendly error messages for common HTTP status codes.
 * Designed to be reused across the entire application.
 */
export const defaultErrors: StatusMessageMap = {
  // === 4xx Client Errors ===

  400: "Bad request. Please check your input and try again.",
  401: "You're not signed in. Please log in to continue.",
  402: "Payment required. This action needs an active subscription.",
  403: "Access denied. You don’t have permission to do that.",
  404: "We couldn’t find what you’re looking for.",
  405: "This action isn’t allowed here. Please try a different method.",
  406: "The requested format isn’t supported.",
  407: "Proxy authentication required. Please contact support.",
  408: "Request timed out. Please check your connection and try again.",
  409: "There’s a conflict with your request. Please refresh and try again.",
  410: "This content has been permanently removed.",
  411: "Length required. The request is missing required content length.",
  412: "Precondition failed. Please refresh the page and try again.",
  413: "File too large. Please upload a smaller file.",
  414: "URL too long. Please try a shorter request.",
  415: "Unsupported file type. Please use a valid format (e.g., JPG, PNG, MP4).",
  416: "Requested range not satisfiable. Please try downloading the full file.",
  417: "Expectation failed. Please retry your request.",
  418: "I’m a teapot! 🫖 (This is a joke error — please contact support if you see this.)",
  422: "Validation failed. Please review the form and fix any errors.",
  423: "Resource is locked. Please try again later.",
  424: "Action failed due to a dependency error. Please try again.",
  425: "Too early. Please wait a moment and retry.",
  426: "Upgrade required. Please update your app or browser.",
  428: "Precondition required. Please refresh and try again.",
  429: "Too many requests. Please wait a few seconds and try again.",
  431: "Request header fields too large. Please clear your browser cache or cookies.",
  451: "This content is unavailable due to legal reasons.",

  // === 5xx Server Errors ===

  500: "Something went wrong on our end. We’ve been notified and are working on it.",
  501: "This feature isn’t implemented yet. Please check back later.",
  502: "Bad gateway. The server received an invalid response from another service.",
  503: "Service temporarily unavailable. Please try again in a few minutes.",
  504: "Gateway timeout. The server took too long to respond. Please try again.",
  505: "HTTP version not supported. Please update your browser.",
  506: "Variant also negotiates. Please contact support.",
  507: "Insufficient storage. We’re out of space — please try again later.",
  508: "Request loop detected. Please contact support.",
  510: "Further extensions are required to complete this request.",
  511: "Network authentication required. Please log in to your network.",
};
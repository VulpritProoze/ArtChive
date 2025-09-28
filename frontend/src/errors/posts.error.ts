import { type StatusMessageMap } from "@types";

export const fetchPostsErrors: StatusMessageMap = {
    400: "Invalid request parameters",
    401: "Session expired. Please log in again.",
    403: "You don't have permission to view these posts",
    404: "Posts not found",
    500: "Failed to load posts due to a network error. Please try again later.",
};
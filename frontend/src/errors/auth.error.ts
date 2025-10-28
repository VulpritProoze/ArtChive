import type { StatusMessageMap } from "@types";

export const loginErrors: StatusMessageMap = {
    400: "Invalid email or password.",
    401: "Unauthorized. Please check your credentials.",
    403: "Your account has been locked. Please contact support.",
    429: "Too many login attempts. Please try again later.",
    500: "Something went wrong on our end. Please try again later!",
    503: "Service temporarily unavailable. Please try again later."
}
import type { StatusMessageMap } from "@/types";

export const brushDripTransactionErrors: StatusMessageMap = {
    400: "You do not have enough brush drips to create this transaction :/",
    500: "An error occurred on our end. Please try again later."
}
import type { StatusMessageMap } from "@/types";

export const channelCreateErrors: StatusMessageMap = {
    400: 'Invalid channel data. Please check your input.',
    403: 'You do not have permission to create a channel in this collective.',
    404: 'Collective not found.',
    500: 'Server error. Please try again later.',
}
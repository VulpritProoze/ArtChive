import axios from "axios";

const handleApiError = (error: unknown, defaultMessage: string) => {
    let message

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 403) message = "You do not have permission"
      else if (status === 404) message = "Not found"
      else if (status === 400) message = "Invalid data"
      else if (status === 500) message = "Server error"
      else message = `Error: ${status || 'Unknown'}`
    } else {
      message = defaultMessage
    }
    console.error(message, error);

    return message
};

export default handleApiError
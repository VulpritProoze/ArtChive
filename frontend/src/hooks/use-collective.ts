import { collective } from "@lib/api";
import { useAuth } from "@context/auth-context";
import { toast } from "react-toastify";
import { defaultErrors } from "@errors";
import { handleApiError } from "@utils";

const useCollective = () => {
    const { fetchCollectiveMemberDetails } = useAuth()

  const handleLeaveCollective = async (collectiveId: string) => {
    const userConfirmed = window.confirm(
      "Are you sure you want to leave this collective?"
    );
    if (userConfirmed) {
      try {
        await collective.delete(`${collectiveId}/leave/`, {
          withCredentials: true,
        });
        await fetchCollectiveMemberDetails();
        toast.success("Successfully left collective");
      } catch (err) {
        toast.error("Failed to execute this action");
        // I need to make a reusable error alert component
        // that can make custom messages for every
        // http status codes
      }
    }
  };

  const handleBecomeAdmin = async (collectiveId: string) => {
    const userConfirmed = window.confirm(
      "Are you sure you want to request to become an admin?"
    );
    if (userConfirmed) {
      try {
        await collective.post(
          `${collectiveId}/admin/request/`,
          {},
          { withCredentials: true }
        );
        await fetchCollectiveMemberDetails();
        toast.success("Successfully submitted admin request.");
      } catch (err) {
        toast.error(handleApiError(err, defaultErrors, true));
        // I need to make a reusable error alert component
        // that can make custom messages for every
        // http status codes
      }
    }
  };

  return {
    handleLeaveCollective,
    handleBecomeAdmin
  };
};

export default useCollective;

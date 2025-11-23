import { collective } from "@lib/api";
import { useAuth } from "@context/auth-context";
import { toast } from "@utils/toast.util";
import { defaultErrors } from "@errors";
import { handleApiError, formatErrorForToast } from "@utils";

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
        toast.success("Collective left", "You have successfully left the collective");
      } catch (err) {
        const message = handleApiError(err, defaultErrors, true, true);
        toast.error("Failed to leave collective", formatErrorForToast(message));
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
        toast.success("Admin request submitted", "Your request to become an admin has been submitted");
      } catch (err) {
        const message = handleApiError(err, defaultErrors, true, true);
        toast.error("Failed to submit admin request", formatErrorForToast(message));
      }
    }
  };

  return {
    handleLeaveCollective,
    handleBecomeAdmin
  };
};

export default useCollective;

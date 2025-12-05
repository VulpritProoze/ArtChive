import { useState, useEffect } from "react";
import { X, Loader2, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { CollectiveListItem } from "@services/collective.service";
import { collective as collectiveApi } from "@lib/api";
import { toast } from "@utils/toast.util";
import { handleApiError, formatErrorForToast } from "@utils";
import { defaultErrors } from "@errors";

interface CollectiveJoinRequestModalProps {
  collective: CollectiveListItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onCancelRequest?: (requestId: string) => void;
  existingRequestId?: string | null; // Optional: if user already has a pending request
}

export const CollectiveJoinRequestModal = ({
  collective,
  isOpen,
  onClose,
  onSuccess,
  onCancelRequest,
  existingRequestId,
}: CollectiveJoinRequestModalProps) => {
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Initialize with existing request ID if provided
  // Also reset when modal opens/closes to ensure proper state
  useEffect(() => {
    if (isOpen) {
      if (existingRequestId) {
        setSubmittedRequestId(existingRequestId);
      } else {
        setSubmittedRequestId(null);
      }
    } else {
      // Reset state when modal closes
      setSubmittedRequestId(null);
      setRulesAccepted(false);
      setMessage("");
    }
  }, [existingRequestId, isOpen]);

  const handleSubmit = async () => {
    if (!rulesAccepted) {
      toast.error("Accept Rules Required", "You must accept the collective's rules to join.");
      return;
    }

    if (!collective?.collective_id) {
      toast.error("Invalid Collective", "Collective information is missing. Please try again.");
      console.error("Collective ID is missing:", collective);
      return;
    }

    try {
      setIsSubmitting(true);

      const requestData: { rules_accepted: boolean; message?: string } = {
        rules_accepted: true,
      };

      const trimmedMessage = message.trim();
      if (trimmedMessage) {
        requestData.message = trimmedMessage;
      }

      const url = `${collective.collective_id}/join/request/`;
      console.log("Submitting join request to:", url, "with data:", requestData);

      const response = await collectiveApi.post(url, requestData);

      if (response?.data?.request?.request_id) {
        setSubmittedRequestId(response.data.request.request_id);
        
        // Invalidate pending requests query to update UI
        queryClient.invalidateQueries({ queryKey: ['bulk-pending-join-requests'] });
        
        toast.success(
          "Join Request Submitted",
          "Your request has been submitted. Waiting for admin approval."
        );
        onSuccess();
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      console.error("Error submitting join request: ", err);
      
      // Check if it's a validation error we caught before the API call
      if (err instanceof Error && err.message.includes("Invalid Collective")) {
        // Already shown toast, just return
        return;
      }
      
      const errorMessage = handleApiError(err, defaultErrors, true, true);
      const formattedMessage = formatErrorForToast(errorMessage);
      
      // If it's an array, use the first message, otherwise use the string
      const displayMessage = Array.isArray(formattedMessage) 
        ? formattedMessage[0] 
        : formattedMessage;
      
      toast.error("Failed to Submit Request", displayMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!submittedRequestId) return;

    try {
      setIsCancelling(true);

      await collectiveApi.delete(
        `join/requests/${submittedRequestId}/cancel/`
      );

      // Invalidate pending requests query to update UI
      queryClient.invalidateQueries({ queryKey: ['bulk-pending-join-requests'] });

      toast.success("Request Cancelled", "Your join request has been cancelled.");
      const cancelledRequestId = submittedRequestId;
      setSubmittedRequestId(null);
      setRulesAccepted(false);
      setMessage("");
      onCancelRequest?.(cancelledRequestId);
    } catch (err) {
      console.error("Error cancelling join request: ", err);
      const errorMessage = handleApiError(err, defaultErrors, true, true);
      const formattedMessage = formatErrorForToast(errorMessage);
      
      // If it's an array, use the first message, otherwise use the string
      const displayMessage = Array.isArray(formattedMessage) 
        ? formattedMessage[0] 
        : formattedMessage;
      
      toast.error("Failed to Cancel Request", displayMessage);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting || isCancelling) return;
    setRulesAccepted(false);
    setMessage("");
    setSubmittedRequestId(null);
    onClose();
  };

  if (!isOpen) return null;

  // Safety check - ensure collective has required data
  if (!collective || !collective.collective_id) {
    console.error("Invalid collective passed to modal:", collective);
    return null;
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-base-content">
            Join {collective.title}
          </h2>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={handleClose}
            disabled={isSubmitting || isCancelling}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Collective Details */}
        <div className="mb-6">
          <div className="flex gap-4 mb-4">
            {collective.picture && (
              <img
                src={collective.picture}
                alt={collective.title}
                className="w-24 h-24 object-cover rounded-lg"
              />
            )}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-base-content mb-2">
                {collective.title}
              </h3>
              <p className="text-sm text-base-content/70 line-clamp-3">
                {collective.description}
              </p>
            </div>
          </div>
        </div>

        {/* Rules Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-base-content mb-3">
            Collective Rules
          </h3>
          <div className="bg-base-200 rounded-lg p-4 max-h-60 overflow-y-auto">
            {collective.rules && collective.rules.length > 0 ? (
              <ul className="list-disc list-inside space-y-2">
                {collective.rules.map((rule, index) => (
                  <li key={index} className="text-sm text-base-content/80">
                    {rule}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-base-content/60">
                No specific rules defined for this collective.
              </p>
            )}
          </div>
        </div>

        {/* Rules Acceptance Checkbox - Hidden when request is pending */}
        {!submittedRequestId && (
          <div className="mb-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox checkbox-primary mt-1"
                checked={rulesAccepted}
                onChange={(e) => setRulesAccepted(e.target.checked)}
                disabled={isSubmitting || isCancelling}
              />
              <span className="text-sm text-base-content">
                I have read and accept the collective's rules
              </span>
            </label>
          </div>
        )}

        {/* Optional Message - Hidden when request is pending */}
        {!submittedRequestId && (
          <div className="mb-4">
            <label className="label">
              <span className="label-text text-sm text-base-content/70">
                Optional Message (optional)
              </span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              placeholder="Add a message to your join request..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSubmitting || isCancelling}
              maxLength={500}
              rows={3}
            />
            <div className="text-xs text-base-content/50 mt-1 text-right">
              {message.length}/500
            </div>
          </div>
        )}

        {/* Status Message */}
        {submittedRequestId && (
          <div className="alert alert-info mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-current shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <span>
              Your join request has been submitted and is pending admin approval.
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="modal-action">
          {submittedRequestId ? (
            <>
              <button
                className="btn btn-ghost"
                onClick={handleClose}
                disabled={isCancelling}
              >
                Close
              </button>
              <button
                className="btn btn-error"
                onClick={handleCancelRequest}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  "Cancel Request"
                )}
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-ghost"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!rulesAccepted || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </button>
            </>
          )}
        </div>
      </div>
      <div className="modal-backdrop" onClick={handleClose}></div>
    </div>
  );
};


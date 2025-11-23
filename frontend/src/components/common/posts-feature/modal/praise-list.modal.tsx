import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHandsClapping, faTimes } from "@fortawesome/free-solid-svg-icons";
import type { PostPraise } from "@types";
import { post } from "@lib/api";
import { toast } from "@utils/toast.util";
import { handleApiError, formatErrorForToast } from "@utils";
import { defaultErrors } from "@errors";

interface PraiseListModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

export default function PraiseListModal({
  isOpen,
  onClose,
  postId,
}: PraiseListModalProps) {
  const [praises, setPraises] = useState<PostPraise[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && postId) {
      fetchPraises();
    }
  }, [isOpen, postId]);

  const fetchPraises = async () => {
    try {
      setLoading(true);
      const response = await post.get(`/${postId}/praises/`);
      setPraises(response.data.results || response.data || []);
    } catch (error) {
      console.error("Fetch praises error:", error);
      const message = handleApiError(error, defaultErrors, true, true);
      toast.error('Failed to load praises', formatErrorForToast(message));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faHandsClapping}
              className="text-warning text-xl"
            />
            <h3 className="font-bold text-lg">Praises</h3>
          </div>
          <button
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Content */}
        <div className="divider my-2"></div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <span className="loading loading-spinner loading-lg text-warning"></span>
          </div>
        ) : praises.length === 0 ? (
          <div className="text-center py-12">
            <FontAwesomeIcon
              icon={faHandsClapping}
              className="text-6xl text-base-content/20 mb-4"
            />
            <p className="text-base-content/60">No praises yet</p>
            <p className="text-sm text-base-content/40 mt-1">
              Be the first to praise this post!
            </p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {praises.map((praise) => (
              <div
                key={praise.id}
                className="flex items-center gap-3 p-3 hover:bg-base-200 rounded-lg transition-colors"
              >
                {/* Avatar */}
                <div className="avatar">
                  <div className="w-12 h-12 rounded-full ring ring-warning ring-offset-base-100 ring-offset-2">
                    {praise.author_picture ? (
                      <img
                        src={praise.author_picture}
                        alt={praise.author_username}
                      />
                    ) : (
                      <div className="bg-warning flex items-center justify-center">
                        <span className="text-warning-content font-bold">
                          {praise.author_username?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1">
                  <p className="font-semibold text-base-content">
                    {praise.author_fullname || praise.author_username}
                  </p>
                  <p className="text-sm text-base-content/60">
                    @{praise.author_username}
                  </p>
                  <p className="text-xs text-base-content/40 mt-1">
                    {formatDate(praise.praised_at)}
                  </p>
                </div>

                {/* Praise Icon */}
                <div>
                  <FontAwesomeIcon
                    icon={faHandsClapping}
                    className="text-warning text-xl"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {praises.length > 0 && (
          <>
            <div className="divider my-2"></div>
            <div className="text-center text-sm text-base-content/60">
              {praises.length} {praises.length === 1 ? "praise" : "praises"}
            </div>
          </>
        )}
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrophy, faTimes } from "@fortawesome/free-solid-svg-icons";
import type { PostTrophy } from "@types";
import { post } from "@lib/api";
import { toast } from "@utils/toast.util";
import { handleApiError, formatErrorForToast } from "@utils";
import { defaultErrors } from "@errors";

interface TrophyListModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

export default function TrophyListModal({
  isOpen,
  onClose,
  postId,
}: TrophyListModalProps) {
  const [trophies, setTrophies] = useState<PostTrophy[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && postId) {
      fetchTrophies();
    }
  }, [isOpen, postId]);

  const fetchTrophies = async () => {
    try {
      setLoading(true);
      const response = await post.get(`/${postId}/trophies/`);
      setTrophies(response.data.results || response.data || []);
    } catch (error) {
      console.error("Fetch trophies error:", error);
      const message = handleApiError(error, defaultErrors, true, true);
      toast.error('Failed to load trophies', formatErrorForToast(message));
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

  const getTrophyColor = (trophyType: string) => {
    switch (trophyType.toLowerCase()) {
      case "bronze_stroke":
        return "text-orange-700";
      case "golden_bristle":
        return "text-yellow-600";
      case "diamond_canvas":
        return "text-blue-600";
      default:
        return "text-base-content";
    }
  };

  const getTrophyEmoji = (trophyType: string) => {
    switch (trophyType.toLowerCase()) {
      case "bronze_stroke":
        return "🥉";
      case "golden_bristle":
        return "🥈";
      case "diamond_canvas":
        return "🥇";
      default:
        return "🏆";
    }
  };

  const getTrophyBgColor = (trophyType: string) => {
    switch (trophyType.toLowerCase()) {
      case "bronze_stroke":
        return "bg-orange-100";
      case "golden_bristle":
        return "bg-yellow-100";
      case "diamond_canvas":
        return "bg-blue-100";
      default:
        return "bg-base-200";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faTrophy}
              className="text-warning text-xl"
            />
            <h3 className="font-bold text-lg">Trophies</h3>
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
        ) : trophies.length === 0 ? (
          <div className="text-center py-12">
            <FontAwesomeIcon
              icon={faTrophy}
              className="text-6xl text-base-content/20 mb-4"
            />
            <p className="text-base-content/60">No trophies yet</p>
            <p className="text-sm text-base-content/40 mt-1">
              Be the first to award a trophy!
            </p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {trophies.map((trophy) => (
              <div
                key={trophy.id}
                className="flex items-center gap-3 p-3 hover:bg-base-200 rounded-lg transition-colors"
              >
                {/* Avatar */}
                <div className="avatar">
                  <div className="w-12 h-12 rounded-full ring ring-warning ring-offset-base-100 ring-offset-2">
                    {trophy.author_picture ? (
                      <img
                        src={trophy.author_picture}
                        alt={trophy.author_username}
                      />
                    ) : (
                      <div className="bg-warning flex items-center justify-center">
                        <span className="text-warning-content font-bold">
                          {trophy.author_username?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1">
                  <p className="font-semibold text-base-content">
                    {trophy.author_fullname || trophy.author_username}
                  </p>
                  <p className="text-sm text-base-content/60">
                    @{trophy.author_username}
                  </p>
                  <p className="text-xs text-base-content/40 mt-1">
                    {formatDate(trophy.awarded_at)}
                  </p>
                </div>

                {/* Trophy Badge */}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`badge ${getTrophyBgColor(
                      trophy.trophy_type_name
                    )} gap-1 px-3 py-3 border-0`}
                  >
                    <span className="text-xl">
                      {getTrophyEmoji(trophy.trophy_type_name)}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-semibold ${getTrophyColor(
                      trophy.trophy_type_name
                    )}`}
                  >
                    {trophy.trophy_brush_drip_value} BD
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer - Summary */}
        {trophies.length > 0 && (
          <>
            <div className="divider my-2"></div>
            <div className="flex justify-around text-center text-sm">
              <div>
                <p className="font-semibold text-base-content">
                  {trophies.length}
                </p>
                <p className="text-xs text-base-content/60">
                  {trophies.length === 1 ? "Trophy" : "Trophies"}
                </p>
              </div>
              <div>
                <p className="font-semibold text-warning">
                  {trophies.reduce(
                    (sum, t) => sum + t.trophy_brush_drip_value,
                    0
                  )}{" "}
                  BD
                </p>
                <p className="text-xs text-base-content/60">Total Value</p>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHandsClapping } from "@fortawesome/free-solid-svg-icons";
import type { PostPraise } from "@types";
import { post } from "@lib/api";
import { handleApiError } from "@utils";

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
    setLoading(true);
    try {
      const response = await post.get(`/${postId}/praises/`);
      setPraises(response.data.results || response.data || []);
    } catch (error) {
      console.error("Fetch praises error:", error);
      handleApiError(error, 'Failed to load praises');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-base-100 rounded-2xl shadow-2xl w-full max-w-md max-h-[600px] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faHandsClapping}
              className="text-warning text-xl"
            />
            <h3 className="text-lg font-bold text-base-content">
              Praises
            </h3>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle hover:bg-base-200"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="loading loading-spinner loading-md text-primary"></div>
            </div>
          ) : praises.length === 0 ? (
            <div className="text-center py-12">
              <FontAwesomeIcon
                icon={faHandsClapping}
                className="text-6xl text-base-content/30 mb-3"
              />
              <p className="text-base-content/70">No praises yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {praises.map((praise) => (
                <div
                  key={praise.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-base-200 transition-colors"
                >
                  {/* User Avatar */}
                  <img
                    src={praise.author_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(praise.author_username)}&background=random&size=40`}
                    alt={praise.author_username}
                    className="w-10 h-10 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(praise.author_username)}&background=random&size=40`;
                    }}
                  />
                  
                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-base-content truncate">
                      {praise.author_fullname}
                    </p>
                    <p className="text-xs text-base-content/60 truncate">
                      @{praise.author_username}
                    </p>
                  </div>

                  {/* Praise Icon */}
                  <FontAwesomeIcon
                    icon={faHandsClapping}
                    className="text-warning text-xl flex-shrink-0"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

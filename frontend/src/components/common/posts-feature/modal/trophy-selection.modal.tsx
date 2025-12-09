import { useState, useRef, useEffect, useMemo } from "react";
import { X, Medal, Award, Trophy, Check } from "lucide-react";
import { usePostUI } from "@context/post-ui-context";
import { useAwardTrophy } from "@hooks/mutations/use-post-mutations";
import { useCreateGalleryAward, useGalleryAwards } from "@hooks/queries/use-gallery-awards";
import { useAuth } from "@context/auth-context";
import { toast } from "@utils/toast.util";
import { handleApiError, formatErrorForToast } from "@utils";

const TROPHY_TYPES = [
  {
    name: "bronze_stroke",
    displayName: "Bronze Stroke",
    cost: 5,
    description: "Show your appreciation",
    icon: Medal,
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    borderColor: "border-orange-300",
    hoverColor: "hover:bg-orange-200",
  },
  {
    name: "golden_bristle",
    displayName: "Golden Bristle",
    cost: 10,
    description: "Award excellence",
    icon: Award,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    borderColor: "border-yellow-300",
    hoverColor: "hover:bg-yellow-200",
  },
  {
    name: "diamond_canvas",
    displayName: "Diamond Canvas",
    cost: 20,
    description: "Celebrate mastery",
    icon: Trophy,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-300",
    hoverColor: "hover:bg-blue-200",
  },
];

interface TrophySelectionModalProps {
  targetType?: 'post' | 'gallery';
  targetId?: string;
}

export default function TrophySelectionModal({ targetType = 'post', targetId }: TrophySelectionModalProps) {
  const {
    showTrophyModal,
    setShowTrophyModal,
    selectedPostForTrophy,
    setSelectedPostForTrophy,
    selectedPostTrophyAwards,
    setSelectedPostTrophyAwards,
  } = usePostUI();
  
  const { user } = useAuth();
  const { mutate: awardTrophy, isPending: isPendingPost, reset: resetPost } = useAwardTrophy();
  const { mutate: awardGalleryAward, isPending: isPendingGallery, reset: resetGallery } = useCreateGalleryAward();
  
  const [selectedAward, setSelectedAward] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const isCancelledRef = useRef<boolean>(false);

  // Support both post and gallery
  const finalTargetType = targetType;
  const finalTargetId = targetId || selectedPostForTrophy;
  const isPending = isPendingPost || isPendingGallery;

  // Fetch user's gallery awards if this is a gallery
  const { data: galleryAwardsData } = useGalleryAwards(
    finalTargetId || '',
    { 
      enabled: finalTargetType === 'gallery' && Boolean(finalTargetId) && showTrophyModal && Boolean(user)
    }
  );

  // Extract user's awarded types from gallery awards
  const userAwardedGalleryTypes = useMemo(() => {
    if (finalTargetType !== 'gallery' || !galleryAwardsData || !user) return [];
    
    const allAwards = galleryAwardsData.pages.flatMap(page => page.results || []);
    return allAwards
      .filter(award => award.author === user.id && !award.is_deleted)
      .map(award => award.award_type);
  }, [galleryAwardsData, finalTargetType, user]);

  // Track previous target to detect changes
  const prevTargetRef = useRef<string | null>(null);

  // Initialize selectedPostTrophyAwards from user's awards when modal opens
  useEffect(() => {
    if (showTrophyModal && finalTargetId) {
      // If target changed, clear awards first
      if (prevTargetRef.current !== finalTargetId) {
        setSelectedPostTrophyAwards([]);
        prevTargetRef.current = finalTargetId;
      }

      // For galleries, fetch and set user's awarded types
      if (finalTargetType === 'gallery') {
        // Set user's awarded types when modal opens for gallery
        // This will update when userAwardedGalleryTypes changes (after fetch completes)
        // Always set it (even if empty) to ensure we have the latest state
        setSelectedPostTrophyAwards(userAwardedGalleryTypes);
      }
      // For posts, PostCard component will set it via handleOpenTrophyModal
    } else if (!showTrophyModal) {
      // When modal closes, reset the previous target ref so next open will be treated as new
      // But don't clear the awards - they'll be cleared when a new target is selected
      prevTargetRef.current = null;
    }
  }, [showTrophyModal, finalTargetId, finalTargetType, userAwardedGalleryTypes, setSelectedPostTrophyAwards]);

  if (!showTrophyModal || !finalTargetId) return null;

  const closeModal = () => {
    // Cancel any pending requests
    isCancelledRef.current = true;
    if (isPendingPost) resetPost();
    if (isPendingGallery) resetGallery();
    
    setShowTrophyModal(false);
    setSelectedPostForTrophy(null);
    // Don't clear awards on close - preserve state for when modal reopens
    // The useEffect will handle clearing when target changes
    // setSelectedPostTrophyAwards([]);
    setSelectedAward(null);
    setShowConfirmDialog(false);
    isCancelledRef.current = false;
  };

  const handleAwardSelect = (awardType: string) => {
    if (isPending || selectedPostTrophyAwards.includes(awardType)) {
      return;
    }
    setSelectedAward(awardType);
  };

  const handleSubmit = () => {
    if (!selectedAward || isPending) return;
    
    const trophy = TROPHY_TYPES.find(t => t.name === selectedAward);
    if (!trophy) return;
    
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    if (!selectedAward || !finalTargetId) return;
    
    const trophy = TROPHY_TYPES.find(t => t.name === selectedAward);
    if (!trophy) return;

    isCancelledRef.current = false;
    setShowConfirmDialog(false);
    
    if (finalTargetType === 'gallery') {
      awardGalleryAward(
        { gallery_id: finalTargetId, award_type: selectedAward },
        {
          onSuccess: () => {
            if (isCancelledRef.current) return;
            
            setSelectedPostTrophyAwards((prev) =>
              prev.includes(selectedAward) ? prev : [...prev, selectedAward]
            );
            toast.success(
              'Gallery Awarded',
              `You successfully awarded ${trophy.displayName} (${trophy.cost} BD) to this gallery!`
            );
            setSelectedAward(null);
          },
          onError: (error) => {
            if (isCancelledRef.current) return;
            
            const message = handleApiError(error, {}, true, true);
            toast.error('Failed to award gallery', formatErrorForToast(message));
          },
          onSettled: () => {
            // Keep award button disabled but allow cancel
          },
        }
      );
    } else {
      awardTrophy(
        { postId: finalTargetId, trophyType: selectedAward },
        {
          onSuccess: () => {
            if (isCancelledRef.current) return;
            
            setSelectedPostTrophyAwards((prev) =>
              prev.includes(selectedAward) ? prev : [...prev, selectedAward]
            );
            toast.success(
              'Trophy Awarded',
              `You successfully awarded ${trophy.displayName} (${trophy.cost} BD) to this post!`
            );
            setSelectedAward(null);
          },
          onError: (error) => {
            if (isCancelledRef.current) return;
            
            const message = handleApiError(error, {}, true, true);
            toast.error('Failed to award trophy', formatErrorForToast(message));
          },
          onSettled: () => {
            // Keep award button disabled but allow cancel
          },
        }
      );
    }
  };


  const selectedTrophy = selectedAward ? TROPHY_TYPES.find(t => t.name === selectedAward) : null;
  const totalCost = selectedTrophy?.cost || 0;

  return (
    <>
      <div className="modal modal-open">
        <div className="modal-box max-w-3xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">
              Award a {finalTargetType === 'gallery' ? 'Gallery Award' : 'Trophy'}
            </h2>
            <button
              onClick={closeModal}
              className="btn btn-sm btn-circle btn-ghost"
              disabled={isPending}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-base-content/70 mb-6">
            Select an award to give to this {finalTargetType === 'gallery' ? 'gallery' : 'post'}. 
            Each award costs Brush Drips.
          </p>

          {/* Grid Layout */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {TROPHY_TYPES.map((trophy) => {
              const Icon = trophy.icon;
              const hasAwarded = selectedPostTrophyAwards.includes(trophy.name);
              const isSelected = selectedAward === trophy.name;
              const isDisabled = hasAwarded || isPending;

              return (
                <button
                  key={trophy.name}
                  onClick={() => handleAwardSelect(trophy.name)}
                  disabled={isDisabled}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all
                    ${isSelected 
                      ? `${trophy.bgColor} ${trophy.borderColor} border-4 shadow-lg scale-105` 
                      : `${trophy.bgColor} border-base-300 ${trophy.hoverColor}`
                    }
                    ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    ${!isDisabled && !isSelected ? 'hover:scale-105 hover:shadow-md' : ''}
                  `}
                >
                  {/* Icon */}
                  <div className="flex flex-col items-center gap-2">
                    <Icon className={`w-8 h-8 ${trophy.color}`} />
                    <div className="text-center">
                      <p className={`text-xs font-semibold ${trophy.color}`}>
                        {trophy.displayName}
                      </p>
                      <p className="text-xs text-base-content/60 mt-0.5">
                        {trophy.cost} BD
                      </p>
                    </div>
                  </div>

                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="absolute top-1 right-1">
                      <div className={`w-5 h-5 rounded-full ${trophy.bgColor} border-2 ${trophy.borderColor} flex items-center justify-center`}>
                        <Check className={`w-3 h-3 ${trophy.color}`} />
                      </div>
                    </div>
                  )}

                  {/* Already awarded badge */}
                  {hasAwarded && (
                    <div className="absolute top-1 right-1">
                      <div className="badge badge-success badge-sm">Awarded</div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Award Info */}
          {selectedTrophy && !showConfirmDialog && (
            <div className={`mb-4 p-4 rounded-lg border-2 ${selectedTrophy.bgColor} ${selectedTrophy.borderColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = selectedTrophy.icon;
                    return <Icon className={`w-6 h-6 ${selectedTrophy.color}`} />;
                  })()}
                  <div>
                    <p className="font-semibold">{selectedTrophy.displayName}</p>
                    <p className="text-sm text-base-content/70">{selectedTrophy.description}</p>
                    <p className="text-xs text-base-content/60 mt-1">
                      Cost: <span className="font-semibold text-warning">{selectedTrophy.cost} Brush Drips</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="modal-action mt-6">
            {isPending ? (
              <button
                type="button"
                className="btn btn-ghost"
                disabled
              >
                <span className="loading loading-spinner loading-sm"></span>
                Awarding...
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={closeModal}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={!selectedAward || selectedPostTrophyAwards.includes(selectedAward || '')}
                >
                  Award {selectedTrophy ? `(${totalCost} BD)` : ''}
                </button>
              </>
            )}
          </div>
        </div>
        {/* Backdrop */}
        <div className="modal-backdrop" onClick={isPending ? undefined : closeModal}></div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && selectedTrophy && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="font-bold text-lg mb-4">Confirm Award</h3>
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border-2 ${selectedTrophy.bgColor} ${selectedTrophy.borderColor}`}>
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = selectedTrophy.icon;
                    return <Icon className={`w-8 h-8 ${selectedTrophy.color}`} />;
                  })()}
                  <div>
                    <p className="font-semibold">{selectedTrophy.displayName}</p>
                    <p className="text-sm text-base-content/70">{selectedTrophy.description}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-base-200 p-4 rounded-lg">
                <p className="text-sm text-base-content/80 mb-2">
                  This will cost you <span className="font-bold text-warning">{selectedTrophy.cost} Brush Drips</span>.
                </p>
                <p className="text-xs text-base-content/60">
                  The {finalTargetType === 'gallery' ? 'gallery creator' : 'post author'} will receive {selectedTrophy.cost} Brush Drips and reputation points.
                </p>
              </div>

              <div className="flex gap-2 justify-end mt-6">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowConfirmDialog(false)}
                >
                  No, Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirm}
                >
                  Yes, Award
                </button>
              </div>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowConfirmDialog(false)}></div>
        </div>
      )}
    </>
  );
}

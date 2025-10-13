import { usePostContext } from "@context/post-context";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrophy } from "@fortawesome/free-solid-svg-icons";

const TROPHY_TYPES = [
  {
    name: "bronze_stroke",
    displayName: "Bronze Stroke",
    cost: 5,
    description: "Show your appreciation with a Bronze Stroke",
    color: "text-orange-700",
    bgColor: "bg-orange-100 hover:bg-orange-200",
  },
  {
    name: "golden_bristle",
    displayName: "Golden Bristle",
    cost: 10,
    description: "Award excellence with a Golden Bristle",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100 hover:bg-yellow-200",
  },
  {
    name: "diamond_canvas",
    displayName: "Diamond Canvas",
    cost: 20,
    description: "Celebrate mastery with a Diamond Canvas",
    color: "text-blue-600",
    bgColor: "bg-blue-100 hover:bg-blue-200",
  },
];

export default function TrophySelectionModal() {
  const {
    showTrophyModal,
    closeTrophyModal,
    selectedPostForTrophy,
    awardTrophy,
    loadingTrophy,
    trophyStatus,
  } = usePostContext();

  if (!showTrophyModal || !selectedPostForTrophy) return null;

  const handleAwardTrophy = (trophyType: string) => {
    if (selectedPostForTrophy) {
      awardTrophy(selectedPostForTrophy, trophyType);
    }
  };

  const isLoading = loadingTrophy[selectedPostForTrophy];
  const status = trophyStatus[selectedPostForTrophy];
  const userAwardedTrophies = status?.userAwarded || [];

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h2 className="text-2xl font-bold mb-2">Award a Trophy</h2>
        <p className="text-sm text-gray-600 mb-6">
          Choose a trophy to award to this post. Each trophy costs Brush Drips.
        </p>

        <div className="space-y-4">
          {TROPHY_TYPES.map((trophy) => {
            const hasAwarded = userAwardedTrophies.includes(trophy.name);

            return (
              <div
                key={trophy.name}
                className={`card ${trophy.bgColor} shadow-md transition-all ${
                  hasAwarded ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <div className="card-body p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <FontAwesomeIcon
                        icon={faTrophy}
                        className={`text-3xl ${trophy.color}`}
                      />
                      <div>
                        <h3 className="font-bold text-lg">{trophy.displayName}</h3>
                        <p className="text-sm text-gray-600">{trophy.description}</p>
                        <p className="text-xs font-semibold mt-1">
                          Cost: {trophy.cost} Brush Drips
                        </p>
                      </div>
                    </div>
                    <div>
                      {hasAwarded ? (
                        <span className="badge badge-success">Already Awarded</span>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleAwardTrophy(trophy.name)}
                          disabled={isLoading || hasAwarded}
                        >
                          {isLoading ? (
                            <span className="loading loading-spinner loading-sm"></span>
                          ) : (
                            "Award"
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="modal-action mt-6">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={closeTrophyModal}
            disabled={isLoading}
          >
            Close
          </button>
        </div>
      </div>
      {/* Backdrop */}
      <div className="modal-backdrop" onClick={closeTrophyModal}></div>
    </div>
  );
}

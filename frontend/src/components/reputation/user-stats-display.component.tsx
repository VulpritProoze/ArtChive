import React from 'react';
import { formatNumber } from '@utils/format-number.util';

interface UserStatsDisplayProps {
  brushdrips?: number | null;
  reputation?: number | null;
  showBrushdrips?: boolean; // Only show brushdrips for current user
  className?: string;
}

/**
 * Component to display both brushdrips and reputation.
 * For current user: shows both BD and Rep
 * For other users: shows Rep only (no brushdrips)
 */
export const UserStatsDisplay: React.FC<UserStatsDisplayProps> = ({
  brushdrips,
  reputation,
  showBrushdrips = false,
  className = '',
}) => {
  const brushdripsValue = brushdrips ?? 0;
  const reputationValue = reputation ?? 0;
  const isNegativeRep = reputationValue < 0;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showBrushdrips && (
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-primary rounded-full"></div>
          <p
            className="text-[10px] text-base-content/70 font-medium"
            title={`${brushdripsValue} Brush Drips`}
          >
            {formatNumber(brushdripsValue)} BD
          </p>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${isNegativeRep ? 'bg-reputation' : 'bg-reputation'}`}></div>
        <p
          className={`text-[10px] font-medium ${isNegativeRep ? 'text-reputation' : 'text-base-content/70'}`}
          title={`${reputationValue} Reputation`}
        >
          {formatNumber(reputationValue)} Rep
        </p>
      </div>
    </div>
  );
};


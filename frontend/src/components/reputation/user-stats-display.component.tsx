import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
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
  const isPositiveRep = reputationValue > 0;

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
        {isPositiveRep ? (
          <ArrowUp className="w-3 h-3 text-success flex-shrink-0" />
        ) : isNegativeRep ? (
          <ArrowDown className="w-3 h-3 text-error flex-shrink-0" />
        ) : null}
        <p
          className={`text-[10px] font-medium ${
            isPositiveRep
              ? 'text-success'
              : isNegativeRep
              ? 'text-error'
              : 'text-base-content/70'
          }`}
          title={`${reputationValue} Reputation`}
        >
          {formatNumber(reputationValue)} Rep
        </p>
      </div>
    </div>
  );
};



import React from 'react';
import { formatNumber } from '@utils/format-number.util';

interface ReputationDisplayProps {
  reputation: number | null | undefined;
  showLabel?: boolean;
  className?: string;
}

/**
 * Component to display reputation with red dot indicator.
 * Formats numbers >= 1000 as "1k", "3k", etc.
 * Shows full value in title attribute for tooltip.
 */
export const ReputationDisplay: React.FC<ReputationDisplayProps> = ({
  reputation,
  showLabel = true,
  className = '',
}) => {
  const reputationValue = reputation ?? 0;
  const isNegative = reputationValue < 0;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${isNegative ? 'bg-reputation' : 'bg-reputation'}`}></div>
      <p
        className={`text-[10px] font-medium ${isNegative ? 'text-reputation' : 'text-base-content/70'}`}
        title={`${reputationValue} Reputation`}
      >
        {formatNumber(reputationValue)} {showLabel ? 'Rep' : ''}
      </p>
    </div>
  );
};



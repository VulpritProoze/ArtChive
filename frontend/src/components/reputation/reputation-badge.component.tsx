import React from 'react';
import { formatNumber } from '@utils/format-number.util';

interface ReputationBadgeProps {
  reputation: number | null | undefined;
  className?: string;
}

/**
 * Badge-style reputation display component.
 * Formats numbers >= 1000 as "1k", "3k", etc.
 * Shows full value in title attribute for tooltip.
 */
export const ReputationBadge: React.FC<ReputationBadgeProps> = ({
  reputation,
  className = '',
}) => {
  const reputationValue = reputation ?? 0;
  const isNegative = reputationValue < 0;

  return (
    <div
      className={`badge ${isNegative ? 'bg-reputation/20 text-reputation border-reputation' : 'bg-reputation/10 text-reputation border-reputation/30'} ${className}`}
      title={`${reputationValue} Reputation`}
    >
      <div className="w-1.5 h-1.5 rounded-full bg-reputation mr-1"></div>
      {formatNumber(reputationValue)} Rep
    </div>
  );
};


import React, { useState } from 'react';
import { useUserReputationHistory } from '@hooks/queries/use-reputation';
import { useAuth } from '@context/auth-context';
import { formatNumber } from '@utils/format-number.util';
import { formatDate } from '@utils/format-date.util';
import { LoadingSpinner } from '@components/loading-spinner';
import { History, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface HistoryTabProps {
  className?: string;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const limit = 50;
  const offset = (page - 1) * limit;

  const { data: history, isLoading } = useUserReputationHistory(user?.id, {
    limit,
    offset,
  });

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <LoadingSpinner text="Loading reputation history..." />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <History className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
        <p className="text-base-content/60">No reputation history yet.</p>
        <p className="text-sm text-base-content/40 mt-2">
          Your reputation changes will appear here as you interact with the community.
        </p>
      </div>
    );
  }

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'praise':
        return <ArrowUp className="w-4 h-4 text-success" />;
      case 'trophy':
      case 'gallery_award':
        return <ArrowUp className="w-4 h-4 text-warning" />;
      case 'critique':
        return <Minus className="w-4 h-4 text-info" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getSourceLabel = (sourceType: string, sourceObjectType: string | null) => {
    const objectLabel = sourceObjectType === 'gallery' ? 'Gallery' : 'Post';
    switch (sourceType) {
      case 'praise':
        return `Praise on ${objectLabel}`;
      case 'trophy':
        return `Trophy on ${objectLabel}`;
      case 'gallery_award':
        return 'Gallery Award';
      case 'critique':
        return `Critique on ${objectLabel}`;
      default:
        return sourceType;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="card bg-base-100 shadow-xl border border-base-300">
        <div className="card-body">
          <h3 className="card-title text-base-content mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-reputation" />
            Reputation History
          </h3>

          <div className="space-y-2">
            {history.map((entry, index) => {
              const isPositive = entry.amount > 0;
              const isNegative = entry.amount < 0;
              const isNeutral = entry.amount === 0;

              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    isPositive
                      ? 'bg-success/10 border-success/30'
                      : isNegative
                      ? 'bg-error/10 border-error/30'
                      : 'bg-base-200 border-base-300'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getSourceIcon(entry.source_type)}
                    <div className="flex-1">
                      <div className="font-medium text-base-content">
                        {entry.description || getSourceLabel(entry.source_type, entry.source_object_type)}
                      </div>
                      <div className="text-sm text-base-content/60">
                        {formatDate(entry.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-lg font-bold ${
                        isPositive
                          ? 'text-success'
                          : isNegative
                          ? 'text-error'
                          : 'text-base-content/60'
                      }`}
                      title={`${entry.amount} Reputation`}
                    >
                      {isPositive ? '+' : ''}
                      {formatNumber(entry.amount)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Simple pagination - if needed */}
          {history.length >= limit && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-sm btn-ghost"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="text-sm text-base-content/70">Page {page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={history.length < limit}
                className="btn btn-sm btn-ghost"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


import { useState } from 'react';
import { useAuth } from '@context/auth-context';
import { MainLayout } from '@components/common/layout';
import { LoadingSpinner } from '@components/loading-spinner';
import { LeaderboardTab } from './leaderboard-tab.component';
import { HistoryTab } from './history-tab.component';
import { Trophy, History, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { formatNumber } from '@utils/format-number.util';

export default function Reputation() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'history'>('leaderboard');

  if (!user) {
    return (
      <MainLayout showRightSidebar={false}>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner text="Loading..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showRightSidebar={false}>
      <div className="container max-w-7xl pb-20 mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-base-content mb-2 flex items-center gap-3">
            <ArrowUpDown className="w-8 h-8 text-primary" />
            Reputation
          </h1>
          <p className="text-base-content/60">
            View your reputation score and leaderboard position
          </p>
        </div>

        {/* Main Reputation Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Reputation Score Card */}
          <div className="lg:col-span-2 card bg-gradient-to-br from-reputation/20 to-reputation/10 shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="avatar">
                    <div className="w-16 h-16 rounded-full ring ring-reputation/50 ring-offset-base-100 ring-offset-2">
                      <img
                        src={user.profile_picture}
                        alt={user.fullname || user.username}
                      />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-base-content">{user.fullname || user.username}</h2>
                    <p className="text-base-content/80">@{user.username}</p>
                  </div>
                </div>
                <div className="w-3 h-3 rounded-full bg-reputation opacity-60"></div>
              </div>

              <div className="divider my-2"></div>

              <div>
                <p className="text-sm text-base-content mb-1">Current Reputation</p>
                <div className="flex items-baseline gap-2">
                  {(() => {
                    const reputation = user.reputation ?? 0;
                    const isPositive = reputation > 0;
                    const isNegative = reputation < 0;
                    return (
                      <>
                        {isPositive ? (
                          <ArrowUp className="w-6 h-6 text-success flex-shrink-0" />
                        ) : isNegative ? (
                          <ArrowDown className="w-6 h-6 text-error flex-shrink-0" />
                        ) : (
                          <ArrowUpDown className="w-6 h-6 text-base-content/50 flex-shrink-0" />
                        )}
                        <span
                          className={`text-5xl font-bold ${
                            isPositive
                              ? 'text-success'
                              : isNegative
                              ? 'text-error'
                              : 'text-base-content'
                          }`}
                          title={`${reputation} Reputation`}
                        >
                          {formatNumber(reputation)}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Info Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title text-base-content flex items-center gap-2">
                <Trophy className="w-5 h-5 text-reputation" />
                About Reputation
              </h3>
              <div className="divider my-1"></div>
              <div className="space-y-3 text-sm text-base-content/70">
                <p>
                  Reputation reflects your community standing based on interactions like praise, trophies, and critiques.
                </p>
                <p>
                  <strong className="text-base-content">Earn reputation</strong> by receiving praise (+1), trophies (+5/+10/+20), or positive critiques (+3).
                </p>
                <p>
                  <strong className="text-base-content">Lose reputation</strong> by receiving negative critiques (-3).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            {/* Tab Navigation */}
            <div className="tabs tabs-boxed mb-6">
              <button
                className={`tab flex-1 ${activeTab === 'leaderboard' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('leaderboard')}
              >
                <Trophy className="w-4 h-4 mr-2" />
                Leaderboard
              </button>
              <button
                className={`tab flex-1 ${activeTab === 'history' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                <History className="w-4 h-4 mr-2" />
                History
              </button>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
              {activeTab === 'leaderboard' ? (
                <LeaderboardTab />
              ) : (
                <HistoryTab />
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}



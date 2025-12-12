import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@context/auth-context";
import { core } from "@lib/api";
import { toast } from "@utils/toast.util";
import { handleApiError, formatErrorForToast } from "@utils";
import { defaultErrors } from "@errors";
import type { BrushDripWallet, BrushDripTransactionStats } from "@types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faWallet,
    faArrowUp,
    faArrowDown,
    faChartLine,
    faHistory,
    faCoins,
    faShoppingCart,
} from "@fortawesome/free-solid-svg-icons";
import { LoadingSpinner } from "@components/loading-spinner";
import { MainLayout } from "../common/layout";
import BuyBrushDripsModal from "./buy-brush-drips.modal";

export default function Index() {
    const { user } = useAuth();
    const [wallet, setWallet] = useState<BrushDripWallet | null>(null);
    const [stats, setStats] = useState<BrushDripTransactionStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [showBuyModal, setShowBuyModal] = useState(false);

    useEffect(() => {
        fetchWalletData();
        fetchStats();
    }, []);

    const fetchWalletData = async () => {
        try {
            setLoading(true);
            const response = await core.get("brushdrips/wallet/");
            setWallet(response.data);
        } catch (error) {
            console.error("Wallet fetch error:", error);
            const message = handleApiError(error, defaultErrors, true, true);
            toast.error('Failed to load wallet', formatErrorForToast(message));
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await core.get("brushdrips/transactions/stats/");
            setStats(response.data);
        } catch (error) {
            console.error("Stats fetch error:", error);
        }
    };

    const getFullName = () => {
        if (!wallet) return user?.fullname || user?.username || "";
        const parts = [wallet.first_name, wallet.last_name].filter(Boolean);
        return parts.length > 0 ? parts.join(" ") : wallet.username;
    };

    const handleBuySuccess = (updatedWallet: BrushDripWallet) => {
        setWallet(updatedWallet);
        fetchStats(); // Refresh stats after purchase
    };

    return (
        <>
            <MainLayout showRightSidebar={false}>
                {loading ? (
                    <LoadingSpinner text={"Your hard-earned brush drips is currently loading... "} />
                ) : (
                    <div className="container max-w-7xl pb-20 mx-auto px-4 py-8">
                        {/* Page Header */}
                        <div className="mb-8">
                            <h1 className="text-4xl font-bold text-base-content mb-2 flex items-center gap-3">
                                <FontAwesomeIcon icon={faWallet} className="text-primary" />
                                Brush Drips Wallet
                            </h1>
                            <p className="text-base-content/60">
                                Manage your Brush Drips and view transaction history
                            </p>
                        </div>

                        {/* Main Wallet Card */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                            {/* Wallet Balance Card */}
                            <div className="lg:col-span-2 card bg-gradient-to-br from-primary to-secondary text-primary-content shadow-xl">
                                <div className="card-body">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="avatar">
                                                <div className="w-16 h-16 rounded-full ring ring-primary-content ring-offset-base-100 ring-offset-2">
                                                    <img
                                                        src={wallet?.profile_picture || user?.profile_picture}
                                                        alt={getFullName()}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <h2 className="text-2xl text-base-content font-bold">{getFullName()}</h2>
                                                <p className="text-base-content/80">@{wallet?.username || user?.username}</p>
                                            </div>
                                        </div>
                                        <FontAwesomeIcon
                                            icon={faCoins}
                                            className="text-6xl opacity-20"
                                        />
                                    </div>

                                    <div className="divider my-2"></div>

                                    <div>
                                        <p className="text-sm text-base-content mb-1">Current Balance</p>
                                        <div className="flex items-baseline text-base-content/80 gap-2">
                                            <span className="text-5xl font-bold">
                                                {wallet?.balance?.toLocaleString() || 0}
                                            </span>
                                            <span className="text-2xl font-semibold">Brush Drips</span>
                                        </div>
                                    </div>

                                    <div className="card-actions justify-end mt-4 gap-2">
                                        <button
                                            onClick={() => setShowBuyModal(true)}
                                            className="btn btn-primary"
                                        >
                                            <FontAwesomeIcon icon={faShoppingCart} />
                                            Buy Brush Drips
                                        </button>
                                        <Link to="/drips/transactions" className="btn btn-neutral">
                                            <FontAwesomeIcon icon={faHistory} />
                                            View All Transactions
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Stats Card */}
                            <div className="card bg-base-100 shadow-xl border border-base-300">
                                <div className="card-body">
                                    <h3 className="card-title text-base-content flex items-center gap-2">
                                        <FontAwesomeIcon icon={faChartLine} className="text-primary" />
                                        Quick Stats
                                    </h3>
                                    <div className="divider my-1"></div>

                                    {stats ? (
                                        <div className="space-y-4">
                                            {/* Total Sent */}
                                            <div className="flex items-center justify-between p-3 bg-error/10 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <FontAwesomeIcon
                                                        icon={faArrowUp}
                                                        className="text-error"
                                                    />
                                                    <span className="text-sm font-medium text-base-content">
                                                        Total Sent
                                                    </span>
                                                </div>
                                                <span className="font-bold text-error">
                                                    {stats.total_sent.toLocaleString()}
                                                </span>
                                            </div>

                                            {/* Total Received */}
                                            <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <FontAwesomeIcon
                                                        icon={faArrowDown}
                                                        className="text-success"
                                                    />
                                                    <span className="text-sm font-medium text-base-content">
                                                        Total Received
                                                    </span>
                                                </div>
                                                <span className="font-bold text-success">
                                                    {stats.total_received.toLocaleString()}
                                                </span>
                                            </div>

                                            {/* Net Balance */}
                                            <div className="flex items-center justify-between p-3 bg-info/10 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <FontAwesomeIcon
                                                        icon={faChartLine}
                                                        className="text-info"
                                                    />
                                                    <span className="text-sm font-medium text-base-content">
                                                        Net Balance
                                                    </span>
                                                </div>
                                                <span className={`font-bold ${stats.net_balance >= 0 ? 'text-success' : 'text-error'}`}>
                                                    {stats.net_balance >= 0 ? '+' : ''}{stats.net_balance.toLocaleString()}
                                                </span>
                                            </div>

                                            {/* Transaction Count */}
                                            <div className="stats stats-vertical w-full bg-base-200 shadow">
                                                <div className="stat py-3">
                                                    <div className="stat-title text-xs">Sent</div>
                                                    <div className="stat-value text-2xl text-error">
                                                        {stats.transaction_count_sent}
                                                    </div>
                                                </div>
                                                <div className="stat py-3">
                                                    <div className="stat-title text-xs">Received</div>
                                                    <div className="stat-value text-2xl text-success">
                                                        {stats.transaction_count_received}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center py-8">
                                            <span className="loading loading-spinner loading-md"></span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Info Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="card bg-base-100 shadow border border-base-300 hover:shadow-lg transition-shadow">
                                <div className="card-body">
                                    <h3 className="card-title text-sm text-base-content/70">
                                        What are Brush Drips?
                                    </h3>
                                    <p className="text-sm text-base-content/60">
                                        Brush Drips are ArtChive's internal currency used to support artists, praise posts, and award trophies.
                                    </p>
                                </div>
                            </div>

                            <div className="card bg-base-100 shadow border border-base-300 hover:shadow-lg transition-shadow">
                                <div className="card-body">
                                    <h3 className="card-title text-sm text-base-content/70">
                                        How to Earn?
                                    </h3>
                                    <p className="text-sm text-base-content/60">
                                        Receive Brush Drips when others praise your posts or award you trophies for your amazing artwork!
                                    </p>
                                </div>
                            </div>

                            <div className="card bg-base-100 shadow border border-base-300 hover:shadow-lg transition-shadow">
                                <div className="card-body">
                                    <h3 className="card-title text-sm text-base-content/70">
                                        How to Spend?
                                    </h3>
                                    <p className="text-sm text-base-content/60">
                                        Use Brush Drips to praise posts (1 drip) or award trophies (5-20 drips) to show appreciation!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )
                }
            </MainLayout>
            <BuyBrushDripsModal
                isOpen={showBuyModal}
                onClose={() => setShowBuyModal(false)}
                onSuccess={handleBuySuccess}
            />
        </>
    );
}

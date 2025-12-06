import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@context/auth-context";
import { core } from "@lib/api";
import { toast } from "@utils/toast.util";
import { handleApiError, formatErrorForToast } from "@utils";
import { defaultErrors } from "@errors";
import type { BrushDripTransaction, TransactionsResponse } from "@types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowUp,
  faArrowDown,
  faFilter,
  faDownload,
  faTrophy,
  faHandsClapping,
  faExchangeAlt,
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { MainLayout } from "../common/layout";
import { LoadingSpinner } from "../loading-spinner";

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<BrushDripTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "sent" | "received">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [pagination, setPagination] = useState({
    currentPage: 1,
    hasNext: false,
    hasPrevious: false,
    totalCount: 0,
    totalPages: 0,
  });

  useEffect(() => {
    fetchTransactions(1);
  }, [filter, typeFilter]);

  const fetchTransactions = async (page: number) => {
    try {
      setLoading(true);

      let url = "brushdrips/transactions/my/";
      const params: any = { page, page_size: 20 };

      if (filter === "sent") {
        params.sent_only = true;
      } else if (filter === "received") {
        params.received_only = true;
      }

      if (typeFilter !== "all") {
        params.transaction_type = typeFilter;
      }

      const response = await core.get<TransactionsResponse>(url, { params });

      // Handle paginated response
      const newTransactions = response.data.results || [];
      setTransactions(newTransactions);

      // Handle pagination data
      const totalCount = response.data.count || 0;
      const totalPages = Math.ceil(totalCount / 20);

      setPagination({
        currentPage: page,
        hasNext: response.data.next !== null,
        hasPrevious: response.data.previous !== null,
        totalCount: totalCount,
        totalPages: totalPages,
      });

      // Scroll to top of page
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Transactions fetch error:", error);
      const message = handleApiError(error, defaultErrors, true, true);
      toast.error('Failed to load transactions', formatErrorForToast(message));
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    if (pagination.hasNext) {
      fetchTransactions(pagination.currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (pagination.hasPrevious) {
      fetchTransactions(pagination.currentPage - 1);
    }
  };

  const handlePageClick = (page: number) => {
    fetchTransactions(page);
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
    const { currentPage, totalPages } = pagination;

    if (totalPages <= 7) {
      // Show all pages if total is 7 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push(-1); // Ellipsis
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push(-1); // Ellipsis
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "praise":
        return faHandsClapping;
      case "trophy":
        return faTrophy;
      case "gallery_award":
        return faTrophy; // Use trophy icon for gallery awards
      case "critique":
        return faExchangeAlt;
      case "gallery_critique":
        return faExchangeAlt; // Use exchange icon for gallery critiques
      default:
        return faExchangeAlt;
    }
  };

  const getTransactionTypeDisplay = (type: string) => {
    return type.split("_").map((word) =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <>
      <MainLayout>

        {loading && transactions.length === 0 ? (
          <LoadingSpinner text={"Your tight-lipped transactions are loading... (´･з･)"} />
        ) : (
          <div className="container max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
              <Link
                to="/drips"
                className="btn btn-ghost btn-sm mb-4 gap-2"
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                Back to Wallet
              </Link>
              <h1 className="text-4xl font-bold text-base-content mb-2">
                Transaction History
              </h1>
              <p className="text-base-content/60">
                View all your Brush Drips transactions
              </p>
            </div>

            {/* Filters */}
            <div className="card bg-base-100 shadow-xl border border-base-300 mb-6">
              <div className="card-body">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faFilter} className="text-primary" />
                    <span className="font-semibold">Filters</span>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {/* Direction Filter */}
                    <div className="join">
                      <button
                        className={`join-item btn btn-sm ${filter === "all" ? "btn-primary" : "btn-outline"
                          }`}
                        onClick={() => setFilter("all")}
                      >
                        All
                      </button>
                      <button
                        className={`join-item btn btn-sm ${filter === "sent" ? "btn-error" : "btn-outline"
                          }`}
                        onClick={() => setFilter("sent")}
                      >
                        <FontAwesomeIcon icon={faArrowUp} className="mr-1" />
                        Sent
                      </button>
                      <button
                        className={`join-item btn btn-sm ${filter === "received" ? "btn-success" : "btn-outline"
                          }`}
                        onClick={() => setFilter("received")}
                      >
                        <FontAwesomeIcon icon={faArrowDown} className="mr-1" />
                        Received
                      </button>
                    </div>

                    {/* Type Filter */}
                    <select
                      className="select select-bordered select-sm"
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                    >
                      <option value="all">All Types</option>
                      <option value="praise">Praise</option>
                      <option value="trophy">Trophy</option>
                      <option value="gallery_award">Gallery Award</option>
                      <option value="critique">Critique</option>
                      <option value="gallery_critique">Gallery Critique</option>
                    </select>

                    {/* Export Button (Future feature) */}
                    <button
                      className="btn btn-outline btn-sm gap-2"
                      disabled
                      title="Export feature coming soon"
                    >
                      <FontAwesomeIcon icon={faDownload} />
                      Export
                    </button>
                  </div>
                </div>

                {/* Results Count */}
                <div className="text-sm text-base-content/60">
                  Showing {transactions.length > 0 ? (pagination.currentPage - 1) * 20 + 1 : 0} -{" "}
                  {Math.min(pagination.currentPage * 20, pagination.totalCount)} of{" "}
                  {pagination.totalCount} transactions
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="card bg-base-100 shadow-xl border border-base-300 mb-6">
              <div className="card-body p-0">
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-zebra">
                      <thead className="bg-base-200">
                        <tr>
                          <th className="text-base-content">Date & Time</th>
                          <th className="text-base-content">Type</th>
                          <th className="text-base-content">From/To</th>
                          <th className="text-base-content text-right">Amount</th>
                          <th className="text-base-content text-center">Direction</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-12">
                              <div className="flex flex-col items-center gap-3">
                                <div className="text-6xl">💸</div>
                                <p className="text-base-content/60">No transactions found</p>
                                <p className="text-sm text-base-content/40">
                                  Start praising posts or awarding trophies!
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          transactions.map((transaction) => {
                            const isSent = transaction.transacted_by === user?.id;
                            const otherUser = isSent
                              ? {
                                username: transaction.transacted_to_username,
                                picture: transaction.transacted_to_profile_picture,
                              }
                              : {
                                username: transaction.transacted_by_username,
                                picture: transaction.transacted_by_profile_picture,
                              };

                            return (
                              <tr key={transaction.drip_id} className="hover">
                                <td>
                                  <div className="flex flex-col">
                                    <span className="font-medium text-sm">
                                      {formatDate(transaction.transacted_at)}
                                    </span>
                                    <span className="text-xs text-base-content/60">
                                      ID: {transaction.drip_id.substring(0, 8)}...
                                    </span>
                                  </div>
                                </td>

                                <td>
                                  <div className="flex items-center gap-2">
                                    <FontAwesomeIcon
                                      icon={getTransactionIcon(transaction.transaction_object_type)}
                                      className="text-primary"
                                    />
                                    <span className="font-medium">
                                      {getTransactionTypeDisplay(transaction.transaction_object_type)}
                                    </span>
                                  </div>
                                </td>

                                <td>
                                  <div className="flex items-center gap-3">
                                    <div className="avatar">
                                      <div className="w-10 h-10 rounded-full ring ring-base-300 ring-offset-base-100 ring-offset-1">
                                        <img
                                          src={otherUser.picture}
                                          alt={otherUser.username}
                                        />
                                      </div>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-medium">@{otherUser.username}</span>
                                      <span className="text-xs text-base-content/60">
                                        {isSent ? "Recipient" : "Sender"}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                <td className="text-right">
                                  <span
                                    className={`font-bold text-lg ${isSent ? "text-error" : "text-success"
                                      }`}
                                  >
                                    {isSent ? "-" : "+"}{transaction.amount}
                                  </span>
                                </td>

                                <td className="text-center">
                                  <div
                                    className={`badge ${isSent
                                      ? "badge-error gap-1"
                                      : "badge-success gap-1"
                                      }`}
                                  >
                                    <FontAwesomeIcon
                                      icon={isSent ? faArrowUp : faArrowDown}
                                      className="text-xs"
                                    />
                                    {isSent ? "Sent" : "Received"}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Pagination Controls */}
            {!loading && transactions.length > 0 && pagination.totalPages > 1 && (
              <div className="card bg-base-100 shadow-xl border border-base-300">
                <div className="card-body">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Page Info */}
                    <div className="text-sm text-base-content/60">
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </div>

                    {/* Pagination Buttons */}
                    <div className="join">
                      {/* Previous Button */}
                      <button
                        className="join-item btn btn-sm"
                        onClick={handlePreviousPage}
                        disabled={!pagination.hasPrevious}
                      >
                        <FontAwesomeIcon icon={faChevronLeft} />
                      </button>

                      {/* Page Numbers */}
                      {getPageNumbers().map((pageNum, index) => {
                        if (pageNum === -1) {
                          // Ellipsis
                          return (
                            <button
                              key={`ellipsis-${index}`}
                              className="join-item btn btn-sm btn-disabled"
                            >
                              ...
                            </button>
                          );
                        }

                        return (
                          <button
                            key={pageNum}
                            className={`join-item btn btn-sm ${pagination.currentPage === pageNum
                              ? "btn-primary"
                              : ""
                              }`}
                            onClick={() => handlePageClick(pageNum)}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      {/* Next Button */}
                      <button
                        className="join-item btn btn-sm"
                        onClick={handleNextPage}
                        disabled={!pagination.hasNext}
                      >
                        <FontAwesomeIcon icon={faChevronRight} />
                      </button>
                    </div>

                    {/* Quick Jump (Optional) */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-base-content/60">Go to:</span>
                      <input
                        type="number"
                        min="1"
                        max={pagination.totalPages}
                        placeholder={pagination.currentPage.toString()}
                        className="input input-bordered input-sm w-20"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const page = parseInt(e.currentTarget.value);
                            if (page >= 1 && page <= pagination.totalPages) {
                              handlePageClick(page);
                              e.currentTarget.value = "";
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
        }
      </MainLayout>
    </>
  );
}

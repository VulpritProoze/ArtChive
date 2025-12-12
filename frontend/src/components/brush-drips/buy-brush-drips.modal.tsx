import { useState } from "react";
import { core } from "@lib/api";
import { toast } from "@utils/toast.util";
import { handleApiError, formatErrorForToast } from "@utils";
import { defaultErrors } from "@errors";
import type { BrushDripWallet } from "@types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCoins, faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";

interface BuyBrushDripsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (wallet: BrushDripWallet) => void;
}

const PRESET_AMOUNTS = [100, 500, 1000, 5000, 10000];

export default function BuyBrushDripsModal({ isOpen, onClose, onSuccess }: BuyBrushDripsModalProps) {
    const [amount, setAmount] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) {
        return null;
    }

    const handleClose = () => {
        if (isSubmitting) return;
        setAmount("");
        onClose();
    };

    const handlePresetClick = (presetAmount: number) => {
        setAmount(presetAmount.toString());
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const amountNum = parseInt(amount, 10);
        if (!amountNum || amountNum <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        if (amountNum > 1000000) {
            toast.error("Amount cannot exceed 1,000,000 brush drips");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await core.post("brushdrips/buy/", {
                amount: amountNum,
            });
            
            toast.success("Brush Drips Purchased", `Successfully purchased ${amountNum.toLocaleString()} brush drips!`);
            onSuccess(response.data);
            handleClose();
        } catch (error) {
            console.error("Buy brush drips error:", error);
            const message = handleApiError(error, defaultErrors, true, true);
            toast.error('Failed to purchase brush drips', formatErrorForToast(message));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div className="modal modal-open animate-fade-in z-[100]">
                <div
                    className="fixed inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70 backdrop-blur-lg transition-all duration-300"
                    onClick={handleClose}
                ></div>

                {/* Modal Content */}
                <div className="modal-box max-w-md p-0 overflow-hidden relative bg-base-100 rounded-3xl shadow-2xl animate-scale-in border border-base-300/50">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-base-300 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <FontAwesomeIcon icon={faCoins} className="text-primary text-xl" />
                            </div>
                            <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                                Buy Brush Drips
                            </h2>
                        </div>
                        {!isSubmitting && (
                            <button
                                type="button"
                                onClick={handleClose}
                                className="btn btn-circle btn-ghost btn-sm hover:bg-error/10 hover:text-error transition-all duration-200 hover:rotate-90"
                                aria-label="Close"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Warning Banner */}
                    <div className="px-6 pt-4">
                        <div className="alert alert-warning border-warning/50 bg-warning/10">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="text-warning" />
                            <div>
                                <h3 className="font-bold text-sm">Testing Only</h3>
                                <div className="text-xs opacity-80">
                                    This feature is for testing purposes only. No actual payment is processed.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <form onSubmit={handleSubmit} className="px-6 py-6">
                        <div className="space-y-4">
                            {/* Amount Input */}
                            <div>
                                <label className="label">
                                    <span className="label-text font-semibold">Amount</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="1000000"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    className="input input-bordered w-full"
                                    disabled={isSubmitting}
                                    required
                                />
                                <label className="label">
                                    <span className="label-text-alt text-base-content/60">
                                        Maximum: 1,000,000 brush drips
                                    </span>
                                </label>
                            </div>

                            {/* Preset Amounts */}
                            <div>
                                <label className="label">
                                    <span className="label-text font-semibold">Quick Select</span>
                                </label>
                                <div className="grid grid-cols-5 gap-2">
                                    {PRESET_AMOUNTS.map((preset) => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => handlePresetClick(preset)}
                                            className={`btn btn-sm ${
                                                amount === preset.toString()
                                                    ? "btn-primary"
                                                    : "btn-outline"
                                            }`}
                                            disabled={isSubmitting}
                                        >
                                            {preset >= 1000 ? `${preset / 1000}k` : preset}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Info */}
                            <div className="bg-base-200 rounded-lg p-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-base-content/70">You will receive:</span>
                                    <span className="font-bold text-primary text-lg">
                                        {amount ? parseInt(amount, 10).toLocaleString() : "0"} Brush Drips
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-6">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="btn btn-ghost flex-1"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary flex-1"
                                disabled={isSubmitting || !amount || parseInt(amount, 10) <= 0}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm"></span>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faCoins} />
                                        Buy Now
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}


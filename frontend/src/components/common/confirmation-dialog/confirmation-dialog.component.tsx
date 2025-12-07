import React from 'react';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'info',
  isLoading = false,
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      confirmButton: 'btn-error',
      icon: '⚠️',
      iconBg: 'bg-error/20',
      iconColor: 'text-error',
    },
    warning: {
      confirmButton: 'btn-warning',
      icon: '⚠️',
      iconBg: 'bg-warning/20',
      iconColor: 'text-warning',
    },
    info: {
      confirmButton: 'btn-primary',
      icon: 'ℹ️',
      iconBg: 'bg-primary/20',
      iconColor: 'text-primary',
    },
  };

  const styles = variantStyles[variant];

  return (
    <>
      {/* Enhanced Backdrop with Animation */}
      <div className="modal modal-open animate-fade-in z-[100]">
        <div
          className="fixed inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70 backdrop-blur-lg transition-all duration-300"
          onClick={!isLoading ? onCancel : undefined}
        ></div>

        {/* Enhanced Modal Content with Scale Animation */}
        <div className="modal-box max-w-md p-0 overflow-hidden relative bg-base-100 rounded-3xl shadow-2xl animate-scale-in border border-base-300/50">
          {/* Modern Top Bar with Gradient */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-base-300 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${styles.iconBg}`}>
                <span className="text-2xl">{styles.icon}</span>
              </div>
              {title && (
                <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {title}
                </h2>
              )}
            </div>
            {!isLoading && (
              <button
                type="button"
                onClick={onCancel}
                className="btn btn-circle btn-ghost btn-sm hover:bg-error/10 hover:text-error transition-all duration-200 hover:rotate-90"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <p className="text-base-content text-base leading-relaxed whitespace-pre-wrap">
              {message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-base-300 bg-base-200/30">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="btn btn-outline btn-sm min-w-[100px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`btn ${styles.confirmButton} btn-sm min-w-[100px] disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}


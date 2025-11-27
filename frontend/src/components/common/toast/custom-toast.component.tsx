import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { type ToastContentProps } from 'react-toastify';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface CustomToastProps extends Partial<ToastContentProps> {
  type: ToastType;
  message: string;
  description?: string;
}

export const CustomToast = ({ type, message, description, closeToast }: CustomToastProps) => {
  const iconMap = {
    success: <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-success" />,
    error: <XCircle className="w-6 h-6 flex-shrink-0 text-error" />,
    warning: <AlertCircle className="w-6 h-6 flex-shrink-0 text-warning" />,
    info: <Info className="w-6 h-6 flex-shrink-0 text-info" />,
  };

  const bgColorMap = {
    success: 'bg-success/10 border-success/30',
    error: 'bg-error/10 border-error/30',
    warning: 'bg-warning/10 border-warning/30',
    info: 'bg-info/10 border-info/30',
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${bgColorMap[type]} backdrop-blur-sm w-[400px]`}>
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">{iconMap[type]}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-base-content text-sm mb-0.5">{message}</p>
        {description && <p className="text-xs text-base-content/70">{description}</p>}
      </div>

      {/* Close Button */}
      <button
        onClick={closeToast}
        className="flex-shrink-0 text-base-content/40 hover:text-base-content transition-colors"
        aria-label="Close"
      >
        <X className="w-4 h-4 flex-shrink-0" />
      </button>
    </div>
  );
};

// Helper functions to create toasts with custom styling
export const createToast = {
  success: (message: string, description?: string) => ({
    type: 'success' as ToastType,
    message,
    description,
  }),
  error: (message: string, description?: string) => ({
    type: 'error' as ToastType,
    message,
    description,
  }),
  warning: (message: string, description?: string) => ({
    type: 'warning' as ToastType,
    message,
    description,
  }),
  info: (message: string, description?: string) => ({
    type: 'info' as ToastType,
    message,
    description,
  }),
};

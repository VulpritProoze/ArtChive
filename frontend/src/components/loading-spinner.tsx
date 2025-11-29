// Full-screen centered loading spinner (your original)
export function LoadingSpinner({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen p-8">
      <span className="loading loading-spinner loading-lg text-primary"></span>
      {text && <p className="mt-4 text-sm opacity-70">{text}</p>}
    </div>
  );
}

// Simple loading spinner component - just spinner and text
interface SimpleLoadingSpinnerProps {
  text?: string;
  spinnerSize?: 'xs' | 'sm' | 'md' | 'lg';
  textSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
}

export function SimpleLoadingSpinner({ 
  text, 
  spinnerSize = 'lg',
  textSize = 'sm'
}: SimpleLoadingSpinnerProps) {
  const spinnerSizeClass = `loading-${spinnerSize}`;
  const textSizeClass = `text-${textSize}`;
  
  return (
    <div className="flex flex-col items-center gap-2">
      <span className={`loading loading-spinner ${spinnerSizeClass} text-primary`}></span>
      {text && <p className={`${textSizeClass} opacity-70`}>{text}</p>}
    </div>
  );
}

// Loading overlay with blurred background - wraps around page content
interface LoadingOverlayProps {
  children: React.ReactNode;
  isLoading: boolean;
  loadingText?: string;
}

export function LoadingOverlay({ children, isLoading, loadingText }: LoadingOverlayProps) {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Page content - always rendered */}
      <div className={isLoading ? 'pointer-events-none' : ''}>
        {children}
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Blurred backdrop */}
          <div className="absolute inset-0 bg-base-100/10 backdrop-blur-md" />

          {/* Loading content - simple and clean */}
          <div className="relative z-10 flex flex-col items-center gap-4">
            {/* Simple spinner */}
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>

            {/* Loading text */}
            {loadingText && (
              <p className="text-base font-medium text-base-content/80">
                {loadingText}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
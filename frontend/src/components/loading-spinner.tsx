// Full-screen centered loading spinner (your original)
export function LoadingSpinner({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen p-8">
      <span className="loading loading-spinner loading-lg text-primary"></span>
      {text && <p className="mt-4 text-sm opacity-70">{text}</p>}
    </div>
  );
}

// Enhanced loading spinner with ArtChive logo
interface ArtChiveLoadingSpinnerProps {
  text?: string;
  logoSize?: 'sm' | 'md' | 'lg' | 'xl';
}

export function ArtChiveLoadingSpinner({ 
  text, 
  logoSize = 'lg' 
}: ArtChiveLoadingSpinnerProps) {
  const logoSizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-40 h-40'
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen p-8 bg-gradient-to-br from-base-100 via-base-200/50 to-base-100 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 animate-pulse"></div>
      
      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo with subtle pulse animation */}
        <div className="relative mb-8">
          <img 
            src="/logo/mainLogo.png" 
            alt="ArtChive Logo" 
            className={`${logoSizeClasses[logoSize]} object-contain drop-shadow-2xl animate-pulse`}
            style={{ 
              filter: 'drop-shadow(0 10px 25px rgba(0, 0, 0, 0.2))',
              animationDuration: '2s'
            }}
          />
        </div>

        {/* Loading text */}
        {text && (
          <p className="text-base font-medium text-base-content/80">
            {text}
          </p>
        )}

        {/* Simple animated dots */}
        <div className="flex gap-2 mt-6">
          <div 
            className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" 
            style={{ animationDelay: '0s', animationDuration: '1.4s' }}
          ></div>
          <div 
            className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" 
            style={{ animationDelay: '0.2s', animationDuration: '1.4s' }}
          ></div>
          <div 
            className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" 
            style={{ animationDelay: '0.4s', animationDuration: '1.4s' }}
          ></div>
        </div>
      </div>
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
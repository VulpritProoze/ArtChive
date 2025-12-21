/**
 * React hook for screenshot prevention
 */

import { useEffect } from 'react';
import {
  enableScreenshotPrevention,
  disableScreenshotPrevention,
  isScreenshotPreventionEnabled,
} from '@utils/screenshot-prevention.util';

interface UseScreenshotPreventionOptions {
  /** Enable screenshot prevention */
  enabled?: boolean;
  /** Disable right-click */
  disableRightClick?: boolean;
  /** Disable keyboard shortcuts */
  disableKeyboardShortcuts?: boolean;
  /** Detect DevTools */
  detectDevTools?: boolean;
  /** Detect screen capture */
  detectScreenCapture?: boolean;
  /** Disable text selection */
  disableTextSelection?: boolean;
  /** Disable drag */
  disableDrag?: boolean;
  /** Show warning message */
  showWarning?: boolean;
  /** Custom warning message */
  warningMessage?: string;
}

/**
 * Hook to enable/disable screenshot prevention
 * 
 * @param options - Configuration options
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   useScreenshotPrevention({ enabled: true });
 *   return <div>Protected content</div>;
 * }
 * ```
 */
export function useScreenshotPrevention(
  options: UseScreenshotPreventionOptions = {}
): void {
  const {
    enabled = true,
    disableRightClick,
    disableKeyboardShortcuts,
    detectDevTools,
    detectScreenCapture,
    disableTextSelection,
    disableDrag,
    showWarning,
    warningMessage,
  } = options;

  useEffect(() => {
    if (enabled) {
      enableScreenshotPrevention({
        disableRightClick,
        disableKeyboardShortcuts,
        detectDevTools,
        detectScreenCapture,
        disableTextSelection,
        disableDrag,
        showWarning,
        warningMessage,
      });

      return () => {
        disableScreenshotPrevention();
      };
    } else {
      disableScreenshotPrevention();
    }
  }, [
    enabled,
    disableRightClick,
    disableKeyboardShortcuts,
    detectDevTools,
    detectScreenCapture,
    disableTextSelection,
    disableDrag,
    showWarning,
    warningMessage,
  ]);
}

/**
 * Check if screenshot prevention is currently enabled
 */
export function useIsScreenshotPreventionEnabled(): boolean {
  return isScreenshotPreventionEnabled();
}


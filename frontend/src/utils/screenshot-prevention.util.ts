/**
 * Screenshot Prevention Utility
 * 
 * Implements multiple layers of protection to prevent screenshots:
 * - Disables right-click context menu
 * - Blocks keyboard shortcuts (Print Screen, Ctrl+P, Ctrl+S, etc.)
 * - Detects DevTools opening
 * - Detects screen capture APIs
 * - Prevents text selection and dragging
 * - Adds visual protection overlays
 */

interface ScreenshotPreventionConfig {
  /** Enable right-click prevention */
  disableRightClick?: boolean;
  /** Enable keyboard shortcut blocking */
  disableKeyboardShortcuts?: boolean;
  /** Enable DevTools detection */
  detectDevTools?: boolean;
  /** Enable screen capture detection */
  detectScreenCapture?: boolean;
  /** Enable text selection prevention */
  disableTextSelection?: boolean;
  /** Enable drag prevention */
  disableDrag?: boolean;
  /** Show warning message when screenshot attempt detected */
  showWarning?: boolean;
  /** Custom warning message */
  warningMessage?: string;
}

const DEFAULT_CONFIG: Required<ScreenshotPreventionConfig> = {
  disableRightClick: true,
  disableKeyboardShortcuts: true,
  detectDevTools: true,
  detectScreenCapture: true,
  disableTextSelection: true,
  disableDrag: true,
  showWarning: true,
  warningMessage: 'Screenshots are not allowed on this website.',
};

class ScreenshotPrevention {
  private config: Required<ScreenshotPreventionConfig>;
  public isEnabled: boolean = false;
  private eventHandlers: Map<string, EventListener> = new Map();
  private devToolsCheckInterval: number | null = null;
  private overlayElement: HTMLDivElement | null = null;
  private originalGetDisplayMedia: ((constraints?: MediaStreamConstraints) => Promise<MediaStream>) | null = null;
  private originalGetUserMedia: ((constraints?: MediaStreamConstraints) => Promise<MediaStream>) | null = null;

  constructor(config: ScreenshotPreventionConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Enable screenshot prevention
   */
  enable(): void {
    if (this.isEnabled) return;
    this.isEnabled = true;

    if (this.config.disableRightClick) {
      this.setupRightClickPrevention();
    }

    if (this.config.disableKeyboardShortcuts) {
      this.setupKeyboardShortcutPrevention();
    }

    if (this.config.detectDevTools) {
      this.setupDevToolsDetection();
    }

    if (this.config.detectScreenCapture) {
      this.setupScreenCaptureDetection();
    }

    if (this.config.disableTextSelection) {
      this.setupTextSelectionPrevention();
    }

    if (this.config.disableDrag) {
      this.setupDragPrevention();
    }

    this.addProtectionStyles();
  }

  /**
   * Disable screenshot prevention
   */
  disable(): void {
    if (!this.isEnabled) return;
    this.isEnabled = false;

    // Remove all event listeners
    this.eventHandlers.forEach((handler, event) => {
      document.removeEventListener(event, handler);
      window.removeEventListener(event, handler);
    });
    this.eventHandlers.clear();

    // Clear DevTools check interval
    if (this.devToolsCheckInterval !== null) {
      clearInterval(this.devToolsCheckInterval);
      this.devToolsCheckInterval = null;
    }

    // Remove overlay
    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }

    // Restore original media device methods
    if (navigator.mediaDevices) {
      if (this.originalGetDisplayMedia) {
        try {
          Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', {
            value: this.originalGetDisplayMedia,
            writable: true,
            configurable: true,
          });
        } catch (error) {
          (navigator.mediaDevices as any).getDisplayMedia = this.originalGetDisplayMedia;
        }
        this.originalGetDisplayMedia = null;
      }

      if (this.originalGetUserMedia) {
        try {
          Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
            value: this.originalGetUserMedia,
            writable: true,
            configurable: true,
          });
        } catch (error) {
          (navigator.mediaDevices as any).getUserMedia = this.originalGetUserMedia;
        }
        this.originalGetUserMedia = null;
      }
    }

    // Remove protection styles
    this.removeProtectionStyles();
  }

  /**
   * Setup right-click prevention
   */
  private setupRightClickPrevention(): void {
    const handler = (e: MouseEvent) => {
      if (e.button === 2 || e.type === 'contextmenu') {
        e.preventDefault();
        e.stopPropagation();
        this.showWarning();
        return false;
      }
    };

    document.addEventListener('contextmenu', handler);
    document.addEventListener('mousedown', handler);
    this.eventHandlers.set('contextmenu', handler);
    this.eventHandlers.set('mousedown', handler);
  }

  /**
   * Setup keyboard shortcut prevention
   */
  private setupKeyboardShortcutPrevention(): void {
    const handler = (e: KeyboardEvent) => {
      // Print Screen key
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        this.showWarning();
        return false;
      }

      // Ctrl+P (Print)
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        e.stopPropagation();
        this.showWarning();
        return false;
      }

      // Ctrl+S (Save)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        e.stopPropagation();
        this.showWarning();
        return false;
      }

      // Ctrl+Shift+I (DevTools) - Only block if DevTools detection is enabled
      if (this.config.detectDevTools && e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        e.stopPropagation();
        this.showWarning();
        return false;
      }

      // Ctrl+Shift+C (Element Inspector) - Only block if DevTools detection is enabled
      if (this.config.detectDevTools && e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        e.stopPropagation();
        this.showWarning();
        return false;
      }

      // Ctrl+Shift+J (Console) - Only block if DevTools detection is enabled
      if (this.config.detectDevTools && e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        e.stopPropagation();
        this.showWarning();
        return false;
      }

      // F12 (DevTools) - Only block if DevTools detection is enabled
      if (this.config.detectDevTools && (e.key === 'F12' || e.keyCode === 123)) {
        e.preventDefault();
        e.stopPropagation();
        this.showWarning();
        return false;
      }

      // Ctrl+U (View Source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        e.stopPropagation();
        this.showWarning();
        return false;
      }
    };

    document.addEventListener('keydown', handler);
    document.addEventListener('keyup', handler);
    this.eventHandlers.set('keydown', handler);
    this.eventHandlers.set('keyup', handler);
  }

  /**
   * Setup DevTools detection
   */
  private setupDevToolsDetection(): void {
    let devToolsOpen = false;
    const threshold = 160;

    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;

      if (widthThreshold || heightThreshold) {
        if (!devToolsOpen) {
          devToolsOpen = true;
          this.showWarning();
          // Optionally blur the page when DevTools is detected
          document.body.style.filter = 'blur(5px)';
        }
      } else {
        if (devToolsOpen) {
          devToolsOpen = false;
          document.body.style.filter = '';
        }
      }
    };

    this.devToolsCheckInterval = window.setInterval(checkDevTools, 500);

    // Also check on resize
    const resizeHandler = () => {
      checkDevTools();
    };
    window.addEventListener('resize', resizeHandler);
    this.eventHandlers.set('resize', resizeHandler);
  }

  /**
   * Setup screen capture detection
   */
  private setupScreenCaptureDetection(): void {
    // Detect getDisplayMedia API usage
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      this.originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(
        navigator.mediaDevices
      );

      try {
        Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', {
          value: async (_constraints?: MediaStreamConstraints) => {
            this.showWarning();
            throw new Error('Screen capture is not allowed');
          },
          writable: true,
          configurable: true,
        });
      } catch (error) {
        // If we can't override, try direct assignment
        (navigator.mediaDevices as any).getDisplayMedia = async () => {
          this.showWarning();
          throw new Error('Screen capture is not allowed');
        };
      }
    }

    // Detect screen sharing in WebRTC
    if (navigator.mediaDevices?.getUserMedia) {
      this.originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(
        navigator.mediaDevices
      );

      try {
        Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
          value: async (constraints?: MediaStreamConstraints) => {
            if (constraints?.video) {
              // Check if it's screen capture attempt
              const videoConstraints = constraints.video as MediaTrackConstraints;
              if (
                videoConstraints.displaySurface === 'screen' ||
                videoConstraints.displaySurface === 'window' ||
                videoConstraints.displaySurface === 'browser'
              ) {
                this.showWarning();
                throw new Error('Screen capture is not allowed');
              }
            }
            return this.originalGetUserMedia!.call(navigator.mediaDevices, constraints);
          },
          writable: true,
          configurable: true,
        });
      } catch (error) {
        // If we can't override, try direct assignment
        const original = this.originalGetUserMedia;
        (navigator.mediaDevices as any).getUserMedia = async (constraints?: MediaStreamConstraints) => {
          if (constraints?.video) {
            const videoConstraints = constraints.video as MediaTrackConstraints;
            if (
              videoConstraints.displaySurface === 'screen' ||
              videoConstraints.displaySurface === 'window' ||
              videoConstraints.displaySurface === 'browser'
            ) {
              this.showWarning();
              throw new Error('Screen capture is not allowed');
            }
          }
          return original!.call(navigator.mediaDevices, constraints);
        };
      }
    }
  }

  /**
   * Setup text selection prevention
   */
  private setupTextSelectionPrevention(): void {
    const handler = (e: Event) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('selectstart', handler);
    document.addEventListener('dragstart', handler);
    this.eventHandlers.set('selectstart', handler);
    this.eventHandlers.set('dragstart', handler);
  }

  /**
   * Setup drag prevention
   */
  private setupDragPrevention(): void {
    const handler = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    document.addEventListener('drag', handler);
    document.addEventListener('dragstart', handler);
    document.addEventListener('dragend', handler);
    this.eventHandlers.set('drag', handler);
    this.eventHandlers.set('dragstart', handler);
    this.eventHandlers.set('dragend', handler);
  }

  /**
   * Add CSS styles for protection
   */
  private addProtectionStyles(): void {
    const styleId = 'screenshot-prevention-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Prevent text selection */
      * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }

      /* Prevent image dragging */
      img {
        -webkit-user-drag: none !important;
        -khtml-user-drag: none !important;
        -moz-user-drag: none !important;
        -o-user-drag: none !important;
        user-drag: none !important;
        pointer-events: auto !important;
      }

      /* Prevent context menu */
      * {
        -webkit-tap-highlight-color: transparent !important;
      }

      /* Disable copy/paste */
      * {
        -webkit-touch-callout: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Remove protection styles
   */
  private removeProtectionStyles(): void {
    const style = document.getElementById('screenshot-prevention-styles');
    if (style) {
      style.remove();
    }
  }

  /**
   * Show warning message
   */
  private showWarning(): void {
    if (!this.config.showWarning) return;

    // Create or update overlay
    if (!this.overlayElement) {
      this.overlayElement = document.createElement('div');
      this.overlayElement.id = 'screenshot-prevention-warning';
      this.overlayElement.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        color: #ff4444;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        font-family: Arial, sans-serif;
        font-size: 24px;
        font-weight: bold;
        text-align: center;
        padding: 20px;
        box-sizing: border-box;
      `;
      document.body.appendChild(this.overlayElement);
    }

    this.overlayElement.textContent = this.config.warningMessage;

    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (this.overlayElement) {
        this.overlayElement.style.opacity = '0';
        this.overlayElement.style.transition = 'opacity 0.5s';
        setTimeout(() => {
          if (this.overlayElement) {
            this.overlayElement.remove();
            this.overlayElement = null;
          }
        }, 500);
      }
    }, 3000);
  }
}

// Singleton instance
let preventionInstance: ScreenshotPrevention | null = null;

/**
 * Initialize screenshot prevention
 */
export function enableScreenshotPrevention(
  config: ScreenshotPreventionConfig = {}
): void {
  if (preventionInstance) {
    preventionInstance.disable();
  }
  preventionInstance = new ScreenshotPrevention(config);
  preventionInstance.enable();
}

/**
 * Disable screenshot prevention
 */
export function disableScreenshotPrevention(): void {
  if (preventionInstance) {
    preventionInstance.disable();
    preventionInstance = null;
  }
}

/**
 * Check if screenshot prevention is enabled
 */
export function isScreenshotPreventionEnabled(): boolean {
  return preventionInstance?.isEnabled ?? false;
}


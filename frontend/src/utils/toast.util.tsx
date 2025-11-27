import { toast as reactToast } from 'react-toastify';
import { CustomToast } from '@components/common/toast';

/**
 * Custom toast utility with better styling
 * Usage examples:
 *
 * toast.success('Gallery created!', 'Your gallery has been published successfully');
 * toast.error('Failed to save', 'Please check your internet connection');
 * toast.error('Validation errors', ['Email is required', 'Password must be 8 characters']); // Multiple toasts
 * toast.warning('Unsaved changes', 'You have unsaved changes that will be lost');
 * toast.info('New feature', 'Check out our new gallery templates');
 */

// Helper function to capitalize first letter
const capitalizeFirstLetter = (text: string): string => {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// Helper function to show toast(s) - handles both single and array descriptions
const showToast = (
  type: 'success' | 'error' | 'warning' | 'info',
  message: string,
  description?: string | string[]
) => {
  const toastFn = reactToast[type];

  // If description is an array, show separate toasts for each item
  if (Array.isArray(description)) {
    description.forEach((desc, index) => {
      const capitalizedDesc = capitalizeFirstLetter(desc);
      // Add slight delay between toasts so they stack nicely
      setTimeout(() => {
        toastFn(
          <CustomToast type={type} message={message} description={capitalizedDesc} />,
          {
            icon: false,
            closeButton: false,
          }
        );
      }, index * 100); // 100ms delay between each toast
    });
  } else {
    // Single toast
    const capitalizedDesc = description ? capitalizeFirstLetter(description) : undefined;
    toastFn(
      <CustomToast type={type} message={message} description={capitalizedDesc} />,
      {
        icon: false,
        closeButton: false,
      }
    );
  }
};

export const toast = {
  success: (message: string, description?: string | string[]) => {
    showToast('success', message, description);
  },

  error: (message: string, description?: string | string[]) => {
    showToast('error', message, description);
  },

  warning: (message: string, description?: string | string[]) => {
    showToast('warning', message, description);
  },

  info: (message: string, description?: string | string[]) => {
    showToast('info', message, description);
  },
};

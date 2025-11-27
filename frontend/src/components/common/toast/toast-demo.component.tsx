import { toast } from '@utils/toast.util';

/**
 * Toast Demo Component
 *
 * This is a demo component to showcase the custom toast notifications.
 * You can add this to any page temporarily to test the toast styles.
 *
 * Usage:
 * import ToastDemo from '@components/common/toast/toast-demo.component';
 *
 * Then add <ToastDemo /> to your component
 */

export default function ToastDemo() {
  return (
    <div className="fixed bottom-8 left-8 z-50 bg-base-100 rounded-xl shadow-2xl border border-base-300 p-6 max-w-md">
      <h3 className="text-lg font-bold text-base-content mb-4">Toast Demo</h3>
      <p className="text-sm text-base-content/70 mb-4">
        Click the buttons below to test the custom toast notifications:
      </p>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => toast.success('Success!', 'Your changes have been saved successfully')}
          className="btn btn-success btn-sm"
        >
          Show Success Toast
        </button>

        <button
          onClick={() => toast.error('Error occurred', 'Unable to connect to the server. Please try again.')}
          className="btn btn-error btn-sm"
        >
          Show Error Toast
        </button>

        <button
          onClick={() => toast.warning('Warning!', 'You have unsaved changes that will be lost')}
          className="btn btn-warning btn-sm"
        >
          Show Warning Toast
        </button>

        <button
          onClick={() => toast.info('New feature', 'Check out our new gallery templates!')}
          className="btn btn-info btn-sm"
        >
          Show Info Toast
        </button>

        <hr className="border-base-300 my-2" />

        <button
          onClick={() => {
            toast.success('Gallery published!');
            toast.info('Tip: You can share this gallery with your followers');
          }}
          className="btn btn-primary btn-sm"
        >
          Show Multiple Toasts
        </button>

        <button
          onClick={() => toast.success('Simple message without description')}
          className="btn btn-ghost btn-sm"
        >
          Simple Toast (No Description)
        </button>
      </div>

      <p className="text-xs text-base-content/50 mt-4 text-center">
        Remove this component after testing
      </p>
    </div>
  );
}

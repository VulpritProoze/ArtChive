import { ToastContainer as ReactToastifyContainer } from 'react-toastify';
import { CustomToast } from './custom-toast.component';
import 'react-toastify/dist/ReactToastify.css';
import './toast-styles.css';

interface ToastContainerProps {
  theme: 'light' | 'dark';
}

export const ToastContainer = ({ theme }: ToastContainerProps) => {
  return (
    <ReactToastifyContainer
      position="top-right"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop={true}
      closeOnClick={false}
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme={theme}
      closeButton={false}
      icon={false}
      style={{
        width: 'auto',
        maxWidth: '420px',
      }}
    />
  );
};

// Export the CustomToast component for use in toast calls
export { CustomToast };

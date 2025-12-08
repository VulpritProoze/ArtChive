import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import ConfirmationDialog from '@components/common/confirmation-dialog/confirmation-dialog.component';

interface ConfirmationOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmationContextType {
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    options: ConfirmationOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmationOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setDialogState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (dialogState) {
      dialogState.resolve(true);
      setDialogState(null);
    }
  }, [dialogState]);

  const handleCancel = useCallback(() => {
    if (dialogState) {
      dialogState.resolve(false);
      setDialogState(null);
    }
  }, [dialogState]);

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      {dialogState && (
        <ConfirmationDialog
          isOpen={dialogState.isOpen}
          title={dialogState.options.title}
          message={dialogState.options.message}
          confirmText={dialogState.options.confirmText}
          cancelText={dialogState.options.cancelText}
          variant={dialogState.options.variant || 'info'}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (context === undefined) {
    throw new Error('useConfirmation must be used within a ConfirmationProvider');
  }
  return context;
}


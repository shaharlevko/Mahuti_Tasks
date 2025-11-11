import { useState } from 'react';

export function useDialog() {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    message: '',
    title: '',
    icon: '',
    type: 'confirm',
    confirmText: 'Yes',
    cancelText: 'No',
    onConfirm: null,
    onCancel: null
  });

  const showConfirm = ({ message, title, icon, confirmText, cancelText }) => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        message,
        title,
        icon,
        type: 'confirm',
        confirmText: confirmText || 'Yes',
        cancelText: cancelText || 'No',
        onConfirm: () => {
          setDialogState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setDialogState(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  };

  const showAlert = ({ message, title, icon }) => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        message,
        title,
        icon,
        type: 'alert',
        onConfirm: () => {
          setDialogState(prev => ({ ...prev, isOpen: false }));
          resolve();
        },
        onCancel: () => {
          setDialogState(prev => ({ ...prev, isOpen: false }));
          resolve();
        }
      });
    });
  };

  return {
    dialogState,
    showConfirm,
    showAlert
  };
}

import './ConfirmDialog.css';

function ConfirmDialog({
  isOpen,
  message,
  title,
  icon,
  onConfirm,
  onCancel,
  confirmText = 'Yes',
  cancelText = 'No',
  type = 'confirm' // 'confirm' or 'alert'
}) {
  if (!isOpen) return null;

  const handleOverlayClick = () => {
    if (type === 'alert' && onConfirm) {
      onConfirm();
    } else if (onCancel) {
      onCancel();
    }
  };

  const defaultIcons = {
    confirm: '❓',
    delete: '🗑️',
    alert: '⚠️',
    error: '❌',
    success: '✅',
    info: 'ℹ️'
  };

  const displayIcon = icon || (type === 'alert' ? defaultIcons.alert : defaultIcons.confirm);
  const displayTitle = title || (type === 'alert' ? 'Notice' : 'Confirm Action');

  return (
    <div className="confirm-overlay" onClick={handleOverlayClick}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-icon">{displayIcon}</div>
        <h3 className="confirm-title">{displayTitle}</h3>
        <p className="confirm-message">{message}</p>
        <div className="confirm-buttons">
          {type === 'alert' ? (
            <button className="confirm-btn confirm-yes" onClick={onConfirm}>
              OK
            </button>
          ) : (
            <>
              <button className="confirm-btn confirm-yes" onClick={onConfirm}>
                {confirmText}
              </button>
              <button className="confirm-btn confirm-no" onClick={onCancel}>
                {cancelText}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;

interface ConfirmExitDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmExitDialog({
  onConfirm,
  onCancel,
}: ConfirmExitDialogProps) {
  return (
    <div className="overlay">
      <div className="confirm-dialog">
        <h2 className="confirm-dialog__title">Uscire dalla partita?</h2>
        <p className="confirm-dialog__body">
          I progressi di questa partita andranno persi.
        </p>
        <div className="confirm-dialog__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Continua a giocare
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={onConfirm}
          >
            Esci
          </button>
        </div>
      </div>
    </div>
  );
}

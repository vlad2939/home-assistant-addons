import { useState } from "react";
import Modal from "./Modal.jsx";

/** Confirmare pentru acțiuni ireversibile. onConfirm poate fi async; erorile se afișează în fereastră. */
export default function ConfirmDialog({ open, onClose, onConfirm, title, children, confirmLabel = "Confirmă", danger = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const close = () => {
    if (busy) return;
    setError(null);
    onClose();
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title={title}>
      <div className="space-y-3">{children}</div>
      {error && <p className="mt-4 rounded-xl bg-surface-2 p-3 text-sm text-[var(--accent-red)]">{error}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" onClick={close} className="rounded-2xl border border-border px-5 py-3 font-medium hover:bg-surface-2">
          Anulează
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className={`rounded-2xl px-5 py-3 font-medium disabled:opacity-60 ${
            danger ? "bg-[var(--accent-red)] text-white" : "bg-accent text-on-accent"
          }`}
        >
          {busy ? "Se procesează…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

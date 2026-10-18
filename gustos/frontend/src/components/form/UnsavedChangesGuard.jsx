import { useEffect } from "react";
import { useBlocker } from "react-router-dom";
import ConfirmDialog from "../ConfirmDialog.jsx";

/** Avertizează la părăsirea paginii (în aplicație sau închiderea tab-ului) când există modificări nesalvate. */
export default function UnsavedChangesGuard({ when }) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => when && currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    if (!when) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [when]);

  return (
    <ConfirmDialog
      open={blocker.state === "blocked"}
      onClose={() => blocker.reset?.()}
      onConfirm={() => blocker.proceed?.()}
      title="Modificări nesalvate"
      confirmLabel="Părăsește pagina"
      danger
    >
      <p>Ai modificări care nu au fost salvate. Dacă părăsești pagina, ele se pierd.</p>
    </ConfirmDialog>
  );
}

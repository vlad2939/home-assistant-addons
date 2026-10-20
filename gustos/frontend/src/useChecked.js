import { useCallback, useEffect, useState } from "react";

function read(key) {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(key)) || []);
  } catch {
    return new Set();
  }
}

/**
 * Elemente bifate (ingrediente, pași), păstrate cât timp tab-ul e deschis (sessionStorage),
 * ca să nu se piardă la navigare. Pagina rețetei și modul „gătesc acum” folosesc aceeași listă.
 */
export function useChecked(key) {
  const [state, setState] = useState(() => ({ key, checked: read(key) }));
  let current = state;
  if (state.key !== key) {
    // altă rețetă: se citesc bifele ei
    current = { key, checked: read(key) };
    setState(current);
  }
  const { checked } = current;

  useEffect(() => {
    try {
      sessionStorage.setItem(state.key, JSON.stringify([...state.checked]));
    } catch {
      // fără stocare: bifele rămân doar pe pagina curentă
    }
  }, [state]);

  const update = useCallback((change) => setState((s) => ({ key: s.key, checked: change(s.checked) })), []);
  const toggle = useCallback(
    (item) =>
      update((s) => {
        const next = new Set(s);
        if (next.has(item)) next.delete(item);
        else next.add(item);
        return next;
      }),
    [update],
  );
  const add = useCallback((item) => update((s) => (s.has(item) ? s : new Set(s).add(item))), [update]);
  const reset = useCallback(() => update(() => new Set()), [update]);

  return { checked, toggle, add, reset };
}

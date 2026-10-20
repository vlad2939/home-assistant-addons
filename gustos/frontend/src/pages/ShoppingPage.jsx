import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Check, FileText, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { api } from "../api.js";
import { ingredientAmount, roundForShopping } from "../scale.js";
import PageHeader from "../components/PageHeader.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

const REFRESH_MS = 15000; // lista e comună: ce bifează altcineva apare și aici

function Row({ item, onToggle, onDelete }) {
  const amount = ingredientAmount(roundForShopping(item), null, null);
  return (
    <li className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onToggle(item)}
        aria-pressed={item.checked}
        className={`flex min-w-0 flex-1 items-start gap-3 rounded-2xl px-2 py-3 text-left transition-colors hover:bg-surface-2 ${item.checked ? "opacity-55" : ""}`}
      >
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 ${
            item.checked ? "border-accent bg-accent text-on-accent" : "border-border"
          }`}
          aria-hidden="true"
        >
          {item.checked && <Check size={16} strokeWidth={3} />}
        </span>
        <span className={`min-w-0 ${item.checked ? "line-through" : ""}`}>
          <span className="text-[17px]">
            {amount && <span className="font-semibold tabular-nums">{amount} </span>}
            {item.name}
            {item.note && <span className="text-muted">, {item.note}</span>}
          </span>
          {item.sources && <span className="block truncate text-sm text-muted">din {item.sources}</span>}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onDelete(item)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-[var(--accent-red)]"
        aria-label={`Scoate ${item.name} din listă`}
      >
        <X size={18} />
      </button>
    </li>
  );
}

export default function ShoppingPage() {
  const notice = useLocation().state?.notice;
  const [items, setItems] = useState(null);
  const [text, setText] = useState("");
  const [error, setError] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const run = useCallback(async (request) => {
    setError(null);
    try {
      setItems((await request()).items);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }, []);

  const reload = useCallback(() => api.get("/api/shopping").then((r) => setItems(r.items)).catch(() => {}), []);

  useEffect(() => {
    reload();
    const timer = setInterval(() => document.visibilityState === "visible" && reload(), REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && reload();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reload]);

  const add = async (e) => {
    e.preventDefault();
    if (text.trim() && (await run(() => api.post("/api/shopping/items", { text })))) setText("");
  };

  const toggle = (item) => {
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i))); // imediat, apoi serverul
    run(() => api.patch(`/api/shopping/items/${item.id}`, { checked: !item.checked }));
  };

  if (!items) return <p className="text-muted">Se încarcă…</p>;

  const todo = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);
  const aisles = [...new Set(todo.map((i) => i.aisle))];

  return (
    <>
      <PageHeader title="Cumpărături" subtitle={todo.length ? `${todo.length} de cumpărat` : "Nimic de cumpărat"}>
        {items.length > 0 && (
          <span className="flex gap-2">
          <Link
            to="/tipar/cumparaturi"
            className="flex h-11 items-center gap-2 rounded-2xl border border-border bg-surface px-4 font-medium hover:bg-surface-2"
            title="Lista (fără produsele bifate) ca PDF sau la imprimantă"
          >
            <FileText size={18} aria-hidden="true" /> PDF
          </Link>
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="flex h-11 items-center gap-2 rounded-2xl border border-border bg-surface px-4 font-medium text-[var(--accent-red)] hover:bg-surface-2"
          >
            <Trash2 size={18} aria-hidden="true" /> Golește lista
          </button>
          </span>
        )}
      </PageHeader>

      {notice && <p className="mb-5 rounded-2xl border border-[var(--accent-green)] bg-surface p-4">{notice}</p>}

      <form onSubmit={add} className="mb-6 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Adaugă un produs, de exemplu „2 kg cartofi” sau „detergent”"
          aria-label="Produs nou"
          className="h-14 min-w-0 flex-1 rounded-2xl border border-border bg-surface px-4 text-lg outline-none placeholder:text-muted focus:border-accent"
        />
        <button type="submit" disabled={!text.trim()} className="flex h-14 items-center gap-2 rounded-2xl bg-accent px-5 font-semibold text-on-accent disabled:opacity-50">
          <Plus size={20} aria-hidden="true" /> <span className="hidden sm:inline">Adaugă</span>
        </button>
      </form>
      {error && <p className="mb-4 text-[var(--accent-red)]" role="alert">{error}</p>}

      {items.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border p-10 text-center text-muted">
          <ShoppingCart size={40} className="text-accent" aria-hidden="true" />
          <p>Lista e goală. Adaugă produse aici, ingredientele unei rețete (butonul de pe pagina rețetei) sau un meniu întreg.</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {aisles.map((aisle) => (
          <section key={aisle} className="rounded-3xl border border-border bg-surface p-4 shadow-card">
            <h2 className="mb-1 px-2 text-lg font-semibold">{aisle}</h2>
            <ul className="divide-y divide-border">
              {todo
                .filter((i) => i.aisle === aisle)
                .map((item) => (
                  <Row key={item.id} item={item} onToggle={toggle} onDelete={(i) => run(() => api.del(`/api/shopping/items/${i.id}`))} />
                ))}
            </ul>
          </section>
        ))}
      </div>

      {done.length > 0 && (
        <section className="mt-6 rounded-3xl border border-border bg-surface p-4 shadow-card">
          <div className="mb-1 flex items-center justify-between gap-3 px-2">
            <h2 className="text-lg font-semibold">În coș ({done.length})</h2>
            <button
              type="button"
              onClick={() => run(() => api.post("/api/shopping/clear", { only_checked: true }))}
              className="text-sm font-medium text-accent hover:underline"
            >
              Scoate din listă ce e bifat
            </button>
          </div>
          <ul className="divide-y divide-border">
            {done.map((item) => (
              <Row key={item.id} item={item} onToggle={toggle} onDelete={(i) => run(() => api.del(`/api/shopping/items/${i.id}`))} />
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={async () => {
          await run(() => api.post("/api/shopping/clear", { only_checked: false }));
          setConfirmClear(false);
        }}
        title="Golești lista de cumpărături?"
        confirmLabel="Golește lista"
        danger
      >
        <p>Se șterg toate produsele din listă ({items.length}), inclusiv cele nebifate.</p>
      </ConfirmDialog>
    </>
  );
}

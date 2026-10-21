import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ClipboardCopy, FileText, Pencil, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { api } from "../api.js";
import { shortDate } from "../menu.js";
import PageHeader from "../components/PageHeader.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { IconButton, TextInput } from "../components/form/fields.jsx";

/** Textul listei, pentru „Copiază lista” (de lipit pe telefon, în WhatsApp sau Notițe). */
export function listAsText(items) {
  return [`Cumpărături ${shortDate(new Date())}`, ...items.map((i) => `- ${i.name}${i.amount ? ` – ${i.amount}` : ""}`)].join("\n");
}

/** Copiere în clipboard; pe http:// (fără HTTPS) browserul nu oferă navigator.clipboard, deci se folosește varianta veche. */
async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // de exemplu fereastra nu are focus: încercăm varianta veche
    }
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.cssText = "position:fixed;top:0;left:0;opacity:0";
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) throw new Error("Browserul nu a permis copierea.");
}

function Row({ item, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [amount, setAmount] = useState(item.amount ?? "");

  const cancel = () => {
    setEditing(false);
    setName(item.name);
    setAmount(item.amount ?? "");
  };
  const save = async () => {
    if (await onSave(item, { name, amount })) setEditing(false);
  };
  const keys = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    } else if (e.key === "Escape") {
      e.stopPropagation();
      cancel();
    }
  };

  if (editing) {
    return (
      <li className="flex flex-wrap items-center gap-2 py-2">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} onKeyDown={keys} autoFocus aria-label="Produsul" className="min-w-0 flex-[3]" />
        <TextInput value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={keys} placeholder="cantitate" aria-label="Cantitatea" className="min-w-0 flex-1" />
        <IconButton label="Salvează" onClick={save}>
          <Check size={18} />
        </IconButton>
        <IconButton label="Renunță" onClick={cancel}>
          <X size={18} />
        </IconButton>
      </li>
    );
  }
  return (
    <li className="flex items-center gap-2 py-1.5">
      <span className="min-w-0 flex-1 py-1.5 text-[17px]">
        {item.name}
        {item.amount && <span className="text-muted"> – {item.amount}</span>}
      </span>
      <IconButton label={`Modifică ${item.name}`} onClick={() => setEditing(true)}>
        <Pencil size={18} />
      </IconButton>
      <IconButton label={`Scoate ${item.name} din listă`} onClick={() => onDelete(item)} className="hover:text-[var(--accent-red)]">
        <X size={18} />
      </IconButton>
    </li>
  );
}

export default function ShoppingPage() {
  const [items, setItems] = useState(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    api.get("/api/shopping").then((r) => setItems(r.items)).catch((e) => setMessage({ kind: "error", text: e.message }));
  }, []);

  const run = async (request) => {
    setMessage(null);
    try {
      const r = await request();
      setItems(r.items);
      return r;
    } catch (e) {
      setMessage({ kind: "error", text: e.message });
      return null;
    }
  };

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const r = await run(() => api.post("/api/shopping/items", { items: [{ name, amount }] }));
    if (!r) return;
    if (r.added === 0) setMessage({ kind: "info", text: `„${name.trim()}” este deja în listă.` });
    setName("");
    setAmount("");
  };

  const copy = async () => {
    try {
      await copyText(listAsText(items));
      setMessage({ kind: "ok", text: "Lista a fost copiată. O poți lipi într-un mesaj sau în Notițe." });
    } catch (e) {
      setMessage({ kind: "error", text: e.message });
    }
  };

  if (!items) return message ? <p className="text-[var(--accent-red)]">{message.text}</p> : <p className="text-muted">Se încarcă…</p>;

  const button = "flex h-11 items-center gap-2 rounded-2xl border border-border bg-surface px-4 font-medium hover:bg-surface-2";
  const colors = { error: "var(--accent-red)", ok: "var(--accent-green)", info: "var(--border)" };

  return (
    <>
      <PageHeader title="Cumpărături" subtitle={items.length ? `${items.length} ${items.length === 1 ? "produs" : "produse"}` : "Lista e goală"}>
        {items.length > 0 && (
          <span className="flex flex-wrap gap-2">
            <button type="button" onClick={copy} className={button} title="Copiază lista ca text, ca s-o lipești pe telefon">
              <ClipboardCopy size={18} aria-hidden="true" /> Copiază lista
            </button>
            <Link to="/tipar/cumparaturi" className={button} title="Lista ca PDF sau la imprimantă">
              <FileText size={18} aria-hidden="true" /> PDF
            </Link>
            <button type="button" onClick={() => setConfirmClear(true)} className={`${button} text-[var(--accent-red)]`}>
              <Trash2 size={18} aria-hidden="true" /> Golește lista
            </button>
          </span>
        )}
      </PageHeader>

      <div className="max-w-3xl">
        <form onSubmit={add} className="mb-4 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Produs, de exemplu „ulei” sau „detergent”"
            aria-label="Produs nou"
            className="h-14 min-w-0 flex-[3] rounded-2xl border border-border bg-surface px-4 text-lg outline-none placeholder:text-muted focus:border-accent"
          />
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="cantitate"
            aria-label="Cantitatea"
            className="h-14 min-w-0 flex-1 rounded-2xl border border-border bg-surface px-4 text-lg outline-none placeholder:text-muted focus:border-accent"
          />
          <button type="submit" disabled={!name.trim()} className="flex h-14 items-center gap-2 rounded-2xl bg-accent px-5 font-semibold text-on-accent disabled:opacity-50">
            <Plus size={20} aria-hidden="true" /> Adaugă
          </button>
        </form>

        {message && (
          <p className="mb-4 rounded-2xl border bg-surface px-4 py-3" style={{ borderColor: colors[message.kind] }} role={message.kind === "error" ? "alert" : "status"}>
            {message.text}
          </p>
        )}

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border p-10 text-center text-muted">
            <ShoppingCart size={40} className="text-accent" aria-hidden="true" />
            <p>
              Lista e goală. Scrie produsele aici sau alege-le din ingredientele unei rețete sau ale unui meniu (butonul „Adaugă în cumpărături”).
            </p>
          </div>
        ) : (
          <section className="rounded-3xl border border-border bg-surface px-5 py-2 shadow-card">
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <Row
                  key={`${item.id}-${item.name}-${item.amount}`}
                  item={item}
                  onSave={(i, change) => run(() => api.put(`/api/shopping/items/${i.id}`, change)).then(Boolean)}
                  onDelete={(i) => run(() => api.del(`/api/shopping/items/${i.id}`))}
                />
              ))}
            </ul>
          </section>
        )}
      </div>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={async () => {
          await run(() => api.post("/api/shopping/clear"));
          setConfirmClear(false);
        }}
        title="Golești lista de cumpărături?"
        confirmLabel="Golește lista"
        danger
      >
        <p>Se șterg toate produsele din listă ({items.length}).</p>
      </ConfirmDialog>
    </>
  );
}

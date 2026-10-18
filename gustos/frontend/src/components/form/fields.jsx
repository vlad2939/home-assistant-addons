// Câmpuri de formular cu aspect comun. Elemente mari, ușor de atins pe tabletă.

export const inputClass =
  "h-12 w-full rounded-xl border bg-surface px-3.5 outline-none placeholder:text-muted focus:border-accent";

export function Field({ label, hint, error, children, className = "", htmlFor }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-sm text-[var(--accent-red)]" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-sm text-muted">{hint}</p>
      )}
    </div>
  );
}

export function TextInput({ invalid, className = "", ...props }) {
  return (
    <input
      type="text"
      aria-invalid={invalid || undefined}
      className={`${inputClass} ${invalid ? "border-[var(--accent-red)]" : "border-border"} ${className}`}
      {...props}
    />
  );
}

export function TextArea({ invalid, className = "", rows = 3, ...props }) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={`w-full rounded-xl border bg-surface px-3.5 py-3 leading-relaxed outline-none placeholder:text-muted focus:border-accent ${
        invalid ? "border-[var(--accent-red)]" : "border-border"
      } ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", children, ...props }) {
  return (
    <select className={`${inputClass} border-border ${className}`} {...props}>
      {children}
    </select>
  );
}

export function IconButton({ label, children, className = "", ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-text disabled:opacity-30 disabled:hover:bg-transparent ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function FormSection({ title, children, action }) {
  return (
    <section className="rounded-3xl border border-border bg-surface p-5 shadow-card lg:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

let counter = 0;
/** Chei unice pentru rânduri (crypto.randomUUID nu e disponibil pe HTTP în rețeaua locală). */
export function newKey() {
  counter += 1;
  return `k${counter}`;
}

/** Mută elementul de la poziția index cu delta (-1 sus, +1 jos). */
export function move(list, index, delta) {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

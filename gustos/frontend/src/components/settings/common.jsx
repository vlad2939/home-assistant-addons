// Piese comune pentru secțiunile din Setări.

export function Section({ title, description, children, className = "", bodyClassName = "" }) {
  return (
    <section className={`rounded-3xl border border-border bg-surface p-5 shadow-card lg:p-6 ${className}`}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className={`mt-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function Notice({ kind = "info", children }) {
  const color = kind === "error" ? "var(--accent-red)" : kind === "ok" ? "var(--accent-green)" : "var(--border)";
  return (
    <p className="mt-3 rounded-2xl border bg-surface-2 px-4 py-3 text-sm" style={{ borderColor: color }} role={kind === "error" ? "alert" : "status"}>
      {children}
    </p>
  );
}

export function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-accent" : "bg-border"}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-6" : "left-1"}`} />
    </button>
  );
}

export const smallButton =
  "flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 font-medium hover:bg-surface-2 disabled:opacity-50";
export const primaryButton =
  "flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-accent px-4 font-semibold text-on-accent disabled:opacity-50";

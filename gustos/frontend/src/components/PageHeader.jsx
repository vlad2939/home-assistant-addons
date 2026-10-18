/** Titlul paginii, cu subtitlul (sau numărul de rețete) pe același rând, după un separator. */
export default function PageHeader({ title, subtitle, children }) {
  const hasSubtitle = typeof subtitle === "string" ? subtitle.trim() !== "" : subtitle != null;
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {hasSubtitle && (
          <>
            <span className="h-6 w-px self-center bg-border" aria-hidden="true" />
            <p className="text-lg text-muted">{subtitle}</p>
          </>
        )}
      </div>
      {children}
    </div>
  );
}

import { useEffect, useState } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { api } from "../../api.js";
import ConfirmDialog from "../ConfirmDialog.jsx";
import { IconButton, TextInput } from "../form/fields.jsx";
import { Notice, Section, Switch, primaryButton } from "./common.jsx";

export default function ImportSitesManager() {
  const [sites, setSites] = useState([]);
  const [domain, setDomain] = useState("");
  const [error, setError] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => {
    api.get("/api/import-sites").then(setSites).catch((e) => setError(e.message));
  }, []);

  const run = async (action) => {
    setError(null);
    try {
      setSites(await action());
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  };

  const add = async (e) => {
    e.preventDefault();
    if (domain.trim() && (await run(() => api.post("/api/import-sites", { domain })))) setDomain("");
  };

  return (
    <Section
      title="Site-uri pentru import"
      description="Importul din link funcționează doar pentru site-urile active din această listă."
    >
      <ul className="divide-y divide-border">
        {sites.map((s) => (
          <li key={s.id} className="flex items-center gap-3 py-2">
            <Switch
              checked={Boolean(s.active)}
              onChange={(active) => run(() => api.put(`/api/import-sites/${s.id}`, { active }))}
              label={s.active ? `Dezactivează ${s.domain}` : `Activează ${s.domain}`}
            />
            <a
              href={`https://${s.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-1 items-center gap-1.5 truncate font-medium hover:underline ${s.active ? "" : "text-muted"}`}
            >
              {s.domain} <ExternalLink size={14} className="text-muted" aria-hidden="true" />
            </a>
            <IconButton label={`Șterge ${s.domain}`} onClick={() => setToDelete(s)}>
              <Trash2 size={18} />
            </IconButton>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-3 flex gap-2">
        <TextInput value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="exemplu.ro" aria-label="Site nou" inputMode="url" />
        <button type="submit" className={primaryButton} disabled={!domain.trim()}>
          <Plus size={18} aria-hidden="true" /> Adaugă
        </button>
      </form>
      <p className="mt-2 text-sm text-muted">
        Importul de pe un site nou poate ieși mai puțin complet. Verifică întotdeauna previzualizarea.
      </p>
      {error && <Notice kind="error">{error}</Notice>}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          await run(async () => {
            await api.del(`/api/import-sites/${toDelete.id}`);
            return api.get("/api/import-sites");
          });
          setToDelete(null);
        }}
        title="Scoți site-ul din listă?"
        confirmLabel="Scoate din listă"
        danger
      >
        <p>
          Site-ul <strong>{toDelete?.domain}</strong> nu va mai putea fi folosit pentru import. Rețetele importate deja rămân.
        </p>
      </ConfirmDialog>
    </Section>
  );
}

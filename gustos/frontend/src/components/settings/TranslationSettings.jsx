import { useCallback, useEffect, useState } from "react";
import { Check, Cpu, Download, ExternalLink, Globe, KeyRound, Trash2 } from "lucide-react";
import { api } from "../../api.js";
import ConfirmDialog from "../ConfirmDialog.jsx";
import { TextInput } from "../form/fields.jsx";
import { Notice, Section, primaryButton, smallButton } from "./common.jsx";

const OPTIONS = [
  { id: "deepl", icon: Globe, label: "DeepL (recomandat)", hint: "Cheie API gratuită. Traducere bună." },
  { id: "local", icon: Cpu, label: "Pe NUC", hint: "Gratuit, fără cont și fără internet. Traducere aproximativă." },
];

const number = (n) => n.toLocaleString("ro-RO");

function LocalModel({ status, onDownload, onDelete }) {
  const local = status.local;
  if (local.installed) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex flex-1 items-center gap-2">
          <Check size={20} className="text-[var(--accent-green)]" aria-hidden="true" /> Modelul de traducere este descărcat (~80 MB).
        </p>
        <button type="button" onClick={onDelete} className={smallButton}>
          <Trash2 size={18} aria-hidden="true" /> Șterge modelul
        </button>
      </div>
    );
  }
  if (local.state === "downloading") {
    const percent = Math.round(local.progress * 100);
    return (
      <div>
        <p className="mb-2">Se descarcă modelul… {percent}%</p>
        <div className="h-3 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  }
  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        Traducerea pe NUC folosește un model OPUS-MT (engleză → română) care se descarcă o singură dată (~70 MB). După descărcare, traducerea
        merge fără internet.
      </p>
      <button type="button" onClick={onDownload} className={primaryButton}>
        <Download size={18} aria-hidden="true" /> Descarcă modelul
      </button>
      {local.state === "error" && <Notice kind="error">{local.error}</Notice>}
    </div>
  );
}

function DeeplKey({ settings, onSave }) {
  const [key, setKey] = useState("");
  const [usage, setUsage] = useState(null);
  const [message, setMessage] = useState(null);

  const save = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      await onSave({ deepl_key: key });
      setKey("");
      setMessage({ kind: "ok", text: "Cheia a fost salvată." });
    } catch (err) {
      setMessage({ kind: "error", text: err.message });
    }
  };

  const check = async () => {
    setMessage(null);
    try {
      setUsage(await api.post("/api/translate/deepl-usage"));
    } catch (err) {
      setUsage(null);
      setMessage({ kind: "error", text: err.message });
    }
  };

  return (
    <div>
      {settings.deepl_key_set ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex flex-1 items-center gap-2">
            <KeyRound size={20} className="text-accent" aria-hidden="true" /> Cheie salvată (…{settings.deepl_key_hint})
          </p>
          <button type="button" onClick={check} className={smallButton}>
            Verifică
          </button>
          <button type="button" onClick={() => onSave({ deepl_key: "" }).then(() => setUsage(null))} className={smallButton}>
            <Trash2 size={18} aria-hidden="true" /> Șterge cheia
          </button>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">
            Fă-ți un cont gratuit „DeepL API Free” (cere un card doar pentru verificare, nu se plătește nimic), copiază cheia din contul tău și
            lipește-o aici.{" "}
            <a href="https://www.deepl.com/pro-api" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-accent hover:underline">
              deepl.com/pro-api <ExternalLink size={14} aria-hidden="true" />
            </a>
          </p>
          <form onSubmit={save} className="flex gap-2">
            <TextInput
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Cheia DeepL (se termină cu :fx)"
              aria-label="Cheia DeepL"
              autoComplete="off"
            />
            <button type="submit" className={primaryButton} disabled={!key.trim()}>
              Salvează
            </button>
          </form>
        </>
      )}
      {usage && (
        <Notice kind="ok">
          Cheia funcționează. Luna aceasta ai folosit {number(usage.used)} din {number(usage.limit)} de caractere (o rețetă are în jur de 3.000).
        </Notice>
      )}
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      <p className="mt-3 text-xs text-muted">
        Cheia se păstrează doar pe serverul Gustos și intră în backup-urile lui. Textul rețetelor traduse se trimite la DeepL.
      </p>
    </div>
  );
}

export default function TranslationSettings() {
  const [settings, setSettings] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadStatus = useCallback(() => api.get("/api/translate/status").then(setStatus), []);

  useEffect(() => {
    Promise.all([api.get("/api/settings").then(setSettings), loadStatus()]).catch((e) => setError(e.message));
  }, [loadStatus]);

  // în timpul descărcării, starea se citește o dată pe secundă
  const downloading = status?.local.state === "downloading";
  useEffect(() => {
    if (!downloading) return undefined;
    const timer = setInterval(() => loadStatus().catch(() => {}), 1000);
    return () => clearInterval(timer);
  }, [downloading, loadStatus]);

  const save = async (change) => {
    const saved = await api.put("/api/settings", change);
    setSettings(saved);
    await loadStatus();
  };

  const choose = (id) => {
    setError(null);
    save({ translator: id }).catch((e) => setError(e.message));
  };

  const download = () => {
    setError(null);
    api.post("/api/translate/model").then(loadStatus).catch((e) => setError(e.message));
  };

  if (!settings || !status) {
    return (
      <Section title="Traducere din engleză">
        {error ? <Notice kind="error">{error}</Notice> : <p className="text-muted">Se încarcă…</p>}
      </Section>
    );
  }

  const engine = status.translator;

  return (
    <Section
      title="Traducere din engleză"
      description="Rețetele importate în engleză au în previzualizare butonul „Tradu în română”. Alege cine face traducerea."
    >
      <div className="mb-5 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Serviciul de traducere">
        {OPTIONS.map(({ id, icon: Icon, label, hint }) => {
          const active = engine === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(id)}
              className={`flex flex-col items-start gap-1 rounded-2xl border-2 p-4 text-left transition-colors ${
                active ? "border-accent bg-accent-soft" : "border-border hover:bg-surface-2"
              }`}
            >
              <span className={`flex items-center gap-2 font-semibold ${active ? "text-accent-strong" : ""}`}>
                <Icon size={20} aria-hidden="true" /> {label}
              </span>
              <span className="text-sm text-muted">{hint}</span>
            </button>
          );
        })}
      </div>

      {engine === "local" ? (
        <LocalModel status={status} onDownload={download} onDelete={() => setConfirmDelete(true)} />
      ) : (
        <>
          <DeeplKey settings={settings} onSave={save} />
          {!status.local.installed && (
            <p className="mt-3 text-sm text-muted">
              Dacă DeepL nu răspunde sau ai atins limita lunară, Gustos poate folosi traducerea pe NUC, dacă descarci modelul (alege „Pe NUC”).
            </p>
          )}
        </>
      )}
      {error && <Notice kind="error">{error}</Notice>}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await api.del("/api/translate/model");
          await loadStatus();
          setConfirmDelete(false);
        }}
        title="Ștergi modelul de traducere?"
        confirmLabel="Șterge"
        danger
      >
        <p>Se eliberează ~80 MB. Poți descărca modelul din nou oricând.</p>
      </ConfirmDialog>
    </Section>
  );
}

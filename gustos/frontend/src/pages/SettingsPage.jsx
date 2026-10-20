import { useState } from "react";
import { BookOpen, Check, ChevronRight, Info, Laptop, Maximize, Moon, Sun } from "lucide-react";
import { useApp } from "../AppContext.jsx";
import { ACCENTS, THEMES } from "../theme.js";
import { enterFullscreen, fullscreenSupported, getFullscreenAtStart, setFullscreenAtStart } from "../screen.js";
import PageHeader from "../components/PageHeader.jsx";
import AboutModal from "../components/AboutModal.jsx";
import ManualModal from "../components/ManualModal.jsx";
import { Section, Switch } from "../components/settings/common.jsx";
import CategoriesManager from "../components/settings/CategoriesManager.jsx";
import TagsManager from "../components/settings/TagsManager.jsx";
import TranslationSettings from "../components/settings/TranslationSettings.jsx";
import ImportSitesManager from "../components/settings/ImportSitesManager.jsx";
import BackupPanel from "../components/settings/BackupPanel.jsx";

const THEME_ICONS = { auto: Laptop, light: Sun, dark: Moon };

function Row({ icon: Icon, label, hint, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-mx-3 flex w-[calc(100%+1.5rem)] items-center gap-4 rounded-2xl px-3 py-3.5 text-left transition-colors hover:bg-surface-2"
    >
      <Icon size={22} className="text-accent" aria-hidden="true" />
      <span className="flex-1">
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <ChevronRight size={20} className="text-muted" aria-hidden="true" />
    </button>
  );
}

export default function SettingsPage() {
  const { appearance, updateAppearance } = useApp();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [error, setError] = useState(null);
  const [fullscreenAtStart, setFullscreenAtStartState] = useState(getFullscreenAtStart);

  const toggleFullscreenAtStart = (on) => {
    setFullscreenAtStart(on);
    setFullscreenAtStartState(on);
    if (on) enterFullscreen(); // click-ul de acum permite deja ecranul complet
  };

  const change = (value) => {
    setError(null);
    updateAppearance(value).catch((e) => setError(e.message));
  };

  return (
    <>
      <PageHeader title="Setări" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section title="Aspect">
          <p className="mb-2 text-sm font-medium text-muted">Temă</p>
          <div className="mb-6 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Temă">
            {THEMES.map(({ id, label }) => {
              const Icon = THEME_ICONS[id];
              const active = appearance.theme === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => change({ theme: id })}
                  className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-3 py-4 font-medium transition-colors ${
                    active ? "border-accent bg-accent-soft text-accent-strong" : "border-border hover:bg-surface-2"
                  }`}
                >
                  <Icon size={24} aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </div>

          <p className="mb-2 text-sm font-medium text-muted">Culoare de accent</p>
          <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Culoare de accent">
            {ACCENTS.map(({ id, label }) => {
              const active = appearance.accent === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={label}
                  title={label}
                  onClick={() => change({ accent: id })}
                  className={`flex h-14 w-14 items-center justify-center rounded-full ring-offset-2 ring-offset-surface transition-transform hover:scale-105 ${
                    active ? "ring-2 ring-text" : ""
                  }`}
                  style={{ background: `var(--accent-${id})` }}
                >
                  {active && <Check size={26} color="var(--on-accent)" strokeWidth={3} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          {error && <p className="mt-4 text-sm text-[var(--accent-red)]">{error}</p>}

          {fullscreenSupported() && (
            <div className="mt-6 flex items-center gap-4 border-t border-border pt-5">
              <Maximize size={22} className="shrink-0 text-accent" aria-hidden="true" />
              <span className="flex-1">
                <span className="block font-medium">Pornește în ecran complet</span>
                <span className="block text-sm text-muted">
                  Doar pe acest dispozitiv. Browserul permite ecranul complet abia după o atingere, așa că Gustos trece în ecran complet la primul click.
                </span>
              </span>
              <Switch checked={fullscreenAtStart} onChange={toggleFullscreenAtStart} label="Pornește în ecran complet" />
            </div>
          )}
        </Section>

        <Section title="Ajutor">
          <Row icon={BookOpen} label="Manual de utilizare" hint="Cum folosești Gustos, pas cu pas" onClick={() => setManualOpen(true)} />
          <Row icon={Info} label="Despre" hint="Versiune, tehnologii" onClick={() => setAboutOpen(true)} />
        </Section>

        <CategoriesManager />
        <TagsManager />
        <ImportSitesManager />
        <TranslationSettings />
        <BackupPanel />
      </div>
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <ManualModal open={manualOpen} onClose={() => setManualOpen(false)} />
    </>
  );
}

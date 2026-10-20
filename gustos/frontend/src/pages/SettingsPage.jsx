import { useState } from "react";
import { BookOpen, Check, ChevronRight, Info, Laptop, Maximize, Moon, Sun } from "lucide-react";
import { useApp } from "../AppContext.jsx";
import { ACCENTS, THEMES } from "../theme.js";
import { enterFullscreen, fullscreenSupported, getFullscreenAtStart, setFullscreenAtStart } from "../screen.js";
import PageHeader from "../components/PageHeader.jsx";
import AboutModal from "../components/AboutModal.jsx";
import ManualModal from "../components/ManualModal.jsx";
import { Switch } from "../components/settings/common.jsx";
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
      className="-mx-3 flex w-[calc(100%+1.5rem)] items-center gap-4 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
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
        {/* Aspect și Ajutor: un singur card, compact, pe toată lățimea */}
        <section className="rounded-3xl border border-border bg-surface p-5 shadow-card lg:p-6 xl:col-span-2">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_1px_minmax(0,1fr)] xl:gap-7">
            <div>
              <h2 className="mb-3 text-lg font-semibold">Aspect</h2>
              <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
                <div>
                  <p className="mb-1.5 text-sm font-medium text-muted">Temă</p>
                  <div className="flex gap-1.5" role="radiogroup" aria-label="Temă">
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
                          className={`flex h-11 items-center gap-2 rounded-xl border-2 px-3 font-medium transition-colors ${
                            active ? "border-accent bg-accent-soft text-accent-strong" : "border-border hover:bg-surface-2"
                          }`}
                        >
                          <Icon size={18} aria-hidden="true" />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-sm font-medium text-muted">Culoare de accent</p>
                  <div className="flex h-11 items-center gap-2.5" role="radiogroup" aria-label="Culoare de accent">
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
                          className={`flex h-10 w-10 items-center justify-center rounded-full ring-offset-2 ring-offset-surface transition-transform hover:scale-105 ${
                            active ? "ring-2 ring-text" : ""
                          }`}
                          style={{ background: `var(--accent-${id})` }}
                        >
                          {active && <Check size={20} color="var(--on-accent)" strokeWidth={3} aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              {error && <p className="mt-3 text-sm text-[var(--accent-red)]">{error}</p>}

              {fullscreenSupported() && (
                <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                  <Maximize size={20} className="shrink-0 text-accent" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">Pornește în ecran complet</span>
                    <span className="text-sm text-muted"> · doar pe acest dispozitiv, de la primul click</span>
                  </span>
                  <Switch checked={fullscreenAtStart} onChange={toggleFullscreenAtStart} label="Pornește în ecran complet" />
                </div>
              )}
            </div>

            <div className="h-px bg-border xl:h-auto" aria-hidden="true" />

            <div>
              <h2 className="mb-2 text-lg font-semibold">Ajutor</h2>
              <Row
                icon={BookOpen}
                label="Manual de utilizare"
                hint="Cum folosești Gustos, pas cu pas"
                onClick={() => setManualOpen(true)}
              />
              <Row icon={Info} label="Despre" hint="Versiune, tehnologii" onClick={() => setAboutOpen(true)} />
            </div>
          </div>
        </section>

        <CategoriesManager />
        <TagsManager />
        <ImportSitesManager />
        {/* Traducere și Backup unul sub altul; Backup umple restul, ca marginile de jos să se alinieze */}
        <div className="flex flex-col gap-6">
          <TranslationSettings />
          <BackupPanel className="flex-1" />
        </div>
      </div>
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <ManualModal open={manualOpen} onClose={() => setManualOpen(false)} />
    </>
  );
}

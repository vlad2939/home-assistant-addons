import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { FormSection, IconButton, TextArea, move, newKey } from "./fields.jsx";

export const emptyStep = (text = "") => ({ key: newKey(), text });

/** Pași numerotați, reordonabili. Un text lipit cu mai multe rânduri devine mai mulți pași. */
export default function StepsEditor({ steps, onChange }) {
  const [focusKey, setFocusKey] = useState(null);

  useEffect(() => {
    if (!focusKey) return;
    document.querySelector(`[data-focus="${focusKey}"]`)?.focus();
    setFocusKey(null);
  }, [focusKey]);

  const setText = (i, text) => onChange(steps.map((s, j) => (j === i ? { ...s, text } : s)));

  const add = () => {
    const step = emptyStep();
    onChange([...steps, step]);
    setFocusKey(step.key);
  };

  const remove = (i) => {
    const rest = steps.filter((_, j) => j !== i);
    onChange(rest.length ? rest : [emptyStep()]);
  };

  const onPaste = (e, i) => {
    const pasted = e.clipboardData.getData("text");
    const lines = pasted
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*(\d+[.)]|[-•*])\s*/, "").trim())
      .filter(Boolean);
    if (lines.length < 2 || steps[i].text.trim()) return; // lipire normală
    e.preventDefault();
    onChange([...steps.slice(0, i), ...lines.map((l) => emptyStep(l)), ...steps.slice(i + 1)]);
  };

  return (
    <FormSection title="Mod de preparare">
      <p className="mb-4 text-sm text-muted">
        Poți lipi toți pașii deodată într-un câmp gol: fiecare rând devine un pas.
      </p>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={step.key} className="flex items-start gap-2">
            <span className="mt-2.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-accent font-semibold text-accent">
              {i + 1}
            </span>
            <TextArea
              value={step.text}
              onChange={(e) => setText(i, e.target.value)}
              onPaste={(e) => onPaste(e, i)}
              rows={2}
              placeholder={`Pasul ${i + 1}`}
              aria-label={`Pasul ${i + 1}`}
              data-focus={step.key}
            />
            <div className="flex flex-col">
              <IconButton label="Mută mai sus" onClick={() => onChange(move(steps, i, -1))} disabled={i === 0}>
                <ArrowUp size={18} />
              </IconButton>
              <IconButton label="Mută mai jos" onClick={() => onChange(move(steps, i, 1))} disabled={i === steps.length - 1}>
                <ArrowDown size={18} />
              </IconButton>
            </div>
            <IconButton label="Șterge pasul" onClick={() => remove(i)} className="mt-1">
              <Trash2 size={18} />
            </IconButton>
          </li>
        ))}
      </ol>
      <button type="button" onClick={add} className="mt-3 flex items-center gap-1.5 rounded-xl px-2 py-2 font-medium text-accent hover:bg-accent-soft">
        <Plus size={18} aria-hidden="true" /> Adaugă pas
      </button>
    </FormSection>
  );
}

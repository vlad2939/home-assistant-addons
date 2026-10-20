import { BadgeCheck } from "lucide-react";
import { useApp } from "../../AppContext.jsx";
import { Field, FormSection, Select, TextArea, TextInput } from "./fields.jsx";
import IngredientsEditor from "./IngredientsEditor.jsx";
import PhotoPicker from "./PhotoPicker.jsx";
import StepsEditor from "./StepsEditor.jsx";
import TagInput from "./TagInput.jsx";

/** Formularul comun pentru Adaugă, Editează și (în etapa 7) previzualizarea importului. */
export default function RecipeForm({ form, setForm, photo, setPhoto, currentPhoto, errors }) {
  const { categories } = useApp();
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const number = (field, label, placeholder) => (
    <Field label={label} error={errors[field]} htmlFor={`f-${field}`}>
      <TextInput
        id={`f-${field}`}
        inputMode="numeric"
        value={form[field]}
        onChange={set(field)}
        placeholder={placeholder}
        invalid={Boolean(errors[field])}
      />
    </Field>
  );

  return (
    <div className="space-y-6">
      <PhotoPicker currentPhoto={currentPhoto} value={photo} onChange={setPhoto} />

      <FormSection
        title="Informații"
        action={
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, own: !f.own }))}
            aria-pressed={form.own}
            title="Marchează rețeta ca fiind rețeta ta (nu preluată de pe un site)"
            className={`flex h-11 items-center gap-2 rounded-2xl border-2 px-4 font-medium transition-colors ${
              form.own ? "border-accent bg-accent-soft text-accent-strong" : "border-border hover:bg-surface-2"
            }`}
          >
            <BadgeCheck size={20} aria-hidden="true" /> Rețeta mea
          </button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Titlu *" error={errors.title} className="md:col-span-2" htmlFor="f-title">
            <TextInput
              id="f-title"
              value={form.title}
              onChange={set("title")}
              placeholder="ex. Ciorbă de perișoare"
              invalid={Boolean(errors.title)}
              className="text-lg font-medium"
            />
          </Field>
          <Field label="Descriere" className="md:col-span-2" htmlFor="f-description">
            <TextArea id="f-description" value={form.description} onChange={set("description")} rows={2} placeholder="Câteva cuvinte despre rețetă" />
          </Field>
          <Field label="Categorie" htmlFor="f-category">
            <Select id="f-category" value={form.category_id} onChange={set("category_id")}>
              <option value="">Fără categorie</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Dificultate" htmlFor="f-difficulty">
            <Select id="f-difficulty" value={form.difficulty} onChange={set("difficulty")}>
              <option value="">Nespecificată</option>
              <option value="ușoară">Ușoară</option>
              <option value="medie">Medie</option>
              <option value="dificilă">Dificilă</option>
            </Select>
          </Field>
          <div className="grid grid-cols-3 gap-3 md:col-span-2">
            {number("servings", "Porții", "ex. 4")}
            {number("prep_time", "Pregătire (min)", "ex. 20")}
            {number("cook_time", "Gătire (min)", "ex. 45")}
          </div>
          <Field label="Tag-uri" className="md:col-span-2" htmlFor="f-tags" hint="Enter sau virgulă după fiecare tag.">
            <TagInput id="f-tags" value={form.tags} onChange={(tags) => setForm((f) => ({ ...f, tags }))} />
          </Field>
        </div>
      </FormSection>

      <IngredientsEditor groups={form.groups} onChange={(groups) => setForm((f) => ({ ...f, groups }))} errors={errors} />

      <StepsEditor steps={form.steps} onChange={(steps) => setForm((f) => ({ ...f, steps }))} />

      <FormSection title="Sfaturi, note, sursă și video">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Sfaturi utile" htmlFor="f-tips">
            <TextArea id="f-tips" value={form.tips} onChange={set("tips")} rows={4} />
          </Field>
          <Field label="Note personale" htmlFor="f-notes">
            <TextArea id="f-notes" value={form.notes} onChange={set("notes")} rows={4} placeholder="ex. data viitoare, mai puțin zahăr" />
          </Field>
          <Field label="Sursă (link)" error={errors.source_url} className="md:col-span-2" htmlFor="f-source">
            <TextInput
              id="f-source"
              type="url"
              inputMode="url"
              value={form.source_url}
              onChange={set("source_url")}
              placeholder="https://…"
              invalid={Boolean(errors.source_url)}
            />
          </Field>
          <Field
            label="Video (link)"
            error={errors.video_url}
            className="md:col-span-2"
            htmlFor="f-video"
            hint="Clipurile YouTube și Vimeo se pot reda direct din pagina rețetei."
          >
            <TextInput
              id="f-video"
              type="url"
              inputMode="url"
              value={form.video_url}
              onChange={set("video_url")}
              placeholder="https://www.youtube.com/watch?v=…"
              invalid={Boolean(errors.video_url)}
            />
          </Field>
        </div>
      </FormSection>
    </div>
  );
}

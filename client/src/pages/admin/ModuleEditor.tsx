import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { createModule, getAdminModule, updateModule } from "../../api";
import AsyncView from "../../components/AsyncView";
import Layout from "../../components/Layout";
import { useFetch } from "../../hooks/useFetch";
import { useToast } from "../../hooks/useToast";
import { LEVELS } from "../../lib/levels";
import { moveItem, removeAt, updateByKey } from "../../lib/list";
import { toModuleInput } from "../../lib/moduleFile";
import { STATUS_LABEL, isEditable } from "../../lib/status";
import type { AdminModule, ComponentInput, ModuleInput, StepInput, StepType } from "../../types";
import MediaField from "./MediaField";

// Every list item gets a `key` so React can tell rows apart when they are moved.
// The server ignores it when saving.
type Keyed<T> = T & { key: string };
interface EditorModule extends Omit<ModuleInput, "components" | "steps"> {
  components: Keyed<ComponentInput>[];
  steps: Keyed<StepInput>[];
}

const STEP_TYPES: { value: StepType; label: string }[] = [
  { value: "instruction", label: "Instruction" },
  { value: "arduino", label: "Arduino code" },
  { value: "test", label: "Test" },
];

const newKey = () => crypto.randomUUID();
const blankComponent = (): Keyed<ComponentInput> => ({ key: newKey(), name: "", compartment: "", quantity: 1 });
const blankStep = (): Keyed<StepInput> => ({
  key: newKey(), title: "", type: "instruction", instruction: "",
  codeTitle: null, code: null, imageUrl: null, modelUrl: null,
});

const blankModule = (): EditorModule => ({
  title: "", level: "beginner", shortDescription: "", description: "",
  objective: "", durationMinutes: 30, coverImageUrl: null, components: [], steps: [blankStep()],
});

// Gives every component and step a key, so the editor can show them.
const withKeys = (m: ModuleInput): EditorModule => ({
  ...m,
  components: m.components.map((c) => ({ ...c, key: newKey() })),
  steps: m.steps.map((s) => ({ ...s, key: newKey() })),
});

// /admin/modules/new -> empty form.  /admin/modules/:id -> load the module first.
export default function ModuleEditor() {
  const { id } = useParams();
  return id ? <EditExisting id={id} /> : <EditorForm initial={blankModule()} />;
}

function EditExisting({ id }: { id: string }) {
  const state = useFetch(() => getAdminModule(id), id);
  return (
    <AsyncView state={state} what="module">
      {(module) => <EditorForm id={id} initial={withKeys(toModuleInput(module))} saved={module} />}
    </AsyncView>
  );
}

// `saved` is the module as loaded from the server (absent for a new module):
// its status decides whether the form can be edited, and it says who added the module.
function EditorForm({ id, initial, saved: loaded }: { id?: string; initial: EditorModule; saved?: AdminModule }) {
  const editable = !loaded || isEditable(loaded.status);
  const navigate = useNavigate();
  const justCreated = useLocation().state === "created";
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(initial); // the last version the server has
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, showToast] = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const dirty = form !== saved; // every edit makes a new object, so "not the same object" = changed

  // Just came here from "+ New Module" -> say it was created.
  useEffect(() => {
    if (justCreated) showToast("Module created and saved");
  }, [justCreated, showToast]);

  // Ctrl + S (Cmd + S on a Mac) saves, like in most programs.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault(); // stop the browser's own "Save page as"
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Closing the tab or reloading with unsaved changes -> the browser asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // ---- Changing the form ----
  // Each change is applied to the LATEST form (setForm with a function), so an upload that
  // finishes later never undoes something typed while it was uploading.
  const edit = (changes: Partial<EditorModule>) => setForm((current) => ({ ...current, ...changes }));
  const editComponent = (key: string, changes: Partial<ComponentInput>) =>
    setForm((current) => ({ ...current, components: updateByKey(current.components, key, changes) }));
  const editStep = (key: string, changes: Partial<StepInput>) =>
    setForm((current) => ({ ...current, steps: updateByKey(current.steps, key, changes) }));

  // ---- Saving and leaving ----
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editable) return; // Ctrl+S on a published or archived module does nothing
    setSaving(true);
    setError("");
    try {
      if (id) {
        await updateModule(id, form);
        setSaved(form);
        showToast("Module saved");
      } else {
        const created = await createModule(form);
        setSaved(form);
        navigate(`/admin/modules/${created.id}`, { replace: true, state: "created" });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save";
      setError(message);
      showToast(`Not saved: ${message}`, "error");
    } finally {
      setSaving(false);
    }
  }

  const leave = () => {
    if (!dirty || window.confirm("You have unsaved changes. Leave without saving?")) navigate("/admin");
  };

  // An existing module with nothing new to save shows "Saved ✓" and can't be clicked.
  const upToDate = Boolean(id) && !dirty;
  const saveButton = (
    <button className="next-button" type="submit" disabled={saving || upToDate}>
      {saving ? "Saving..." : upToDate ? "Saved ✓" : "Save"}
    </button>
  );

  return (
    <Layout subtitle="Admin Panel" className="admin-container" admin>
      <form className="editor" onSubmit={save} ref={formRef}>
        {/* Stays at the top of the screen while scrolling, so Save is always in reach */}
        <div className="admin-toolbar editor-toolbar">
          <div>
            <h2>{!id ? "New Module" : editable ? "Edit Module" : "View Module"}</h2>
            <span className={dirty ? "save-state unsaved" : "save-state"}>
              {loaded && (
                <span className={`status-pill status-${loaded.status}`}>{STATUS_LABEL[loaded.status]}</span>
              )}
              {loaded?.createdBy && ` Added by ${loaded.createdBy} · `}
              {!editable ? " Read only" : dirty ? "● Unsaved changes" : id ? "All changes saved" : "Not saved yet"}
            </span>
          </div>
          <div className="admin-toolbar-actions">
            <button type="button" className="lesson-back-button" onClick={leave}>
              ← Dashboard
            </button>
            {editable && saveButton}
          </div>
        </div>

        {!editable && (
          <div className="editor-locked">
            This module is published, so it can't be edited. To change it, Archive it on the dashboard
            (students won't see it while it is archived), edit it, then Unarchive it to publish it again.
          </div>
        )}

        {error && <div className="admin-error">{error}</div>}

        {/* A disabled fieldset disables every box and button inside it at once (read-only view) */}
        <fieldset className="editor-fieldset" disabled={!editable}>

        {/* ---- Module details ---- */}
        <section className="editor-card">
          <h3>Module Details</h3>
          <div className="editor-grid">
            <Field label="Title" full>
              <input value={form.title} onChange={(e) => edit({ title: e.target.value })} maxLength={200} required />
            </Field>
            <Field label="Level">
              <select value={form.level} onChange={(e) => edit({ level: e.target.value as EditorModule["level"] })}>
                {LEVELS.map((l) => (
                  <option key={l.key} value={l.key}>{l.title}</option>
                ))}
              </select>
            </Field>
            <Field label="Duration (minutes)">
              <input
                type="number" min={1} max={600}
                value={form.durationMinutes || ""}
                onChange={(e) => edit({ durationMinutes: Number(e.target.value) })}
              />
            </Field>
            <Field label="Short description (on the module card)" full>
              <input value={form.shortDescription} onChange={(e) => edit({ shortDescription: e.target.value })} />
            </Field>
            <Field label="Description" full>
              <textarea rows={3} value={form.description} onChange={(e) => edit({ description: e.target.value })} />
            </Field>
            <Field label="Learning objective" full>
              <textarea rows={2} value={form.objective} onChange={(e) => edit({ objective: e.target.value })} />
            </Field>
            <MediaField
              label="Cover picture (on the module card)" kind="image" className="field-full"
              value={form.coverImageUrl} onChange={(url) => edit({ coverImageUrl: url })}
            />
          </div>
        </section>

        {/* ---- Components ---- */}
        <section className="editor-card">
          <h3>Components ({form.components.length})</h3>
          {form.components.length > 0 && (
            <div className="editor-row editor-row-head" aria-hidden="true">
              <span>Name</span><span>Compartment</span><span>Qty</span><span />
            </div>
          )}
          {form.components.map((c, i) => (
            <div className="editor-row" key={c.key}>
              <input aria-label={`Component ${i + 1} name`} placeholder="e.g. Red LED" value={c.name}
                onChange={(e) => editComponent(c.key, { name: e.target.value })} />
              <input aria-label={`Component ${i + 1} compartment`} placeholder="e.g. A1" value={c.compartment}
                onChange={(e) => editComponent(c.key, { compartment: e.target.value })} />
              <input aria-label={`Component ${i + 1} quantity`} type="number" min={1} max={999} value={c.quantity || ""}
                onChange={(e) => editComponent(c.key, { quantity: Number(e.target.value) })} />
              <ItemControls
                label={`component ${i + 1}`} index={i} count={form.components.length}
                onMove={(by) => edit({ components: moveItem(form.components, i, by) })}
                onRemove={() => edit({ components: removeAt(form.components, i) })}
              />
            </div>
          ))}
          <button type="button" className="editor-add" onClick={() => edit({ components: [...form.components, blankComponent()] })}>
            + Add Component
          </button>
        </section>

        {/* ---- Steps ---- */}
        <section className="editor-card">
          <h3>Steps ({form.steps.length})</h3>
          {form.steps.map((s, i) => (
            <div className="editor-step" key={s.key}>
              <div className="editor-step-head">
                <strong>Step {i + 1}</strong>
                <ItemControls
                  label={`step ${i + 1}`} index={i} count={form.steps.length}
                  onMove={(by) => edit({ steps: moveItem(form.steps, i, by) })}
                  onRemove={() => edit({ steps: removeAt(form.steps, i) })}
                />
              </div>
              <div className="editor-grid">
                <Field label="Step title" wide>
                  <input value={s.title} onChange={(e) => editStep(s.key, { title: e.target.value })} required />
                </Field>
                <Field label="Type">
                  <select value={s.type} onChange={(e) => editStep(s.key, { type: e.target.value as StepType })}>
                    {STEP_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Instruction" full>
                  <textarea rows={3} value={s.instruction} onChange={(e) => editStep(s.key, { instruction: e.target.value })} />
                </Field>
                <div className="field-full media-row">
                  <MediaField label="Picture" kind="image" value={s.imageUrl} onChange={(url) => editStep(s.key, { imageUrl: url })} />
                  <MediaField label="3D model" kind="model" value={s.modelUrl} onChange={(url) => editStep(s.key, { modelUrl: url })} />
                </div>
                {s.type === "arduino" && (
                  <>
                    <Field label="Code title (what the program does)" full>
                      <input
                        placeholder="e.g. LED Blink: turns the LED on pin 13 on and off every second"
                        value={s.codeTitle ?? ""}
                        onChange={(e) => editStep(s.key, { codeTitle: e.target.value })}
                      />
                    </Field>
                    <Field label="Arduino code" full>
                      <textarea
                        className="editor-code" rows={12} spellCheck={false}
                        value={s.code ?? ""}
                        onChange={(e) => editStep(s.key, { code: e.target.value })}
                      />
                    </Field>
                  </>
                )}
              </div>
            </div>
          ))}
          <button type="button" className="editor-add" onClick={() => edit({ steps: [...form.steps, blankStep()] })}>
            + Add Step
          </button>
        </section>

        </fieldset>

        {editable && <div className="editor-footer">{saveButton}</div>}
      </form>
      {toast}
    </Layout>
  );
}

// A labelled form field. `wide` spans 2 of the 3 grid columns, `full` spans all 3.
function Field({ label, wide, full, children }: { label: string; wide?: boolean; full?: boolean; children: ReactNode }) {
  const size = full ? " field-full" : wide ? " field-wide" : "";
  return (
    <label className={`admin-field${size}`}>
      {label}
      {children}
    </label>
  );
}

// Move up / move down / remove buttons for one row of a list.
function ItemControls({ label, index, count, onMove, onRemove }: {
  label: string; index: number; count: number; onMove: (by: number) => void; onRemove: () => void;
}) {
  return (
    <div className="item-controls">
      <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Move ${label} up`}>↑</button>
      <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`Move ${label} down`}>↓</button>
      <button type="button" className="item-remove" onClick={onRemove} aria-label={`Remove ${label}`}>✕</button>
    </div>
  );
}

import { LEVELS } from "../../lib/levels";
import type { AdminModuleRow, AdminStats, ModuleStatus } from "../../types";

// The three statuses, in the order their colours are stacked in the bar chart.
// Colours checked with a colour-blindness validator (see --chart-* in index.css).
const STATUSES: { key: ModuleStatus; label: string }[] = [
  { key: "published", label: "Published" },
  { key: "draft", label: "Draft" },
  { key: "archived", label: "Archived" },
];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Summary numbers, then the two charts. `modules` is the live table data, so the
// tiles and the level chart update the moment a module is published or deleted.
export default function DashboardCharts({
  modules,
  stats,
}: {
  modules: AdminModuleRow[];
  stats: AdminStats;
}) {
  const count = (status: ModuleStatus) =>
    modules.filter((m) => m.status === status).length;
  const published = count("published");
  const steps = modules.reduce((sum, m) => sum + m.stepCount, 0);

  const tiles = [
    {
      label: "Modules",
      value: modules.length,
      note: `${plural(count("draft"), "draft")}, ${count("archived")} archived`,
    },
    { label: "Published", value: published, note: "visible to students" },
    { label: "Lesson steps", value: steps, note: "in all modules" },
    {
      label: "Arduino programs",
      value: stats.arduinoPrograms,
      note: "not counting archived",
    },
  ];

  return (
    <>
      <section className="stat-tiles" aria-label="Summary">
        {tiles.map((t) => (
          <div className="stat-tile" key={t.label}>
            <span className="stat-label">{t.label}</span>
            <strong className="stat-value">{t.value}</strong>
            <span className="stat-note">{t.note}</span>
          </div>
        ))}
      </section>

      <section className="chart-grid">
        <LevelChart modules={modules} />
        <ComponentChart components={stats.topComponents} />
      </section>
    </>
  );
}

// Stacked bars: one bar per level, split into published / draft / archived.
function LevelChart({ modules }: { modules: AdminModuleRow[] }) {
  const rows = LEVELS.map((level) => {
    const counts = Object.fromEntries(
      STATUSES.map((s) => [
        s.key,
        modules.filter((m) => m.level === level.key && m.status === s.key)
          .length,
      ]),
    ) as Record<ModuleStatus, number>;
    return {
      level,
      counts,
      total: modules.filter((m) => m.level === level.key).length,
    };
  });
  const max = Math.max(1, ...rows.map((r) => r.total)); // longest bar fills the track

  return (
    <figure className="chart-card">
      <figcaption>
        <h3>Modules per level</h3>
        <ul className="chart-legend">
          {STATUSES.map((s) => (
            <li key={s.key}>
              <span className={`swatch chart-${s.key}`} aria-hidden="true" />
              {s.label}
            </li>
          ))}
        </ul>
      </figcaption>

      {rows.map(({ level, counts, total }) => (
        <div className="chart-row" key={level.key}>
          <span className="chart-label">{level.title}</span>
          <div className="chart-track">
            {/* the bar's length is its share of the biggest level */}
            <div
              className="chart-bar"
              style={{ width: `${(total / max) * 100}%` }}
            >
              {/* The number inside a segment only when the bar is split; the total is at the tip anyway */}
              {STATUSES.filter((s) => counts[s.key] > 0).map((s, _, shown) => (
                <span
                  key={s.key}
                  className={`chart-segment chart-${s.key}`}
                  style={{ flexGrow: counts[s.key] }}
                  tabIndex={0}
                  data-tip={`${level.title} · ${s.label}: ${plural(counts[s.key], "module")}`}
                  aria-label={`${level.title}, ${s.label}: ${counts[s.key]}`}
                >
                  {shown.length > 1 && counts[s.key]}
                </span>
              ))}
            </div>
            <span className="chart-value">{total}</span>
          </div>
        </div>
      ))}
    </figure>
  );
}

// Plain bars: the parts used by the most modules (what the crate needs most).
function ComponentChart({
  components,
}: {
  components: AdminStats["topComponents"];
}) {
  const max = Math.max(1, ...components.map((c) => c.modules));

  return (
    <figure className="chart-card">
      <figcaption>
        <h3>Most used components</h3>
        <p className="chart-sub">Number of modules that use each part</p>
      </figcaption>

      {components.length === 0 && (
        <p className="chart-sub">No components added yet.</p>
      )}
      {components.map((c) => (
        <div className="chart-row" key={c.name}>
          <span className="chart-label" title={c.name}>
            {c.name}
          </span>
          <div className="chart-track">
            <div
              className="chart-bar"
              style={{ width: `${(c.modules / max) * 100}%` }}
            >
              <span
                className="chart-segment chart-single"
                style={{ flexGrow: 1 }}
                tabIndex={0}
                data-tip={`${c.name}: used in ${plural(c.modules, "module")}, ${c.quantity} needed in total`}
                aria-label={`${c.name}: ${c.modules} modules, ${c.quantity} pieces`}
              />
            </div>
            <span className="chart-value">{c.modules}</span>
          </div>
        </div>
      ))}
    </figure>
  );
}

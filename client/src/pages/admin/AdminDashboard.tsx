import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ApiError,
  createModule,
  deleteModule,
  getAdminModule,
  getAdminModules,
  getAdminStats,
  getMe,
  logout,
  setModuleStatus,
} from "../../api";
import AsyncView from "../../components/AsyncView";
import Layout from "../../components/Layout";
import NavButton from "../../components/NavButton";
import { useFetch } from "../../hooks/useFetch";
import { useToast } from "../../hooks/useToast";
import { LEVELS, levelTitle } from "../../lib/levels";
import { downloadModule, readModuleFile } from "../../lib/moduleFile";
import type {
  AdminModuleRow,
  AdminStats,
  Level,
  Me,
  ModuleStatus,
} from "../../types";
import DashboardCharts from "./DashboardCharts";

export default function AdminDashboard() {
  // Not logged in? The server answers 401 and AsyncView sends you to the login page.
  // The modules, "who am I" and the chart numbers load at the same time.
  const state = useFetch(
    () => Promise.all([getAdminModules(), getMe(), getAdminStats()]),
    "admin-dashboard",
  );

  return (
    <AsyncView state={state} what="modules">
      {([modules, me, stats]) => (
        <ModuleTable initial={modules} me={me} initialStats={stats} />
      )}
    </AsyncView>
  );
}

// ---- Search, filters and sorting for the table ----
type SortKey = "title" | "level" | "status" | "stepCount" | "updatedAt";
interface Sort {
  key: SortKey;
  ascending: boolean;
}

const LEVEL_ORDER = LEVELS.map((l) => l.key);
const STATUS_ORDER: ModuleStatus[] = ["published", "draft", "archived"];

// How two rows compare for each column (negative = a comes first).
const compare: Record<
  SortKey,
  (a: AdminModuleRow, b: AdminModuleRow) => number
> = {
  title: (a, b) => a.title.localeCompare(b.title),
  level: (a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level),
  status: (a, b) =>
    STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
  stepCount: (a, b) => a.stepCount - b.stepCount,
  updatedAt: (a, b) => a.updatedAt.localeCompare(b.updatedAt), // ISO dates sort as text
};

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "level", label: "Level" },
  { key: "status", label: "Status" },
  { key: "stepCount", label: "Steps" },
  { key: "updatedAt", label: "Last Updated" },
];

// The table keeps its own copy of the rows, so a publish or delete updates
// that one row right away instead of reloading the whole page.
function ModuleTable({
  initial,
  me,
  initialStats,
}: {
  initial: AdminModuleRow[];
  me: Me;
  initialStats: AdminStats;
}) {
  const navigate = useNavigate();
  const [modules, setModules] = useState(initial);
  const [stats, setStats] = useState(initialStats);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<Level | "">(""); // "" = all levels
  const [status, setStatus] = useState<ModuleStatus | "">(""); // "" = all statuses
  const [sort, setSort] = useState<Sort | null>(null); // null = the server's order (level, then position)
  const [busyId, setBusyId] = useState<string | null>(null); // the row waiting for the server
  const [toast, showToast] = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  // Runs one server action for one row; shows its error, or the login page if the login ran out.
  async function run(id: string, action: () => Promise<void>) {
    setBusyId(id);
    try {
      await action();
      getAdminStats().then(setStats, () => {}); // the chart numbers may have changed
    } catch (err) {
      if (err instanceof ApiError && err.status === 401)
        navigate("/admin/login", { replace: true });
      else
        showToast(
          err instanceof Error ? err.message : "Something went wrong",
          "error",
        );
    } finally {
      setBusyId(null);
    }
  }

  const changeStatus = (row: AdminModuleRow, status: ModuleStatus) =>
    run(row.id, async () => {
      await setModuleStatus(row.id, status);
      setModules((list) =>
        list.map((m) =>
          m.id === row.id
            ? { ...m, status, updatedAt: new Date().toISOString() }
            : m,
        ),
      );
      showToast(`"${row.title}" is now ${status}`);
    });

  const remove = (row: AdminModuleRow) => {
    const sure = window.confirm(
      `Delete "${row.title}" for good? Its components and steps are deleted too.\n\n` +
        "To hide it but keep it, use Archive instead.",
    );
    if (!sure) return;
    run(row.id, async () => {
      await deleteModule(row.id);
      setModules((list) => list.filter((m) => m.id !== row.id));
      showToast(`Deleted "${row.title}"`);
    });
  };

  const exportModule = (row: AdminModuleRow) =>
    run(row.id, async () => downloadModule(await getAdminModule(row.id)));

  // Each chosen file becomes a new draft module and a new row at the bottom of the table.
  const importFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = ""; // so choosing the same file again still works
    run("import", async () => {
      const imported: string[] = [];
      for (const file of files) {
        const module = await readModuleFile(file);
        const { id } = await createModule(module).catch((err: unknown) => {
          // Say which file the server refused (e.g. "traffic.json": Title is required.)
          throw err instanceof ApiError && err.status === 400
            ? new ApiError(`"${file.name}": ${err.message}`, 400)
            : err;
        });
        const row: AdminModuleRow = {
          id,
          title: module.title.trim(),
          level: module.level,
          status: "draft",
          stepCount: module.steps?.length ?? 0,
          updatedAt: new Date().toISOString(),
        };
        setModules((list) => [...list, row]);
        imported.push(row.title);
      }
      showToast(
        `Imported as draft: ${imported.join(", ")}. Check ${files.length > 1 ? "them" : "it"}, then publish.`,
      );
    });
  };

  // The rows to show: search and filters first, then the chosen sort.
  // useMemo: only recalculated when the rows, the filters or the sort change.
  const visible = useMemo(() => {
    const text = search.trim().toLowerCase();
    const rows = modules.filter(
      (m) =>
        m.title.toLowerCase().includes(text) &&
        (!level || m.level === level) &&
        (!status || m.status === status),
    );
    if (sort)
      rows.sort((a, b) => compare[sort.key](a, b) * (sort.ascending ? 1 : -1));
    return rows;
  }, [modules, search, level, status, sort]);

  const filtering = search !== "" || level !== "" || status !== "";
  const clearFilters = () => {
    setSearch("");
    setLevel("");
    setStatus("");
  };

  // Click a column once: A to Z. Again: Z to A.
  const sortBy = (key: SortKey) =>
    setSort((current) => ({
      key,
      ascending: current?.key === key ? !current.ascending : true,
    }));

  const handleLogout = async () => {
    await logout().catch(() => {}); // leave even if the server can't be reached
    navigate("/admin/login", { replace: true });
  };

  return (
    <Layout subtitle="Admin Panel" className="admin-container" admin>
      <div className="admin-toolbar">
        <div>
          <h2>All Modules ({modules.length})</h2>
          <span className="save-state">
            Signed in as {me.displayName} (
            {me.role === "admin" ? "Admin" : "Teacher"})
          </span>
        </div>
        <div className="admin-toolbar-actions">
          {/* Stays logged in, so the admin can check the student pages */}
          <NavButton to="/">← Student View</NavButton>
          {me.role === "admin" && (
            <NavButton to="/admin/accounts">Accounts</NavButton>
          )}
          <button className="lesson-back-button" onClick={handleLogout}>
            Log Out
          </button>
          <button
            className="lesson-back-button"
            onClick={() => fileInput.current?.click()}
            disabled={busyId === "import"}
          >
            {busyId === "import" ? "Importing..." : "Import"}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            multiple
            hidden
            onChange={importFiles}
          />
          <NavButton to="/admin/modules/new" className="next-button">
            + New Module
          </NavButton>
        </div>
      </div>

      <DashboardCharts modules={modules} stats={stats} />

      <div className="table-controls">
        <input
          type="search"
          className="table-search"
          placeholder="Search titles..."
          aria-label="Search module titles"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Filter by level"
          value={level}
          onChange={(e) => setLevel(e.target.value as Level | "")}
        >
          <option value="">All levels</option>
          {LEVELS.map((l) => (
            <option key={l.key} value={l.key}>
              {l.title}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value as ModuleStatus | "")}
        >
          <option value="">All statuses</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <span className="table-count">
          Showing {visible.length} of {modules.length}
        </span>
        {filtering && (
          <button className="table-action" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {COLUMNS.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    aria-sort={
                      active
                        ? sort.ascending
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <button
                      className="sort-button"
                      onClick={() => sortBy(c.key)}
                    >
                      {c.label}
                      <span aria-hidden="true">
                        {active ? (sort.ascending ? " ▲" : " ▼") : " ↕"}
                      </span>
                    </button>
                  </th>
                );
              })}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="table-empty">
                  {filtering
                    ? "No modules match the search or filters."
                    : "No modules yet. Click + New Module."}
                </td>
              </tr>
            )}
            {visible.map((m) => {
              const busy = busyId === m.id;
              const published = m.status === "published";
              return (
                <tr key={m.id}>
                  <td>{m.title}</td>
                  <td>{levelTitle(m.level)}</td>
                  <td>
                    <span className={`status-pill status-${m.status}`}>
                      {m.status}
                    </span>
                  </td>
                  <td>{m.stepCount}</td>
                  <td>{new Date(m.updatedAt).toLocaleDateString()}</td>
                  <td>
                    <div className="table-actions">
                      <NavButton
                        to={`/admin/modules/${m.id}`}
                        className="table-action"
                        disabled={busy}
                      >
                        Edit
                      </NavButton>
                      {/* Published -> back to draft; draft or archived -> published */}
                      <button
                        className="table-action"
                        disabled={busy}
                        onClick={() =>
                          changeStatus(m, published ? "draft" : "published")
                        }
                      >
                        {published ? "Unpublish" : "Publish"}
                      </button>
                      {m.status !== "archived" && (
                        <button
                          className="table-action"
                          disabled={busy}
                          onClick={() => changeStatus(m, "archived")}
                        >
                          Archive
                        </button>
                      )}
                      <button
                        className="table-action"
                        disabled={busy}
                        onClick={() => exportModule(m)}
                      >
                        Export
                      </button>
                      <button
                        className="table-action danger"
                        disabled={busy}
                        onClick={() => remove(m)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {toast}
    </Layout>
  );
}

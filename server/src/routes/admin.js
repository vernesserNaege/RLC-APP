// STAFF routes: every route in this file needs a login (the main admin or a teacher).
// The accounts routes inside need the main admin.
import express, { Router } from "express";
import { requireAdmin, requireLogin } from "../auth.js";
import { query } from "../db.js";
import {
  STATUSES,
  checkId,
  createModule,
  getModule,
  getStatus,
  notFound,
  updateModule,
  validateModule,
} from "../moduleStore.js";
import { detectFileType, saveFile } from "../storage.js";
import accountsRouter from "./accounts.js";

const router = Router();
router.use(requireLogin);
router.use("/accounts", requireAdmin, accountsRouter);
router.param("id", checkId);

// GET /api/admin/modules -> every module, whatever its status, with its step count
router.get("/modules", async (req, res) => {
  const { rows } = await query(
    `SELECT m.id, m.title, m.level, m.status, m.created_by AS "createdBy",
            m.updated_at AS "updatedAt", COUNT(s.id)::int AS "stepCount"
     FROM modules m
     LEFT JOIN module_steps s ON s.module_id = m.id
     GROUP BY m.id
     ORDER BY m.level, m.sort_order, m.created_at`,
  );
  res.json(rows);
});

// GET /api/admin/stats -> numbers for the dashboard charts that only the database can count.
// (Modules per level and status are counted in the browser from the module list.)
// Archived modules are left out: they are not in use.
router.get("/stats", async (req, res) => {
  const [programs, components] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS count
       FROM module_steps s JOIN modules m ON m.id = s.module_id
       WHERE m.status <> 'archived' AND s.code IS NOT NULL`,
    ),
    // The 8 parts used by the most modules. "LED" and "led" count as the same part.
    query(
      `SELECT MIN(c.name) AS name,
              COUNT(DISTINCT c.module_id)::int AS modules,
              SUM(c.quantity)::int AS quantity
       FROM module_components c JOIN modules m ON m.id = c.module_id
       WHERE m.status <> 'archived'
       GROUP BY lower(c.name)
       ORDER BY modules DESC, quantity DESC, name
       LIMIT 8`,
    ),
  ]);
  res.json({ arduinoPrograms: programs.rows[0].count, topComponents: components.rows });
});

// GET /api/admin/modules/:id -> one module of any status, for the editor
router.get("/modules/:id", async (req, res) => {
  const module = await getModule(req.params.id);
  if (!module) return notFound(res);
  res.json(module);
});

// 409 Conflict: the module exists, but its status doesn't allow this.
const locked = (res, message) => res.status(409).json({ error: message });

// POST /api/admin/modules -> create a module, archived (hidden) until it is unarchived   (body: the whole module)
// The logged-in staff member is saved as the one who added it.
router.post("/modules", async (req, res) => {
  const { module, error } = validateModule(req.body);
  if (error) return res.status(400).json({ error });

  const id = await createModule(module, req.user.displayName);
  res.status(201).json({ id });
});

// PUT /api/admin/modules/:id -> save changes   (body: the whole module)
// Only archived modules can be edited; published ones are locked (archive them first).
router.put("/modules/:id", async (req, res) => {
  const { module, error } = validateModule(req.body);
  if (error) return res.status(400).json({ error });

  if (await updateModule(req.params.id, module)) return res.json({ id: req.params.id });
  if (!(await getStatus(req.params.id))) return notFound(res);
  locked(res, "Published modules can't be edited. Archive it first, then edit it.");
});

// PATCH /api/admin/modules/:id/status -> archive or unarchive   (body: { status })
// published -> archived (Archive), archived -> published (Unarchive).
router.patch("/modules/:id/status", async (req, res) => {
  const { status } = req.body ?? {};
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(", ")}.` });
  }

  const current = await getStatus(req.params.id);
  if (!current) return notFound(res);
  if (current === status) return locked(res, `This module is already ${status}.`);

  await query("UPDATE modules SET status = $2, updated_at = now() WHERE id = $1", [req.params.id, status]);
  res.json({ id: req.params.id, status });
});

// DELETE /api/admin/modules/:id -> delete for good, whatever its status
// (its components and steps go with it)
router.delete("/modules/:id", async (req, res) => {
  const { rowCount } = await query("DELETE FROM modules WHERE id = $1", [req.params.id]);
  if (rowCount === 0) return notFound(res);
  res.sendStatus(204);
});

// POST /api/admin/uploads?kind=image|model -> { url }
// The body is the file itself (not JSON), up to 20 MB.
router.post("/uploads", express.raw({ type: () => true, limit: "20mb" }), async (req, res) => {
  const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const type = detectFileType(buffer);
  const wanted = req.query.kind === "model" ? "model" : "image";

  if (!type || type.kind !== wanted) {
    return res.status(400).json({
      error: wanted === "model" ? "3D models must be .glb files." : "Pictures must be JPG, PNG, WebP or GIF files.",
    });
  }
  if (buffer.length > type.maxMB * 1024 * 1024) {
    return res.status(400).json({ error: `${wanted === "model" ? "3D models" : "Pictures"} must be ${type.maxMB} MB or smaller.` });
  }

  try {
    res.status(201).json({ url: await saveFile(buffer, type) });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: err.message }); // e.g. Cloudinary is unreachable or the key is wrong
  }
});

export default router;

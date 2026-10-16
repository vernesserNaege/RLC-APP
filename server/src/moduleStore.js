// Everything about reading, checking and saving modules, shared by the student and admin routes.
import { query, transaction } from "./db.js";

export const LEVELS = ["beginner", "intermediate", "projects"];
// published = students see it, locked.  archived = hidden, editable (new modules start here).
// Archive and Unarchive switch between the two.
export const STATUSES = ["published", "archived"];
export const STEP_TYPES = ["instruction", "arduino", "test"];

// 8-4-4-4-12 hex digits, e.g. 62d47c9c-fff2-45dd-bf90-89333cf5dbe8
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const notFound = (res) => res.status(404).json({ error: "Module not found" });

// Used as router.param("id", checkId): every route with :id rejects a badly formed id
// before it reaches the database.
export const checkId = (req, res, next, id) => (UUID.test(id) ? next() : notFound(res));

// ---- Reading ----

// One module with its components and steps, or null if there is none.
// publishedOnly: true for students (drafts and archived modules stay hidden).
export async function getModule(id, { publishedOnly = false } = {}) {
  const [module, components, steps] = await Promise.all([
    query(
      `SELECT id, title, level, status, short_description AS "shortDescription",
              description, objective, duration_minutes AS "durationMinutes",
              cover_image_url AS "coverImageUrl", created_by AS "createdBy",
              updated_at AS "updatedAt"
       FROM modules
       WHERE id = $1 AND (NOT $2::boolean OR status = 'published')`,
      [id, publishedOnly],
    ),
    query(
      `SELECT id, name, compartment, quantity
       FROM module_components WHERE module_id = $1 ORDER BY sort_order`,
      [id],
    ),
    query(
      `SELECT id, step_number AS number, title, type, instruction,
              code_title AS "codeTitle", code,
              image_url AS "imageUrl", model_url AS "modelUrl"
       FROM module_steps WHERE module_id = $1 ORDER BY step_number`,
      [id],
    ),
  ]);

  if (module.rows.length === 0) return null;
  return { ...module.rows[0], components: components.rows, steps: steps.rows };
}

// ---- Checking what the admin sent ----

const text = (value) => (typeof value === "string" ? value.trim() : "");
const textOrNull = (value) => text(value) || null;
const isWholeNumber = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
// Picture and 3D model links must come from Cloudinary (https://) or this server (/uploads/).
const isMediaLink = (url) => url === null || /^(https:\/\/|\/uploads\/)/.test(url);

// Cleans up the data from the editor and lists every problem.
// Returns { module } when it is valid, or { error } with all the problems in one message.
export function validateModule(input) {
  const m = input ?? {};
  const errors = [];

  if (m.components !== undefined && !Array.isArray(m.components)) errors.push("Components must be a list.");
  if (m.steps !== undefined && !Array.isArray(m.steps)) errors.push("Steps must be a list.");

  const module = {
    title: text(m.title),
    level: m.level,
    shortDescription: text(m.shortDescription),
    description: text(m.description),
    objective: text(m.objective),
    durationMinutes: Number(m.durationMinutes ?? 30),
    coverImageUrl: textOrNull(m.coverImageUrl),
    components: (Array.isArray(m.components) ? m.components : []).map((c) => ({
      name: text(c?.name),
      compartment: text(c?.compartment),
      quantity: Number(c?.quantity ?? 1),
    })),
    steps: (Array.isArray(m.steps) ? m.steps : []).map((s) => {
      const type = s?.type ?? "instruction";
      const isArduino = type === "arduino";
      return {
        title: text(s?.title),
        type,
        instruction: text(s?.instruction),
        // Only Arduino steps keep a code title and code.
        codeTitle: isArduino ? textOrNull(s.codeTitle) : null,
        code: isArduino ? textOrNull(s.code) : null,
        imageUrl: textOrNull(s?.imageUrl),
        modelUrl: textOrNull(s?.modelUrl),
      };
    }),
  };

  if (!module.title) errors.push("Title is required.");
  if (module.title.length > 200) errors.push("Title must be 200 characters or less.");
  if (!LEVELS.includes(module.level)) errors.push(`Level must be one of: ${LEVELS.join(", ")}.`);
  if (!isWholeNumber(module.durationMinutes, 1, 600)) {
    errors.push("Duration must be a whole number of minutes from 1 to 600.");
  }
  if (!isMediaLink(module.coverImageUrl)) errors.push("The cover picture link is not valid.");

  module.components.forEach((c, i) => {
    if (!c.name) errors.push(`Component ${i + 1}: name is required.`);
    if (!isWholeNumber(c.quantity, 1, 999)) errors.push(`Component ${i + 1}: quantity must be from 1 to 999.`);
  });

  module.steps.forEach((s, i) => {
    if (!s.title) errors.push(`Step ${i + 1}: title is required.`);
    if (!STEP_TYPES.includes(s.type)) errors.push(`Step ${i + 1}: type must be one of: ${STEP_TYPES.join(", ")}.`);
    if (!isMediaLink(s.imageUrl) || !isMediaLink(s.modelUrl)) errors.push(`Step ${i + 1}: a picture or 3D model link is not valid.`);
  });

  return errors.length > 0 ? { error: errors.join(" ") } : { module };
}

// ---- Saving ----

// The module's own columns, in the order the INSERT and UPDATE below use them.
// The status is not here: it only changes through PATCH /api/admin/modules/:id/status.
const moduleValues = (m) => [
  m.title, m.level, m.shortDescription, m.description, m.objective, m.durationMinutes, m.coverImageUrl,
];

// [{ name: "LED" }, { name: "Wire" }] -> ["LED", "Wire"]
const column = (list, key) => list.map((item) => item[key]);

// Writes all components and all steps with one INSERT each.
// unnest(...) turns the lists into rows; WITH ORDINALITY numbers them 1, 2, 3... in list order,
// which becomes the components' sort order and the steps' step numbers.
async function saveContents(db, moduleId, { components, steps }) {
  await db.query(
    `INSERT INTO module_components (module_id, name, compartment, quantity, sort_order)
     SELECT $1, c.name, c.compartment, c.quantity, c.n - 1
     FROM unnest($2::text[], $3::text[], $4::int[])
          WITH ORDINALITY AS c(name, compartment, quantity, n)`,
    [moduleId, column(components, "name"), column(components, "compartment"), column(components, "quantity")],
  );

  await db.query(
    `INSERT INTO module_steps
       (module_id, step_number, title, type, instruction, code_title, code, image_url, model_url)
     SELECT $1, s.n, s.title, s.type, s.instruction, s.code_title, s.code, s.image_url, s.model_url
     FROM unnest($2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[])
          WITH ORDINALITY AS s(title, type, instruction, code_title, code, image_url, model_url, n)`,
    [
      moduleId,
      ...["title", "type", "instruction", "codeTitle", "code", "imageUrl", "modelUrl"].map((key) =>
        column(steps, key),
      ),
    ],
  );
}

// Creates a module (archived: hidden and editable) with its components and steps. Returns the new id.
// createdBy: the name of the staff member who added it.
export function createModule(m, createdBy) {
  return transaction(async (db) => {
    const { rows } = await db.query(
      `INSERT INTO modules
         (title, level, short_description, description, objective, duration_minutes,
          cover_image_url, created_by, status, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'archived',
               (SELECT COALESCE(MAX(sort_order) + 1, 0) FROM modules WHERE level = $2))
       RETURNING id`,
      [...moduleValues(m), createdBy],
    );
    await saveContents(db, rows[0].id, m);
    return rows[0].id;
  });
}

// The module's status, or null if there is no module with this id.
export async function getStatus(id) {
  const { rows } = await query("SELECT status FROM modules WHERE id = $1", [id]);
  return rows[0]?.status ?? null;
}

// Replaces a module's details, components and steps.
// Returns false if there is no archived module with this id (missing, or published = locked).
export function updateModule(id, m) {
  return transaction(async (db) => {
    const { rowCount } = await db.query(
      `UPDATE modules
       SET title = $2, level = $3, short_description = $4, description = $5, objective = $6,
           duration_minutes = $7, cover_image_url = $8, updated_at = now()
       WHERE id = $1 AND status = 'archived'`,
      [id, ...moduleValues(m)],
    );
    if (rowCount === 0) return false;

    // Simplest correct way to save a reordered list: remove the old rows, insert the new ones.
    await db.query("DELETE FROM module_components WHERE module_id = $1", [id]);
    await db.query("DELETE FROM module_steps WHERE module_id = $1", [id]);
    await saveContents(db, id, m);
    return true;
  });
}

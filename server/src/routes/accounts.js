// Staff accounts: only admins can see, create, reset, promote or delete them.
// This is the only way to make an account, so students cannot sign themselves up.
// New accounts start as teachers; an admin can then make them admins too.
import { Router } from "express";
import { hashPassword, isMainAdminName } from "../auth.js";
import { query } from "../db.js";

const router = Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USERNAME = /^[a-z0-9._-]{3,30}$/i; // 3 to 30 letters, numbers, dots, dashes or underscores
const MIN_PASSWORD = 8;
const ROLES = ["teacher", "admin"];

const notFound = (res) => res.status(404).json({ error: "Account not found" });
router.param("id", (req, res, next, id) => (UUID.test(id) ? next() : notFound(res)));

const passwordProblem = (password) =>
  typeof password !== "string" || password.length < MIN_PASSWORD
    ? `The password must be at least ${MIN_PASSWORD} characters.`
    : null;

const ACCOUNT_COLUMNS = `id, username, display_name AS "displayName", role, created_at AS "createdAt"`;

// Nobody can change their own role or delete themselves, so an admin can't lock themselves out.
const isSelf = (req) => req.params.id === req.user.id;

// GET /api/admin/accounts -> every staff account (never the password hashes)
router.get("/", async (req, res) => {
  const { rows } = await query(`SELECT ${ACCOUNT_COLUMNS} FROM users ORDER BY lower(display_name), lower(username)`);
  res.json(rows);
});

// POST /api/admin/accounts  { displayName, username, password } -> the new account
router.post("/", async (req, res) => {
  const { displayName, username, password } = req.body ?? {};
  const name = typeof displayName === "string" ? displayName.trim() : "";
  const user = typeof username === "string" ? username.trim() : "";

  const problem =
    (!name && "Name is required.") ||
    (name.length > 80 && "Name must be 80 characters or less.") ||
    (!USERNAME.test(user) && "Username must be 3 to 30 letters, numbers, dots, dashes or underscores (no spaces).") ||
    passwordProblem(password);
  if (problem) return res.status(400).json({ error: problem });

  if (isMainAdminName(user)) return res.status(409).json({ error: "That username is taken." });
  try {
    const { rows } = await query(
      `INSERT INTO users (username, display_name, password_hash) VALUES ($1, $2, $3)
       RETURNING ${ACCOUNT_COLUMNS}`,
      [user, name, await hashPassword(password)],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "That username is taken." }); // unique index
    throw err;
  }
});

// PUT /api/admin/accounts/:id/password  { password } -> set a new password (e.g. a teacher forgot theirs)
router.put("/:id/password", async (req, res) => {
  const problem = passwordProblem(req.body?.password);
  if (problem) return res.status(400).json({ error: problem });

  const { rowCount } = await query("UPDATE users SET password_hash = $2 WHERE id = $1", [
    req.params.id,
    await hashPassword(req.body.password),
  ]);
  if (rowCount === 0) return notFound(res);
  res.json({ ok: true });
});

// PUT /api/admin/accounts/:id/role  { role: "teacher" | "admin" } -> promote or demote
router.put("/:id/role", async (req, res) => {
  const { role } = req.body ?? {};
  if (!ROLES.includes(role)) return res.status(400).json({ error: "Role must be teacher or admin." });
  if (isSelf(req)) return res.status(400).json({ error: "You can't change your own role." });

  const { rows } = await query(`UPDATE users SET role = $2 WHERE id = $1 RETURNING ${ACCOUNT_COLUMNS}`, [
    req.params.id,
    role,
  ]);
  if (rows.length === 0) return notFound(res);
  res.json(rows[0]);
});

// DELETE /api/admin/accounts/:id -> remove the account; that person is logged out at once
router.delete("/:id", async (req, res) => {
  if (isSelf(req)) return res.status(400).json({ error: "You can't delete your own account." });
  const { rowCount } = await query("DELETE FROM users WHERE id = $1", [req.params.id]);
  if (rowCount === 0) return notFound(res);
  res.sendStatus(204);
});

export default router;

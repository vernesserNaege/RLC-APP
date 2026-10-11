// Logging in and out, for the main admin and the teachers.
import { Router } from "express";
import { COOKIE, SESSION_MS, checkLogin, cookieOptions, createSessionToken, requireLogin } from "../auth.js";

const router = Router();

// Brute-force protection: 5 wrong passwords from one computer -> locked for 15 minutes.
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;
const failures = new Map(); // ip -> { count, since }

function isLocked(ip) {
  const record = failures.get(ip);
  if (record && Date.now() - record.since > LOCK_MS) failures.delete(ip);
  return (failures.get(ip)?.count ?? 0) >= MAX_FAILURES;
}

function recordFailure(ip) {
  const record = failures.get(ip) ?? { count: 0, since: Date.now() };
  record.count += 1;
  failures.set(ip, record);
}

// POST /api/auth/login  { username, password }
router.post("/login", async (req, res) => {
  if (isLocked(req.ip)) {
    return res.status(429).json({ error: "Too many failed attempts. Try again in 15 minutes." });
  }

  const { username, password } = req.body ?? {};
  const account =
    typeof username === "string" && typeof password === "string"
      ? await checkLogin(username.trim(), password)
      : null;

  if (!account) {
    recordFailure(req.ip);
    // Same message either way, so nobody can tell which part was wrong.
    return res.status(401).json({ error: "Wrong username or password" });
  }

  failures.delete(req.ip);
  res.cookie(COOKIE, createSessionToken(account.id), { ...cookieOptions, maxAge: SESSION_MS });
  res.json(account);
});

// GET /api/auth/me -> who is logged in (the dashboard shows the name and the admin-only buttons)
router.get("/me", requireLogin, (req, res) => {
  res.json(req.user);
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE, cookieOptions);
  res.json({ ok: true });
});

export default router;
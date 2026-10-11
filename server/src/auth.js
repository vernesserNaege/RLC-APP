// Login helpers for the main admin (.env) and the teacher accounts (users table).
// Uses only Node's built-in crypto module, so no extra packages.
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { query } from "./db.js";

const scryptAsync = promisify(scrypt);
const isProd = process.env.NODE_ENV === "production";

export const COOKIE = "rlc_admin";
export const SESSION_MS = 8 * 60 * 60 * 1000; // stay logged in for 8 hours

// httpOnly: page scripts can't read the cookie. In production the site and the API
// are on different domains, so the cookie must be SameSite=None + Secure (HTTPS only).
export const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  path: "/",
};

// ---- Passwords: stored as "salt:hash" (hex), never as plain text ----

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password, stored = "") {
  const [saltHex, hashHex] = stored.split(":");
  const expected = Buffer.from(hashHex ?? "", "hex");
  if (!saltHex || expected.length !== 64) return false;
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), 64);
  return timingSafeEqual(actual, expected);
}

// Checked when a username does not exist, so a wrong username takes as long as a wrong
// password and nobody can find real usernames by timing the answer.
const DUMMY_HASH = await hashPassword(randomBytes(16).toString("hex"));

// ---- Who is who ----

const ADMIN_ID = "admin"; // the .env account is not in the users table, so it gets this fixed id
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const mainAdmin = () => ({
  id: ADMIN_ID,
  username: process.env.ADMIN_USERNAME,
  displayName: "Administrator",
  role: "admin",
});

// Usernames are compared without caring about capitals ("Admin" = "admin").
export const isMainAdminName = (username) =>
  username.toLowerCase() === process.env.ADMIN_USERNAME.toLowerCase();

// The account for this username and password, or null.
export async function checkLogin(username, password) {
  if (isMainAdminName(username)) {
    return (await verifyPassword(password, process.env.ADMIN_PASSWORD_HASH)) ? mainAdmin() : null;
  }
  const { rows } = await query(
    `SELECT id, username, display_name AS "displayName", password_hash AS "hash"
     FROM users WHERE lower(username) = lower($1)`,
    [username],
  );
  const user = rows[0];
  const ok = await verifyPassword(password, user?.hash ?? DUMMY_HASH);
  return user && ok ? { id: user.id, username: user.username, displayName: user.displayName, role: "teacher" } : null;
}

// The account behind a session, read fresh each time, so a deleted teacher is locked out at once.
async function findAccount(id) {
  if (id === ADMIN_ID) return mainAdmin();
  if (!UUID.test(id ?? "")) return null;
  const { rows } = await query(
    `SELECT id, username, display_name AS "displayName" FROM users WHERE id = $1`,
    [id],
  );
  return rows[0] ? { ...rows[0], role: "teacher" } : null;
}

// ---- Session token: "<data>.<signature>", data = { sub: account id, exp: expiry time } ----
// The signature proves the server made the token; changing the data breaks it.

const sign = (text) =>
  createHmac("sha256", process.env.SESSION_SECRET).update(text).digest("base64url");

export function createSessionToken(accountId) {
  const data = Buffer.from(JSON.stringify({ sub: accountId, exp: Date.now() + SESSION_MS })).toString("base64url");
  return `${data}.${sign(data)}`;
}

// The token's data if it is genuine and not expired, otherwise null.
function readSessionToken(token = "") {
  const [data = "", signature = ""] = token.split(".");
  const expected = Buffer.from(sign(data));
  const given = Buffer.from(signature);
  if (!data || given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const session = JSON.parse(Buffer.from(data, "base64url").toString());
    return session.exp > Date.now() ? session : null;
  } catch {
    return null;
  }
}

// Reads one cookie from the request's Cookie header ("a=1; rlc_admin=...").
function readCookie(req, name) {
  return req.headers.cookie
    ?.split(/;\s*/)
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

// ---- Guards to put in front of routes ----

// Any staff account (admin or teacher). Puts the account in req.user.
export async function requireLogin(req, res, next) {
  const session = readSessionToken(readCookie(req, COOKIE));
  const account = session && (await findAccount(session.sub));
  if (!account) return res.status(401).json({ error: "Login required" });
  req.user = account;
  next();
}

// Only the main admin. Use after requireLogin.
export function requireAdmin(req, res, next) {
  if (req.user?.role === "admin") return next();
  res.status(403).json({ error: "Only the admin can do this." });
}
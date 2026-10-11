import express from "express";
import cors from "cors";
import "dotenv/config";
import { query } from "./db.js";
import modulesRouter from "./routes/modules.js";
import authRouter from "./routes/auth.js";
import adminRouter from "./routes/admin.js";
import { UPLOAD_DIR, storageName } from "./storage.js";

// Refuse to start if a required setting is missing from .env.
const required = ["DATABASE_URL", "ADMIN_USERNAME", "ADMIN_PASSWORD_HASH", "SESSION_SECRET"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing in .env: ${missing.join(", ")}`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 4200;

// When hosted behind a proxy (Render), this makes req.ip the real visitor's address.
app.set("trust proxy", 1);

// Only the React app's address may call this API from a browser.
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "1mb" }));

// Health check: used by the hosting service, and later by the Pi to test the connection.
app.get("/api/health", async (req, res) => {
  try {
    await query("SELECT 1");
    res.json({ ok: true, database: "connected" });
  } catch {
    res.status(503).json({ ok: false, database: "unreachable" });
  }
});

// Uploaded files kept on this computer (Phase 2). Their names are random and never reused,
// so browsers may keep them for a week without asking again.
app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "7d", immutable: true }));

app.use("/api/modules", modulesRouter); // students (public, read-only)
app.use("/api/auth", authRouter); // admin login / logout
app.use("/api/admin", adminRouter); // admin only

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

// One place that handles unexpected errors, so the server never crashes
// and never leaks database details to the browser.
app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "That file is too big." });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server" });
});

app.listen(PORT, (err) => {
  if (err) {
    console.error(`Could not start on port ${PORT}:`, err.message);
    process.exit(1);
  }
  console.log(`RLC API running on http://localhost:${PORT}`);
  console.log(`Uploads are saved to: ${storageName}`);
});
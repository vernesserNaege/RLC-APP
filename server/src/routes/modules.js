// PUBLIC routes: what students can reach. Read-only, published modules only.
// Express 5 sends errors from async routes to the error handler in index.js by itself,
// so these routes need no try/catch.
import { Router } from "express";
import { query } from "../db.js";
import { LEVELS, checkId, getModule, notFound } from "../moduleStore.js";

const router = Router();
router.param("id", checkId);

// GET /api/modules?level=beginner -> the cards for one level (or all, without ?level)
router.get("/", async (req, res) => {
  const { level } = req.query;
  if (level !== undefined && !LEVELS.includes(level)) {
    return res
      .status(400)
      .json({ error: `level must be one of: ${LEVELS.join(", ")}` });
  }

  // "AS" names the columns the way React expects, so rows can be sent as they are.
  const { rows } = await query(
    `SELECT id, title, level, short_description AS "shortDescription",
            cover_image_url AS "coverImageUrl"
     FROM modules
     WHERE status = 'published' AND ($1::text IS NULL OR level = $1)
     ORDER BY sort_order, created_at`,
    [level ?? null],
  );
  res.json(rows);
});

// GET /api/modules/:id -> one published module with its components and steps
router.get("/:id", async (req, res) => {
  const module = await getModule(req.params.id, { publishedOnly: true });
  if (!module) return notFound(res);
  res.json(module);
});

export default router;

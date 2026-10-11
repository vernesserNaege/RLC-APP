// npm run db:setup  -> create tables + seed if empty
// npm run db:reset  -> drop everything and re-seed
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pool } from "../src/db.js";
import seedModules from "./seed-data.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const reset = process.argv.includes("--reset");

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (reset) {
      await client.query("DROP TABLE IF EXISTS module_steps, module_components, modules CASCADE");
      console.log("Dropped existing tables.");
    }

    const schema = await readFile(path.join(here, "schema.sql"), "utf8");
    await client.query(schema);
    console.log("Tables ready.");

    const { rows } = await client.query("SELECT COUNT(*)::int AS n FROM modules");
    if (rows[0].n > 0) {
      console.log(`Database already has ${rows[0].n} modules, skipping seed.`);
    } else {
      for (const [index, m] of seedModules.entries()) {
        const inserted = await client.query(
          `INSERT INTO modules
             (title, level, short_description, description, objective, duration_minutes, status, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, 'published', $7)
           RETURNING id`,
          [m.title, m.level, m.shortDescription, m.description, m.objective,
           parseInt(m.duration, 10) || 30, index],
        );
        const moduleId = inserted.rows[0].id;

        for (const [i, c] of m.components.entries()) {
          await client.query(
            `INSERT INTO module_components (module_id, name, compartment, quantity, sort_order)
             VALUES ($1, $2, $3, $4, $5)`,
            [moduleId, c.name, c.compartment, c.quantity, i],
          );
        }

        for (const s of m.steps) {
          await client.query(
            `INSERT INTO module_steps (module_id, step_number, title, type, instruction, code_title, code)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [moduleId, s.number, s.title, s.type, s.instruction, s.codeTitle ?? null, s.code ?? null],
          );
        }
      }
      console.log(`Seeded ${seedModules.length} modules.`);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Database setup failed:");
  console.error(err);
  process.exit(1);
});
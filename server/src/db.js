import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

// DATABASE_URL looks like: postgres://user:password@host:5432/rlc
// Hosted databases (Neon, Supabase, Render) need SSL; a local one does not.
const useSSL = process.env.DATABASE_SSL === "true";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

export const query = (text, params) => pool.query(text, params);

// Runs several queries as one: if any of them fails, none of them is saved.
// `work` receives a client and must use client.query(...) for every query inside.
export async function transaction(work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
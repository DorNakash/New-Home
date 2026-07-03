/**
 * Applies schema.sql to the Neon database.
 *   npm run migrate
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const client = await pool.connect();
  try {
    console.log("Connected to Neon, applying schema.sql...");
    const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
    await client.query(sql);
    console.log("Schema applied.");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});

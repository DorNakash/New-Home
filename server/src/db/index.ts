import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// WebSocket transport (port 443) so this works through networks that block raw Postgres (5432).
neonConfig.webSocketConstructor = ws;

export const pool = new Pool({ connectionString: DATABASE_URL });

pool.on("error", (err: Error) => {
  console.error("Unexpected error on idle Postgres client", err);
});

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function transaction<T>(fn: (client: import("@neondatabase/serverless").PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

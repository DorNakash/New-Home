import { Router } from "express";
import { query, queryOne, transaction } from "../db/index.js";
import { requireAuth } from "../auth/middleware.js";

const router = Router();
router.use(requireAuth);

interface ImportRow {
  name: string;
  room_name: string;
  category_name?: string;
  store_name?: string;
  planned_price?: number | null;
  actual_price?: number | null;
  status?: string;
  priority?: string;
  notes?: string;
  product_url?: string;
  quantity?: number;
  is_required?: boolean;
}

const VALID_STATUSES = new Set(["SEARCHING", "READY_TO_ORDER", "ORDERED", "ARRIVED", "INSTALLED", "CANCELLED"]);
const VALID_PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH"]);

router.delete("/", async (req, res) => {
  const householdId = req.user!.householdId;
  await query(
    `DELETE FROM item_options WHERE item_id IN (SELECT id FROM items WHERE household_id = $1)`,
    [householdId]
  );
  const result = await queryOne<{ count: string }>(
    `WITH deleted AS (DELETE FROM items WHERE household_id = $1 RETURNING id)
     SELECT COUNT(*) AS count FROM deleted`,
    [householdId]
  );
  res.json({ deleted: Number(result?.count ?? 0) });
});

router.post("/", async (req, res) => {
  const rows: ImportRow[] = req.body?.items;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: "אין שורות לייבוא" });
  }
  if (rows.length > 500) {
    return res.status(400).json({ error: "מקסימום 500 שורות בכל פעם" });
  }

  const householdId = req.user!.householdId;

  const result = await transaction(async (client) => {
    const existingRooms = await client.query<{ id: string; name: string }>(
      "SELECT id, name FROM rooms WHERE household_id = $1",
      [householdId]
    );
    const existingCategories = await client.query<{ id: string; name: string }>(
      "SELECT id, name FROM categories WHERE household_id = $1",
      [householdId]
    );
    const existingStores = await client.query<{ id: string; name: string }>(
      "SELECT id, name FROM stores WHERE household_id = $1",
      [householdId]
    );

    const roomMap = new Map(existingRooms.rows.map((r) => [r.name.trim().toLowerCase(), r.id]));
    const categoryMap = new Map(existingCategories.rows.map((c) => [c.name.trim().toLowerCase(), c.id]));
    const storeMap = new Map(existingStores.rows.map((s) => [s.name.trim().toLowerCase(), s.id]));

    async function ensureRoom(name: string) {
      const key = name.trim().toLowerCase();
      if (roomMap.has(key)) return roomMap.get(key)!;
      const r = await client.query<{ id: string }>(
        "INSERT INTO rooms (household_id, name) VALUES ($1, $2) RETURNING id",
        [householdId, name.trim()]
      );
      roomMap.set(key, r.rows[0].id);
      return r.rows[0].id;
    }

    async function ensureCategory(name: string) {
      const key = name.trim().toLowerCase();
      if (categoryMap.has(key)) return categoryMap.get(key)!;
      const c = await client.query<{ id: string }>(
        "INSERT INTO categories (household_id, name) VALUES ($1, $2) RETURNING id",
        [householdId, name.trim()]
      );
      categoryMap.set(key, c.rows[0].id);
      return c.rows[0].id;
    }

    async function ensureStore(name: string) {
      const key = name.trim().toLowerCase();
      if (storeMap.has(key)) return storeMap.get(key)!;
      const s = await client.query<{ id: string }>(
        "INSERT INTO stores (household_id, name) VALUES ($1, $2) RETURNING id",
        [householdId, name.trim()]
      );
      storeMap.set(key, s.rows[0].id);
      return s.rows[0].id;
    }

    let imported = 0;
    const statusCounts: Record<string, number> = {};
    for (const row of rows) {
      if (!row.name?.trim() || !row.room_name?.trim()) continue;

      const roomId = await ensureRoom(row.room_name);
      const categoryId = row.category_name?.trim() ? await ensureCategory(row.category_name) : null;
      const storeId = row.store_name?.trim() ? await ensureStore(row.store_name) : null;
      const status = row.status && VALID_STATUSES.has(row.status) ? row.status : "SEARCHING";
      const priority = row.priority && VALID_PRIORITIES.has(row.priority) ? row.priority : "MEDIUM";

      const plannedPrice = row.planned_price ?? null;
      // If item is bought (ARRIVED/ORDERED) but has no actual_price, use planned_price as fallback
      const arrivedStatuses = new Set(["ARRIVED", "ORDERED", "INSTALLED"]);
      const actualPrice = row.actual_price ?? (arrivedStatuses.has(status) ? plannedPrice : null);

      await client.query(
        `INSERT INTO items (household_id, room_id, category_id, store_id, name, quantity, planned_price, actual_price, status, priority, notes, product_url, is_required)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          householdId, roomId, categoryId, storeId,
          row.name.trim(),
          row.quantity && Number(row.quantity) > 0 ? Number(row.quantity) : 1,
          plannedPrice,
          actualPrice,
          status, priority,
          row.notes?.trim() || null,
          row.product_url?.trim() || null,
          row.is_required ?? false,
        ]
      );
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
      imported++;
    }

    return { imported, statusCounts };
  });

  res.json(result);
});

export default router;

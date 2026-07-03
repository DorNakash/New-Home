import { Router } from "express";
import { query, queryOne } from "../db/index.js";
import { requireAuth } from "../auth/middleware.js";

const router = Router();
router.use(requireAuth);

router.get("/summary", async (req, res) => {
  const stores = await query(
    `SELECT s.id, s.name, s.website_url,
            COUNT(i.id) AS item_count,
            COALESCE(SUM(i.actual_price), 0) AS total_spent
     FROM stores s
     LEFT JOIN items i ON i.store_id = s.id AND i.household_id = s.household_id
     WHERE s.household_id = $1
     GROUP BY s.id, s.name, s.website_url
     ORDER BY total_spent DESC`,
    [req.user!.householdId]
  );
  res.json(stores.map((s) => ({ ...s, item_count: Number(s.item_count), total_spent: Number(s.total_spent) })));
});

router.get("/", async (req, res) => {
  const stores = await query(
    "SELECT id, name, website_url FROM stores WHERE household_id = $1 ORDER BY name",
    [req.user!.householdId]
  );
  res.json(stores);
});

// Auto-create-by-name: lets the item form offer "add new store" without a separate screen.
router.post("/", async (req, res) => {
  const { name } = req.body ?? {};
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "יש להזין שם חנות" });
  }

  const existing = await queryOne<{ id: string }>(
    "SELECT id FROM stores WHERE household_id = $1 AND name = $2",
    [req.user!.householdId, name]
  );
  if (existing) return res.json(existing);

  const store = await queryOne(
    "INSERT INTO stores (household_id, name) VALUES ($1, $2) RETURNING id, name, website_url",
    [req.user!.householdId, name]
  );
  res.status(201).json(store);
});

export default router;

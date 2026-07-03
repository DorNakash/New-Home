import { Router } from "express";
import { query, queryOne } from "../db/index.js";
import { requireAuth } from "../auth/middleware.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const categories = await query(
    "SELECT id, name, sort_order FROM categories WHERE household_id = $1 ORDER BY sort_order",
    [req.user!.householdId]
  );
  res.json(categories);
});

// Auto-create-by-name: lets the item form offer "add new category" without a separate screen.
router.post("/", async (req, res) => {
  const { name } = req.body ?? {};
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "יש להזין שם קטגוריה" });
  }

  const existing = await queryOne<{ id: string }>(
    "SELECT id FROM categories WHERE household_id = $1 AND name = $2",
    [req.user!.householdId, name]
  );
  if (existing) return res.json(existing);

  const category = await queryOne(
    "INSERT INTO categories (household_id, name) VALUES ($1, $2) RETURNING id, name, sort_order",
    [req.user!.householdId, name]
  );
  res.status(201).json(category);
});

export default router;

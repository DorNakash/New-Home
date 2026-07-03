import { Router } from "express";
import { query, queryOne } from "../db/index.js";
import { requireAuth } from "../auth/middleware.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const rooms = await query(
    "SELECT id, name, icon, sort_order FROM rooms WHERE household_id = $1 ORDER BY sort_order",
    [req.user!.householdId]
  );
  res.json(rooms);
});

router.post("/", async (req, res) => {
  const { name, icon } = req.body ?? {};
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "יש להזין שם חדר" });
  }

  const maxOrder = await queryOne<{ max: number | null }>(
    "SELECT MAX(sort_order) AS max FROM rooms WHERE household_id = $1",
    [req.user!.householdId]
  );
  const sortOrder = (maxOrder?.max ?? -1) + 1;

  const room = await queryOne(
    "INSERT INTO rooms (household_id, name, icon, sort_order) VALUES ($1, $2, $3, $4) RETURNING id, name, icon, sort_order",
    [req.user!.householdId, name, icon ?? null, sortOrder]
  );
  res.status(201).json(room);
});

router.patch("/:id", async (req, res) => {
  const { name, icon } = req.body ?? {};
  const fields: Record<string, unknown> = {};
  if (name !== undefined) fields.name = name;
  if (icon !== undefined) fields.icon = icon;

  const keys = Object.keys(fields);
  if (keys.length === 0) {
    return res.status(400).json({ error: "אין שדות לעדכון" });
  }

  const setClauses = keys.map((key, i) => `${key} = $${i + 3}`);
  const room = await queryOne(
    `UPDATE rooms SET ${setClauses.join(", ")} WHERE id = $1 AND household_id = $2 RETURNING id, name, icon, sort_order`,
    [req.params.id, req.user!.householdId, ...Object.values(fields)]
  );
  if (!room) return res.status(404).json({ error: "החדר לא נמצא" });
  res.json(room);
});

router.get("/:id", async (req, res) => {
  const room = await queryOne(
    "SELECT id, name, icon, sort_order FROM rooms WHERE id = $1 AND household_id = $2",
    [req.params.id, req.user!.householdId]
  );
  if (!room) return res.status(404).json({ error: "החדר לא נמצא" });

  const items = await query(
    `SELECT i.id, i.name, i.quantity, i.planned_price, i.actual_price, i.product_url, i.image_path,
            i.notes, i.priority, i.status, i.is_required, i.category_id, i.store_id, s.name AS store_name
     FROM items i
     LEFT JOIN stores s ON s.id = i.store_id
     WHERE i.room_id = $1 AND i.household_id = $2
     ORDER BY i.is_required DESC, i.created_at DESC`,
    [req.params.id, req.user!.householdId]
  );

  res.json({ ...room, items });
});

router.delete("/:id", async (req, res) => {
  const room = await queryOne(
    "SELECT id FROM rooms WHERE id = $1 AND household_id = $2",
    [req.params.id, req.user!.householdId]
  );
  if (!room) return res.status(404).json({ error: "החדר לא נמצא" });

  // Delete options → items → room (items FK has no CASCADE to rooms)
  await query(
    `DELETE FROM item_options WHERE item_id IN (SELECT id FROM items WHERE room_id = $1)`,
    [req.params.id]
  );
  await query("DELETE FROM items WHERE room_id = $1", [req.params.id]);
  await query("DELETE FROM rooms WHERE id = $1 AND household_id = $2", [req.params.id, req.user!.householdId]);
  res.status(204).end();
});

export default router;

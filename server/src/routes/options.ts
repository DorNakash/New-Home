import { Router } from "express";
import { queryOne, transaction } from "../db/index.js";
import { requireAuth } from "../auth/middleware.js";
import { saveImage, downloadImage, fetchOgImage } from "../storage.js";

const router = Router();
router.use(requireAuth);

const WRITABLE_FIELDS = ["store_id", "label", "price", "product_url", "image_path", "pros", "cons"] as const;

function pickWritable(body: Record<string, unknown>) {
  const entry: Record<string, unknown> = {};
  for (const field of WRITABLE_FIELDS) {
    if (field in body) entry[field] = body[field];
  }
  return entry;
}

// Mounted at /api/items/:itemId/options
router.post("/items/:itemId/options", async (req, res) => {
  const item = await queryOne<{ id: string }>(
    "SELECT id FROM items WHERE id = $1 AND household_id = $2",
    [req.params.itemId, req.user!.householdId]
  );
  if (!item) return res.status(404).json({ error: "הפריט לא נמצא" });

  const fields = pickWritable(req.body ?? {});
  const columns = ["item_id", ...Object.keys(fields)];
  const values = [req.params.itemId, ...Object.values(fields)];
  const placeholders = columns.map((_, i) => `$${i + 1}`);

  const option = await queryOne(
    `INSERT INTO item_options (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
    values
  );
  res.status(201).json(option);
});

// Mounted at /api/options/:id
router.patch("/options/:id", async (req, res) => {
  const fields = pickWritable(req.body ?? {});
  const keys = Object.keys(fields);
  if (keys.length === 0) {
    return res.status(400).json({ error: "אין שדות לעדכון" });
  }

  const setClauses = keys.map((key, i) => `${key} = $${i + 2}`);
  const option = await queryOne(
    `UPDATE item_options o SET ${setClauses.join(", ")}
     FROM items i
     WHERE o.id = $1 AND o.item_id = i.id AND i.household_id = $${keys.length + 2}
     RETURNING o.*`,
    [req.params.id, ...Object.values(fields), req.user!.householdId]
  );
  if (!option) return res.status(404).json({ error: "האפשרות לא נמצאה" });
  res.json(option);
});

router.delete("/options/:id", async (req, res) => {
  const deleted = await queryOne(
    `DELETE FROM item_options o
     USING items i
     WHERE o.id = $1 AND o.item_id = i.id AND i.household_id = $2
     RETURNING o.id`,
    [req.params.id, req.user!.householdId]
  );
  if (!deleted) return res.status(404).json({ error: "האפשרות לא נמצאה" });
  res.status(204).end();
});

router.post("/options/:id/fetch-image", async (req, res) => {
  const option = await queryOne<{ id: string; product_url: string | null; item_id: string }>(
    `SELECT o.id, o.product_url, o.item_id FROM item_options o
     JOIN items i ON i.id = o.item_id
     WHERE o.id = $1 AND i.household_id = $2`,
    [req.params.id, req.user!.householdId]
  );
  if (!option) return res.status(404).json({ error: "האפשרות לא נמצאה" });

  const directUrl = typeof req.body?.imageUrl === "string" ? req.body.imageUrl.trim() : null;
  if (directUrl) {
    try {
      const referer = option.product_url ?? new URL(directUrl).origin + "/";
      const buffer = await downloadImage(directUrl, referer);
      if (!buffer) return res.status(422).json({ error: "לא ניתן להוריד את התמונה" });
      const ext = directUrl.split("?")[0].match(/\.(jpe?g|png|webp|gif|avif)$/i)?.[1] ?? "jpg";
      const path = await saveImage({ buffer, originalname: `img.${ext}` }, req.user!.householdId, option.item_id);
      const updated = await queryOne(
        "UPDATE item_options SET image_path = $1 WHERE id = $2 RETURNING *",
        [path, req.params.id]
      );
      return res.json(updated);
    } catch {
      return res.status(502).json({ error: "לא ניתן להוריד את התמונה" });
    }
  }

  if (!option.product_url) return res.status(400).json({ error: "אין קישור למוצר" });

  try {
    const imageUrl = await fetchOgImage(option.product_url);
    if (!imageUrl) return res.status(422).json({ error: "לא נמצאה תמונה בדף המוצר" });

    let storedPath: string = imageUrl;
    const buffer = await downloadImage(imageUrl, option.product_url);
    if (buffer) {
      const ext = imageUrl.split("?")[0].match(/\.(jpe?g|png|webp|gif|avif)$/i)?.[1] ?? "jpg";
      storedPath = await saveImage({ buffer, originalname: `og.${ext}` }, req.user!.householdId, option.item_id);
    }
    const updated = await queryOne("UPDATE item_options SET image_path = $1 WHERE id = $2 RETURNING *", [storedPath, req.params.id]);
    res.json(updated);
  } catch (err) {
    console.error("[fetch-image option]", err);
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("abort") || msg.includes("timeout")) return res.status(504).json({ error: "הדף לא הגיב בזמן" });
    res.status(502).json({ error: String(err) });
  }
});

router.post("/options/:id/select", async (req, res) => {
  const householdId = req.user!.householdId;

  try {
    const item = await transaction(async (client) => {
      const option = await client.query(
        `SELECT o.id, o.item_id, o.price, o.store_id
         FROM item_options o
         JOIN items i ON i.id = o.item_id
         WHERE o.id = $1 AND i.household_id = $2`,
        [req.params.id, householdId]
      );
      if (option.rows.length === 0) {
        throw Object.assign(new Error("not_found"), { code: "NOT_FOUND" });
      }
      const { item_id, price, store_id } = option.rows[0];

      await client.query("UPDATE item_options SET is_selected = false WHERE item_id = $1", [item_id]);
      await client.query("UPDATE item_options SET is_selected = true WHERE id = $1", [req.params.id]);

      const updated = await client.query(
        `UPDATE items
         SET selected_option_id = $1, actual_price = $2, store_id = $3, updated_at = now()
         WHERE id = $4
         RETURNING *`,
        [req.params.id, price, store_id, item_id]
      );
      return updated.rows[0];
    });

    res.json(item);
  } catch (err) {
    if ((err as { code?: string }).code === "NOT_FOUND") {
      return res.status(404).json({ error: "האפשרות לא נמצאה" });
    }
    throw err;
  }
});

export default router;

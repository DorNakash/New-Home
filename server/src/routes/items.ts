import { Router } from "express";
import { query, queryOne } from "../db/index.js";
import { requireAuth } from "../auth/middleware.js";
import { saveImage, downloadImage } from "../storage.js";

const router = Router();
router.use(requireAuth);

const WRITABLE_FIELDS = [
  "room_id",
  "category_id",
  "name",
  "quantity",
  "planned_price",
  "actual_price",
  "store_id",
  "product_url",
  "image_path",
  "notes",
  "priority",
  "status",
  "purchase_date",
  "warranty_months",
  "needs_ordering_by",
  "is_required",
] as const;

function pickWritable(body: Record<string, unknown>) {
  const entry: Record<string, unknown> = {};
  for (const field of WRITABLE_FIELDS) {
    if (field in body) entry[field] = body[field];
  }
  return entry;
}

router.get("/", async (req, res) => {
  const { q, status, room_id, category_id, priority, store_id } = req.query as Record<string, string>;

  const conditions = ["i.household_id = $1"];
  const values: unknown[] = [req.user!.householdId];
  let idx = 2;

  if (q) { conditions.push(`i.name ILIKE $${idx++}`); values.push(`%${q}%`); }
  if (status) { conditions.push(`i.status = $${idx++}`); values.push(status); }
  if (room_id) { conditions.push(`i.room_id = $${idx++}`); values.push(room_id); }
  if (category_id) { conditions.push(`i.category_id = $${idx++}`); values.push(category_id); }
  if (priority) { conditions.push(`i.priority = $${idx++}`); values.push(priority); }
  if (store_id) { conditions.push(`i.store_id = $${idx++}`); values.push(store_id); }

  const items = await query(
    `SELECT i.*, r.name AS room_name, c.name AS category_name, s.name AS store_name
     FROM items i
     LEFT JOIN rooms r ON r.id = i.room_id
     LEFT JOIN categories c ON c.id = i.category_id
     LEFT JOIN stores s ON s.id = i.store_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY i.name
     LIMIT 100`,
    values
  );
  res.json(items);
});

router.post("/", async (req, res) => {
  const fields = pickWritable(req.body ?? {});
  if (!fields.room_id || !fields.name) {
    return res.status(400).json({ error: "יש לבחור חדר ולהזין שם מוצר" });
  }

  const columns = ["household_id", ...Object.keys(fields)];
  const values = [req.user!.householdId, ...Object.values(fields)];
  const placeholders = columns.map((_, i) => `$${i + 1}`);

  const item = await queryOne(
    `INSERT INTO items (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
    values
  );
  res.status(201).json(item);
});

router.get("/:id", async (req, res) => {
  const item = await queryOne(
    `SELECT i.*, r.name AS room_name, c.name AS category_name, s.name AS store_name
     FROM items i
     LEFT JOIN rooms r ON r.id = i.room_id
     LEFT JOIN categories c ON c.id = i.category_id
     LEFT JOIN stores s ON s.id = i.store_id
     WHERE i.id = $1 AND i.household_id = $2`,
    [req.params.id, req.user!.householdId]
  );
  if (!item) return res.status(404).json({ error: "הפריט לא נמצא" });

  const options = await query(
    `SELECT o.*, s.name AS store_name
     FROM item_options o
     LEFT JOIN stores s ON s.id = o.store_id
     WHERE o.item_id = $1
     ORDER BY o.created_at`,
    [req.params.id]
  );
  res.json({ ...item, options });
});

router.patch("/:id", async (req, res) => {
  const fields = pickWritable(req.body ?? {});
  const keys = Object.keys(fields);
  if (keys.length === 0) {
    return res.status(400).json({ error: "אין שדות לעדכון" });
  }

  const setClauses = keys.map((key, i) => `${key} = $${i + 3}`);
  const item = await queryOne(
    `UPDATE items SET ${setClauses.join(", ")}, updated_at = now()
     WHERE id = $1 AND household_id = $2
     RETURNING *`,
    [req.params.id, req.user!.householdId, ...Object.values(fields)]
  );
  if (!item) return res.status(404).json({ error: "הפריט לא נמצא" });
  res.json(item);
});

router.post("/:id/fetch-image", async (req, res) => {
  const item = await queryOne<{ id: string; product_url: string | null }>(
    "SELECT id, product_url FROM items WHERE id = $1 AND household_id = $2",
    [req.params.id, req.user!.householdId]
  );
  if (!item) return res.status(404).json({ error: "הפריט לא נמצא" });

  // If caller supplies a direct image URL, skip page parsing and just download it
  const directUrl = typeof req.body?.imageUrl === "string" ? req.body.imageUrl.trim() : null;
  if (directUrl) {
    try {
      const referer = item.product_url ?? new URL(directUrl).origin + "/";
      const buffer = await downloadImage(directUrl, referer);
      if (!buffer) return res.status(422).json({ error: "לא ניתן להוריד את התמונה" });
      const ext = directUrl.split("?")[0].match(/\.(jpe?g|png|webp|gif|avif)$/i)?.[1] ?? "jpg";
      const path = await saveImage({ buffer, originalname: `img.${ext}` }, req.user!.householdId, req.params.id);
      const updated = await queryOne(
        "UPDATE items SET image_path = $1, updated_at = now() WHERE id = $2 AND household_id = $3 RETURNING *",
        [path, req.params.id, req.user!.householdId]
      );
      return res.json(updated);
    } catch {
      return res.status(502).json({ error: "לא ניתן להוריד את התמונה" });
    }
  }

  if (!item.product_url) return res.status(400).json({ error: "אין קישור למוצר" });

  try {
    const browserHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cache-Control": "no-cache",
    };

    const pageRes = await fetch(item.product_url, {
      headers: browserHeaders,
      signal: AbortSignal.timeout(7000),
    });
    if (!pageRes.ok) return res.status(502).json({ error: `שגיאה בגישה לדף (${pageRes.status})` });
    const html = await pageRes.text();

    // Try og:image first, then twitter:image
    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    ];
    let rawUrl: string | undefined;
    for (const re of patterns) {
      rawUrl = html.match(re)?.[1];
      if (rawUrl) break;
    }
    if (!rawUrl) return res.status(422).json({ error: "לא נמצאה תמונה בדף המוצר" });

    // Resolve protocol-relative and relative URLs
    const base = new URL(item.product_url);
    const imageUrl = rawUrl.startsWith("//")
      ? `${base.protocol}${rawUrl}`
      : rawUrl.startsWith("http")
      ? rawUrl
      : new URL(rawUrl, base).toString();

    let storedPath: string = imageUrl;
    const buffer = await downloadImage(imageUrl, item.product_url!);
    if (buffer) {
      const ext = imageUrl.split("?")[0].match(/\.(jpe?g|png|webp|gif|avif)$/i)?.[1] ?? "jpg";
      storedPath = await saveImage({ buffer, originalname: `og.${ext}` }, req.user!.householdId, req.params.id);
    }

    const updated = await queryOne(
      "UPDATE items SET image_path = $1, updated_at = now() WHERE id = $2 AND household_id = $3 RETURNING *",
      [storedPath, req.params.id, req.user!.householdId]
    );
    res.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("abort") || msg.includes("timeout")) {
      return res.status(504).json({ error: "הדף לא הגיב בזמן" });
    }
    res.status(502).json({ error: "לא ניתן לגשת לדף המוצר" });
  }
});

router.delete("/:id", async (req, res) => {
  const deleted = await queryOne(
    "DELETE FROM items WHERE id = $1 AND household_id = $2 RETURNING id",
    [req.params.id, req.user!.householdId]
  );
  if (!deleted) return res.status(404).json({ error: "הפריט לא נמצא" });
  res.status(204).end();
});

export default router;

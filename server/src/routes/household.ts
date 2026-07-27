import { Router } from "express";
import { queryOne } from "../db/index.js";
import { requireAuth } from "../auth/middleware.js";

const router = Router();
router.use(requireAuth);

router.patch("/", async (req, res) => {
  const { budget, delivery_cost, installation_cost } = req.body ?? {};
  const fields: Record<string, number | null> = {};
  if (budget !== undefined) fields.budget = budget === null ? null : Number(budget);
  if (delivery_cost !== undefined) fields.delivery_cost = delivery_cost === null ? null : Number(delivery_cost);
  if (installation_cost !== undefined) fields.installation_cost = installation_cost === null ? null : Number(installation_cost);
  if (Object.keys(fields).length === 0) return res.status(400).json({ error: "אין שדות לעדכון" });

  const setClauses = Object.keys(fields).map((k, i) => `${k} = $${i + 2}`);
  const household = await queryOne(
    `UPDATE households SET ${setClauses.join(", ")} WHERE id = $1 RETURNING id, name, budget, delivery_cost, installation_cost`,
    [req.user!.householdId, ...Object.values(fields)]
  );
  if (!household) return res.status(404).json({ error: "לא נמצא" });
  res.json(household);
});

export default router;

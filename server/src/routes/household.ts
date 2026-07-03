import { Router } from "express";
import { queryOne } from "../db/index.js";
import { requireAuth } from "../auth/middleware.js";

const router = Router();
router.use(requireAuth);

router.patch("/", async (req, res) => {
  const { budget } = req.body ?? {};
  if (budget === undefined) return res.status(400).json({ error: "חסר שדה תקציב" });

  const household = await queryOne(
    "UPDATE households SET budget = $1 WHERE id = $2 RETURNING id, name, budget",
    [budget === null ? null : Number(budget), req.user!.householdId]
  );
  if (!household) return res.status(404).json({ error: "לא נמצא" });
  res.json(household);
});

export default router;

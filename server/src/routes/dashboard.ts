import { Router } from "express";
import { query, queryOne } from "../db/index.js";
import { requireAuth } from "../auth/middleware.js";

const router = Router();
router.use(requireAuth);

router.get("/summary", async (req, res) => {
  const household = await queryOne<{ budget: string | null }>(
    "SELECT budget FROM households WHERE id = $1",
    [req.user!.householdId]
  );

  const totals = await queryOne<{
    total_planned: string | null;
    total_actual: string | null;
    total_spent: string | null;
    total_planned_bought: string | null;
    item_count: string;
    done_count: string;
    installed_count: string;
    ordered_count: string;
    to_buy_count: string;
  }>(
    `SELECT
       COALESCE(SUM(planned_price), 0) AS total_planned,
       COALESCE(SUM(actual_price), 0) AS total_actual,
       COALESCE(SUM(actual_price) FILTER (WHERE status IN ('ORDERED', 'ARRIVED', 'INSTALLED')), 0) AS total_spent,
       COALESCE(SUM(planned_price) FILTER (WHERE status IN ('ORDERED', 'ARRIVED', 'INSTALLED')), 0) AS total_planned_bought,
       COUNT(*) FILTER (WHERE status != 'CANCELLED') AS item_count,
       COUNT(*) FILTER (WHERE status IN ('ORDERED', 'ARRIVED', 'INSTALLED')) AS done_count,
       COUNT(*) FILTER (WHERE status = 'INSTALLED') AS installed_count,
       COUNT(*) FILTER (WHERE status = 'ORDERED') AS ordered_count,
       COUNT(*) FILTER (WHERE status IN ('SEARCHING', 'READY_TO_ORDER')) AS to_buy_count
     FROM items
     WHERE household_id = $1`,
    [req.user!.householdId]
  );

  const itemCount = Number(totals?.item_count ?? 0);
  const doneCount = Number(totals?.done_count ?? 0);
  const installedCount = Number(totals?.installed_count ?? 0);
  const percentComplete = itemCount > 0 ? Math.round((doneCount / itemCount) * 100) : 0;

  const roomBreakdown = await query(
    `SELECT r.id, r.name, r.icon,
            COALESCE(SUM(i.actual_price) FILTER (WHERE i.status IN ('ORDERED', 'ARRIVED', 'INSTALLED')), 0) AS spent,
            COALESCE(SUM(i.planned_price), 0) AS planned,
            COUNT(i.id) FILTER (WHERE i.status != 'CANCELLED') AS item_count,
            COUNT(i.id) FILTER (WHERE i.status IN ('ORDERED', 'ARRIVED', 'INSTALLED')) AS done_count
     FROM rooms r
     LEFT JOIN items i ON i.room_id = r.id
     WHERE r.household_id = $1
     GROUP BY r.id, r.name, r.icon, r.sort_order
     ORDER BY r.sort_order`,
    [req.user!.householdId]
  );

  res.json({
    budget: household?.budget != null ? Number(household.budget) : null,
    totalPlanned: Number(totals?.total_planned ?? 0),
    totalActual: Number(totals?.total_actual ?? 0),
    totalSpent: Number(totals?.total_spent ?? 0),
    totalPlannedBought: Number(totals?.total_planned_bought ?? 0),
    itemCount,
    installedCount,
    orderedCount: Number(totals?.ordered_count ?? 0),
    toBuyCount: Number(totals?.to_buy_count ?? 0),
    percentComplete,
    rooms: roomBreakdown.map((r) => ({
      id: r.id,
      name: r.name,
      icon: r.icon,
      spent: Number(r.spent),
      planned: Number(r.planned),
      itemCount: Number(r.item_count),
      percentComplete:
        Number(r.item_count) > 0 ? Math.round((Number(r.done_count) / Number(r.item_count)) * 100) : 0,
    })),
  });
});

export default router;

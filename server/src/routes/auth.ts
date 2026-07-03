import { Router } from "express";
import { queryOne } from "../db/index.js";
import { comparePassword } from "../auth/password.js";
import { signSession } from "../auth/jwt.js";
import { requireAuth, SESSION_COOKIE } from "../auth/middleware.js";

const router = Router();

const IS_PROD = process.env.NODE_ENV === "production";
const COOKIE_OPTIONS = {
  httpOnly: true,
  // Cross-origin (client and server on different Vercel domains) requires sameSite:"none" + secure:true
  sameSite: (IS_PROD ? "none" : "lax") as "none" | "lax",
  secure: IS_PROD,
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

router.post("/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: "יש להזין שם משתמש וסיסמה" });
  }

  const user = await queryOne<{
    id: string;
    household_id: string;
    password_hash: string;
    display_name: string;
    username: string;
  }>("SELECT id, household_id, password_hash, display_name, username FROM users WHERE username = $1", [username]);

  if (!user || !(await comparePassword(password, user.password_hash))) {
    return res.status(401).json({ error: "שם משתמש או סיסמה שגויים" });
  }

  const token = signSession({ userId: user.id, householdId: user.household_id });
  res.cookie(SESSION_COOKIE, token, COOKIE_OPTIONS);
  res.json({ id: user.id, username: user.username, displayName: user.display_name });
});

router.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { ...COOKIE_OPTIONS, maxAge: undefined });
  res.status(204).end();
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await queryOne<{ id: string; username: string; display_name: string }>(
    "SELECT id, username, display_name FROM users WHERE id = $1",
    [req.user!.userId]
  );
  if (!user) return res.status(401).json({ error: "לא מחובר" });
  res.json({ id: user.id, username: user.username, displayName: user.display_name });
});

export default router;

import type { Request, Response, NextFunction } from "express";
import { verifySession, type SessionPayload } from "./jwt.js";

export const SESSION_COOKIE = "session";

declare global {
  namespace Express {
    interface Request {
      user?: SessionPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    return res.status(401).json({ error: "לא מחובר" });
  }
  try {
    req.user = verifySession(token);
    next();
  } catch {
    return res.status(401).json({ error: "החיבור פג תוקף" });
  }
}

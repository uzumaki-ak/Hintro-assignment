import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import { verifyToken } from "../utils/jwt";

// Validates JWT from Authorization header and attaches user to request
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Authentication required" });
    return;
  }

  const token = header.split(" ")[1];
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ success: false, error: "Invalid or expired token" });
    return;
  }

  req.user = {
    id: payload.id,
    email: payload.email,
    name: payload.name,
  };

  next();
}

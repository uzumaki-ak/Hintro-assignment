import jwt from "jsonwebtoken";
import { env } from "../config/env";

interface TokenPayload {
  id: string;
  email: string;
  name: string;
}

// Signs a JWT with user payload, expires in 7 days
export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" });
}

// Verifies and decodes a JWT, returns null if invalid
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

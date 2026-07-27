import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "jarvis-default-jwt-secret-key-32-chars";

export interface UserTokenPayload {
  role: "admin";
  sub: string;
}

export function generateToken(payload: UserTokenPayload = { role: "admin", sub: "jarvis-owner" }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): UserTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserTokenPayload;
  } catch (error) {
    return null;
  }
}

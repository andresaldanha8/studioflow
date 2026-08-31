import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "./jwt";
import { RequestUser } from "./types";

const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret";

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

export function verifyAccessToken(req: Request, res: Response, next: NextFunction) {
  const auth = req.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = auth.slice(7).trim();
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const result = verifyJwt(token, JWT_SECRET);
  if (!result.valid || !result.payload) return res.status(401).json({ error: "Unauthorized" });

  const p = result.payload;
  const user: RequestUser = {
    id: p.sub,
    role: p.role as "admin" | "professional" | "client",
    salao_id: p.salao_id,
    jti: p.jti,
    iat: p.iat
  };

  req.user = user;
  return next();
}

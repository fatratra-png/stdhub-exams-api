import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errors.ts";
import { type AuthUser } from "../models/user.ts";
import { JwtSecurity } from "../security/jwtSecurity.ts";

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

const getBearerToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
};

export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const token = getBearerToken(req);
  if (!token) {
    next(new HttpError(401, "Accès refusé : token manquant ou invalide"));
    return;
  }
  try {
    const payload = JwtSecurity.verifyToken(token);
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch {
    next(new HttpError(401, "Accès refusé : token manquant ou invalide"));
  }
};

export const requireRole =
  (...roles: AuthUser["role"][]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new HttpError(403, "Accès refusé : rôle non approprié"));
      return;
    }
    next();
  };

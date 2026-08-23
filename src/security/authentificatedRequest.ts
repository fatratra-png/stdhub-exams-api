import type { Request } from "express";
import type { JwtPayload } from "./jwtSecurity.ts";

export interface AuthentificatedRequest extends Request {
    user: JwtPayload;
}
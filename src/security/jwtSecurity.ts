import jwt from "jsonwebtoken";
import { type Role } from "../models/user.ts";
import "dotenv/config";

export interface JwtPayload {
    id: string;
    role: Role;
}

const JWT_SECRET = process.env.JWT_SECRET;

if (JWT_SECRET == undefined) {
    throw new Error("JWT secret is missign.");
}

const secret: string = JWT_SECRET;
const JWT_EXPIRES_IN = '24h';
export const JwtSecurity = {
    generateToken(payload: JwtPayload): string {
        return jwt.sign(payload, secret, {expiresIn: JWT_EXPIRES_IN});
    },
    verifyToken(token: string): JwtPayload {
        return jwt.verify(token, secret) as unknown as JwtPayload;
    }
}
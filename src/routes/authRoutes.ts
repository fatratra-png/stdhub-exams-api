import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../config/db.ts";
import { HttpError } from "../errors.ts";

export const authRouter = Router();

interface AccountRow {
  id: number;
  email: string;
  password_hash: string;
  is_active: boolean | null;
}

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string" || password.length < 8) {
      throw new HttpError(400, "Données invalides");
    }

    let role: "ADMIN" | "STUDENT" = "STUDENT";
    let account: AccountRow | undefined = (
      await pool.query<AccountRow>(
        "SELECT id, email, password_hash, NULL::boolean AS is_active FROM admins WHERE email = $1",
        [email],
      )
    ).rows[0];

    if (account) {
      role = "ADMIN";
    } else {
      account = (
        await pool.query<AccountRow>(
          "SELECT id, email, password_hash, is_active FROM students WHERE email = $1",
          [email],
        )
      ).rows[0];
    }

    if (!account) {
      throw new HttpError(401, "Email ou mot de passe incorrect");
    }
    const valid = await bcrypt.compare(password, account.password_hash);
    if (!valid) {
      throw new HttpError(401, "Email ou mot de passe incorrect");
    }
    if (account.is_active === false) {
      throw new HttpError(401, "Ce compte a été désactivé");
    }

    const token = jwt.sign({ id: account.id, role }, process.env.JWT_SECRET ?? "dev-secret", {
      expiresIn: "12h",
    });
    res.status(200).json({ token, user: { id: account.id, email: account.email, role } });
  } catch (error) {
    next(error);
  }
});

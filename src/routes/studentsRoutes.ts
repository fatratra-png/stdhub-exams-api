import { Router } from "express";
import bcrypt from "bcryptjs";
import type { Request } from "express";
import { pool } from "../config/db.ts";
import { HttpError } from "../errors.ts";
import { requireAuth, requireRole } from "../middlewares/auth.ts";

export const studentsRouter = Router();

interface StudentRow {
  id: number;
  first_name: string;
  last_name: string | null;
  email: string;
  is_active: boolean;
  created_at: Date;
}

const toStudent = (row: StudentRow) => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  isActive: row.is_active,
  createdAt: row.created_at,
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const checkEmailFormat = (email: string): void => {
  if (!EMAIL_REGEX.test(email)) {
    throw new HttpError(400, "Adresse email invalide");
  }
};

const getExistingEmailOwnerId = async (email: string): Promise<string | null> => {
  const result = await pool.query<{ id: string }>(
    "SELECT id FROM students WHERE email = $1 UNION ALL SELECT id FROM admins WHERE email = $1 LIMIT 1",
    [email],
  );
  return result.rows[0]?.id ?? null;
};

studentsRouter.use(requireAuth, requireRole("ADMIN"));

studentsRouter.get("/", async (_req, res, next) => {
  try {
    const result = await pool.query<StudentRow>(
      "SELECT id, first_name, last_name, email, is_active, created_at FROM students ORDER BY id",
    );
    res.status(200).json(result.rows.map(toStudent));
  } catch (error) {
    next(error);
  }
});

studentsRouter.post("/", async (req, res, next) => {
  try {
    const { firstName, lastName, email, password } = req.body ?? {};
    if (typeof firstName !== "string" || firstName.trim().length === 0) {
      throw new HttpError(400, "Champ requis manquant : firstName");
    }
    if (typeof email !== "string" || typeof password !== "string" || password.length < 8) {
      throw new HttpError(400, "Données invalides : mot de passe de 8 caractères minimum requis");
    }
    checkEmailFormat(email);

    const normalizedEmail = email.toLowerCase();
    if ((await getExistingEmailOwnerId(normalizedEmail)) !== null) {
      throw new HttpError(409, "Un compte avec cet email existe déjà");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query<StudentRow>(
      `INSERT INTO students(first_name, last_name, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, first_name, last_name, email, is_active, created_at`,
      [firstName.trim(), typeof lastName === "string" ? lastName.trim() : null, normalizedEmail, passwordHash],
    );
    res.status(201).json(toStudent(result.rows[0] as StudentRow));
  } catch (error) {
    next(error);
  }
});

studentsRouter.put("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;

    const current = (
      await pool.query<StudentRow>(
        "SELECT id, first_name, last_name, email, is_active, created_at FROM students WHERE id = $1",
        [id],
      )
    ).rows[0];
    if (!current) throw new HttpError(404, "Ressource introuvable");

    const body = (req as Request & { body?: Record<string, unknown> }).body ?? {};
    let { firstName, lastName, email, password } = body;

    if (firstName !== undefined) {
      if (typeof firstName !== "string" || firstName.trim().length === 0) {
        throw new HttpError(400, "Champ invalide : firstName");
      }
      firstName = firstName.trim();
    }
    if (lastName !== undefined && lastName !== null && typeof lastName !== "string") {
      throw new HttpError(400, "Champ invalide : lastName");
    }
    if (email !== undefined) {
      if (typeof email !== "string") throw new HttpError(400, "Champ invalide : email");
      checkEmailFormat(email);
      email = email.toLowerCase();
      const ownerId = await getExistingEmailOwnerId(email);
      if (ownerId !== null && ownerId !== id) {
        throw new HttpError(409, "Un compte avec cet email existe déjà");
      }
    }
    let passwordHash: string | undefined;
    if (password !== undefined) {
      if (typeof password !== "string" || password.length < 8) {
        throw new HttpError(400, "Le mot de passe doit contenir au moins 8 caractères");
      }
      passwordHash = await bcrypt.hash(password, 10);
    }

    const result = await pool.query<StudentRow>(
      `UPDATE students SET
         first_name = $1,
         last_name = $2,
         email = $3,
         password_hash = COALESCE($4, password_hash)
       WHERE id = $5
       RETURNING id, first_name, last_name, email, is_active, created_at`,
      [
        firstName ?? current.first_name,
        lastName === undefined ? current.last_name : lastName,
        email ?? current.email,
        passwordHash ?? null,
        id,
      ],
    );
    res.status(200).json(toStudent(result.rows[0] as StudentRow));
  } catch (error) {
    next(error);
  }
});

studentsRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;

    const result = await pool.query<StudentRow>(
      `UPDATE students SET is_active = FALSE
       WHERE id = $1
       RETURNING id, first_name, last_name, email, is_active, created_at`,
      [id],
    );
    const row = result.rows[0];
    if (!row) throw new HttpError(404, "Ressource introuvable");
    res.status(200).json(toStudent(row));
  } catch (error) {
    next(error);
  }
});

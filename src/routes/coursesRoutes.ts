import { Router } from "express";
import { pool } from "../config/db.ts";
import { HttpError } from "../errors.ts";
import { requireAuth, requireRole } from "../middlewares/auth.ts";

export const coursesRouter = Router();

interface CourseRow {
  id: number;
  code: string;
  name: string;
}

const toCourse = (row: CourseRow) => ({
  id: row.id,
  code: row.code,
  name: row.name,
});

const parseCoursePayload = (body: unknown): { code: string; name: string } => {
  const { code, name } = (body ?? {}) as Record<string, unknown>;
  if (typeof code !== "string" || code.trim().length === 0 || typeof name !== "string" || name.trim().length === 0) {
    throw new HttpError(400, "Données invalides : code et name sont requis");
  }
  return { code: code.trim(), name: name.trim() };
};

coursesRouter.use(requireAuth, requireRole("ADMIN"));

coursesRouter.get("/", async (_req, res, next) => {
  try {
    const result = await pool.query<CourseRow>("SELECT id, code, name FROM courses ORDER BY id");
    res.status(200).json(result.rows.map(toCourse));
  } catch (error) {
    next(error);
  }
});

coursesRouter.post("/", async (req, res, next) => {
  try {
    const { code, name } = parseCoursePayload(req.body);
    const existing = await pool.query("SELECT id FROM courses WHERE code = $1", [code]);
    if (existing.rowCount && existing.rowCount > 0) {
      throw new HttpError(409, "Le code de cours existe déjà");
    }
    const result = await pool.query<CourseRow>(
      "INSERT INTO courses(code, name) VALUES ($1, $2) RETURNING id, code, name",
      [code, name],
    );
    res.status(201).json(toCourse(result.rows[0] as CourseRow));
  } catch (error) {
    next(error);
  }
});

coursesRouter.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new HttpError(404, "Ressource introuvable");
    const { code, name } = parseCoursePayload(req.body);

    const duplicate = await pool.query(
      "SELECT id FROM courses WHERE code = $1 AND id <> $2",
      [code, id],
    );
    if (duplicate.rowCount && duplicate.rowCount > 0) {
      throw new HttpError(409, "Le code de cours existe déjà");
    }

    const result = await pool.query<CourseRow>(
      "UPDATE courses SET code = $1, name = $2 WHERE id = $3 RETURNING id, code, name",
      [code, name, id],
    );
    const row = result.rows[0];
    if (!row) throw new HttpError(404, "Ressource introuvable");
    res.status(200).json(toCourse(row));
  } catch (error) {
    next(error);
  }
});

coursesRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new HttpError(404, "Ressource introuvable");

    const exams = await pool.query("SELECT id FROM exams WHERE course_id = $1 LIMIT 1", [id]);
    if (exams.rowCount && exams.rowCount > 0) {
      throw new HttpError(409, "Le cours possède des examens, suppression refusée");
    }

    const result = await pool.query("DELETE FROM courses WHERE id = $1", [id]);
    if (!result.rowCount) throw new HttpError(404, "Ressource introuvable");
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

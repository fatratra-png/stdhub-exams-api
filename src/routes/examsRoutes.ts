import { Router } from "express";
import { pool } from "../config/db.ts";
import { HttpError } from "../errors.ts";
import { requireAuth, requireRole } from "../middlewares/auth.ts";

export const examsRouter = Router();

interface ExamRow {
  id: number;
  courseId: number;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  questionCount: string;
  attemptCount: string;
}

const EXAM_SELECT = `
  SELECT e.id,
         e.course_id AS "courseId",
         e.title,
         e.description,
         e.start_date AS "startDate",
         e.end_date AS "endDate",
         (SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.id)::text AS "questionCount",
         (SELECT COUNT(*) FROM attempts a WHERE a.exam_id = e.id)::text AS "attemptCount"
  FROM exams e
`;

const toExam = (row: ExamRow) => ({
  id: row.id,
  courseId: row.courseId,
  title: row.title,
  description: row.description,
  startDate: row.startDate,
  endDate: row.endDate,
  questionCount: Number(row.questionCount),
  attemptCount: Number(row.attemptCount),
});

const parseExamPayload = (
  body: unknown,
): { courseId: number; title: string; description: string | null; startDate: Date; endDate: Date } => {
  const { courseId, title, description, startDate, endDate } = ((body ?? {}) as Record<string, unknown>);
  const cid = Number(courseId);
  if (!Number.isInteger(cid)) {
    throw new HttpError(400, "Données invalides : courseId doit être un entier");
  }
  if (typeof title !== "string" || title.trim().length === 0) {
    throw new HttpError(400, "Données invalides : title est requis");
  }
  const start = new Date(startDate as string);
  const end = new Date(endDate as string);
  if (
    typeof startDate !== "string" || Number.isNaN(start.getTime()) ||
    typeof endDate !== "string" || Number.isNaN(end.getTime())
  ) {
    throw new HttpError(400, "Données invalides : startDate et endDate doivent être des dates");
  }
  if (end.getTime() <= start.getTime()) {
    throw new HttpError(400, "Données invalides : endDate doit être postérieure à startDate");
  }
  if (description !== undefined && description !== null && typeof description !== "string") {
    throw new HttpError(400, "Données invalides : description doit être une chaîne");
  }
  return {
    courseId: cid,
    title: title.trim(),
    description: typeof description === "string" ? description : null,
    startDate: start,
    endDate: end,
  };
};

const ensureCourseExists = async (courseId: number): Promise<void> => {
  const result = await pool.query("SELECT id FROM courses WHERE id = $1", [courseId]);
  if (!result.rowCount) {
    throw new HttpError(404, "Le cours référencé n'existe pas");
  }
};

examsRouter.use(requireAuth, requireRole("ADMIN"));

examsRouter.get("/", async (req, res, next) => {
  try {
    const params: number[] = [];
    let where = "";
    if (req.query.courseId !== undefined) {
      const courseId = Number(req.query.courseId);
      if (!Number.isInteger(courseId)) {
        throw new HttpError(400, "Données invalides : courseId doit être un entier");
      }
      params.push(courseId);
      where = `WHERE e.course_id = $${params.length}`;
    }
    const result = await pool.query<ExamRow>(`${EXAM_SELECT} ${where} ORDER BY e.id`, params);
    res.status(200).json(result.rows.map(toExam));
  } catch (error) {
    next(error);
  }
});

examsRouter.post("/", async (req, res, next) => {
  try {
    const payload = parseExamPayload(req.body);
    await ensureCourseExists(payload.courseId);
    const inserted = await pool.query<{
      id: number;
      courseId: number;
      title: string;
      description: string | null;
      startDate: Date;
      endDate: Date;
    }>(
      `INSERT INTO exams(course_id, title, description, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, course_id AS "courseId", title, description,
                 start_date AS "startDate", end_date AS "endDate"`,
      [payload.courseId, payload.title, payload.description, payload.startDate, payload.endDate],
    );
    const row = inserted.rows[0];
    res.status(201).json({ ...row, questionCount: 0, attemptCount: 0 });
  } catch (error) {
    next(error);
  }
});

examsRouter.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new HttpError(404, "Ressource introuvable");

    const examResult = await pool.query<ExamRow>(`${EXAM_SELECT} WHERE e.id = $1`, [id]);
    const exam = examResult.rows[0];
    if (!exam) throw new HttpError(404, "Ressource introuvable");

    const questions = await pool.query<{
      id: number;
      text: string;
      score: number;
      answers: { id: number; content: string; isCorrect: boolean }[];
    }>(
      `SELECT q.id, q.statement AS "text", q.points AS score,
              (SELECT COALESCE(
                         json_agg(json_build_object('id', c.id, 'content', c.label, 'isCorrect', c.is_correct)
                                  ORDER BY c.id),
                         '[]'::json)
               FROM choices c WHERE c.question_id = q.id) AS answers
       FROM questions q
       WHERE q.exam_id = $1
       ORDER BY q.position, q.id`,
      [id],
    );

    res.status(200).json({ ...toExam(exam), questions: questions.rows });
  } catch (error) {
    next(error);
  }
});

examsRouter.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new HttpError(404, "Ressource introuvable");
    const payload = parseExamPayload(req.body);
    await ensureCourseExists(payload.courseId);

    const result = await pool.query(
      `UPDATE exams SET course_id = $1, title = $2, description = $3, start_date = $4, end_date = $5
       WHERE id = $6`,
      [payload.courseId, payload.title, payload.description, payload.startDate, payload.endDate, id],
    );
    if (!result.rowCount) throw new HttpError(404, "Ressource introuvable");

    const examResult = await pool.query<ExamRow>(`${EXAM_SELECT} WHERE e.id = $1`, [id]);
    res.status(200).json(toExam(examResult.rows[0] as ExamRow));
  } catch (error) {
    next(error);
  }
});

examsRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new HttpError(404, "Ressource introuvable");

    const existing = await pool.query("SELECT id FROM exams WHERE id = $1", [id]);
    if (!existing.rowCount) throw new HttpError(404, "Ressource introuvable");

    const attempts = await pool.query("SELECT id FROM attempts WHERE exam_id = $1 LIMIT 1", [id]);
    if (attempts.rowCount && attempts.rowCount > 0) {
      throw new HttpError(409, "L'examen possède des tentatives, suppression refusée");
    }

    await pool.query("DELETE FROM exams WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

interface ResultRow {
  studentId: string;
  studentName: string | null;
  score: number;
  maxScore: number;
  submittedAt: Date;
}

examsRouter.get("/:id/results", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new HttpError(404, "Ressource introuvable");

    const examResult = await pool.query<{ title: string }>("SELECT title FROM exams WHERE id = $1", [id]);
    const exam = examResult.rows[0];
    if (!exam) throw new HttpError(404, "Ressource introuvable");

    const maxScoreResult = await pool.query<{ total: string }>(
      "SELECT COALESCE(SUM(points), 0)::text AS total FROM questions WHERE exam_id = $1",
      [id],
    );
    const statsResult = await pool.query<{ count: string; average: string | null; max: string | null }>(
      `SELECT COUNT(*)::text AS count,
              AVG(score)::text AS average,
              MAX(COALESCE((SELECT SUM(points) FROM questions WHERE exam_id = $1), 0))::text AS max
       FROM attempts
       WHERE exam_id = $1 AND submitted_at IS NOT NULL`,
      [id],
    );
    const rowsResult = await pool.query<ResultRow>(
      `SELECT a.student_id AS "studentId",
              (SELECT first_name || ' ' || last_name FROM students WHERE id = a.student_id) AS "studentName",
              COALESCE(a.score, 0) AS score,
              COALESCE((SELECT SUM(points) FROM questions WHERE exam_id = a.exam_id), 0) AS "maxScore",
              a.submitted_at AS "submittedAt"
       FROM attempts a
       WHERE a.exam_id = $1 AND a.submitted_at IS NOT NULL
       ORDER BY a.submitted_at`,
      [id],
    );

    const stats = statsResult.rows[0];
    res.status(200).json({
      examId: id,
      examTitle: exam.title,
      average: Math.round(Number(stats?.average ?? 0) * 100) / 100,
      attemptsCount: Number(stats?.count ?? 0),
      results: rowsResult.rows,
    });
  } catch (error) {
    next(error);
  }
});

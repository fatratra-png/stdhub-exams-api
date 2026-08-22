import { Router } from "express";
import type { Pool, PoolClient } from "pg";
import { pool } from "../config/db.ts";
import { HttpError } from "../errors.ts";
import { requireAuth, requireRole } from "../middlewares/auth.ts";

export const myRouter = Router();

type Querier = Pool | PoolClient;

interface PublicExamRow {
  id: number;
  courseId: number;
  courseName: string;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
}

const PUBLIC_EXAM_SELECT = `
  SELECT e.id,
         e.course_id AS "courseId",
         (SELECT c.name FROM courses c WHERE c.id = e.course_id) AS "courseName",
         e.title,
         e.description,
         e.start_date AS "startDate",
         e.end_date AS "endDate"
  FROM exams e
`;

const getExamOr404 = async (querier: Querier, examId: number): Promise<PublicExamRow> => {
  const result = await querier.query<PublicExamRow>(`${PUBLIC_EXAM_SELECT} WHERE e.id = $1`, [examId]);
  const exam = result.rows[0];
  if (!exam) throw new HttpError(404, "Ressource introuvable");
  return exam;
};

const assertInWindow = (exam: PublicExamRow): void => {
  const now = new Date();
  if (now < new Date(exam.startDate) || now > new Date(exam.endDate)) {
    throw new HttpError(403, "Examen hors de sa fenêtre de disponibilité");
  }
};

const assertNotAttempted = async (
  querier: Querier,
  examId: number,
  studentId: string,
  status: number,
  message: string,
): Promise<void> => {
  const result = await querier.query(
    "SELECT id FROM attempts WHERE student_id = $1 AND exam_id = $2 AND submitted_at IS NOT NULL",
    [studentId, examId],
  );
  if (result.rowCount) throw new HttpError(status, message);
};

const loadPublicQuestions = async (querier: Querier, examId: number) =>
  (
    await querier.query(
      `SELECT q.id, q.statement AS text, q.points AS score,
              (SELECT COALESCE(json_agg(json_build_object('id', ch.id, 'content', ch.label) ORDER BY ch.id), '[]'::json)
               FROM choices ch WHERE ch.question_id = q.id) AS answers
       FROM questions q
       WHERE q.exam_id = $1
       ORDER BY q.position, q.id`,
      [examId],
    )
  ).rows;

myRouter.use(requireAuth, requireRole("STUDENT"));

myRouter.get("/exams", async (req, res, next) => {
  try {
    const exams = await pool.query<PublicExamRow>(
      `${PUBLIC_EXAM_SELECT}
       WHERE NOW() BETWEEN e.start_date AND e.end_date
         AND NOT EXISTS (
           SELECT 1 FROM attempts a
           WHERE a.exam_id = e.id AND a.student_id = $1 AND a.submitted_at IS NOT NULL
         )
       ORDER BY e.start_date`,
      [req.user?.id],
    );
    res.status(200).json(exams.rows);
  } catch (error) {
    next(error);
  }
});

myRouter.get("/exams/:id", async (req, res, next) => {
  try {
    const examId = Number(req.params.id);
    if (!Number.isInteger(examId)) throw new HttpError(404, "Ressource introuvable");

    const exam = await getExamOr404(pool, examId);
    assertInWindow(exam);
    await assertNotAttempted(
      pool,
      examId,
      req.user?.id as string,
      403,
      "Vous avez déjà passé cet examen",
    );

    res.status(200).json({ ...exam, questions: await loadPublicQuestions(pool, examId) });
  } catch (error) {
    next(error);
  }
});

myRouter.post("/exams/:id/submit", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const examId = Number(req.params.id);
    if (!Number.isInteger(examId)) throw new HttpError(404, "Ressource introuvable");
    const studentId = req.user?.id as string;

    const body = (req.body ?? {}) as Record<string, unknown>;
    if (!Array.isArray(body.answers)) {
      throw new HttpError(400, "Données invalides : answers est requis");
    }

    interface SubmittedAnswer {
      questionId: number;
      choiceId: number;
    }
    const submitted: SubmittedAnswer[] = [];
    for (const raw of body.answers as unknown[]) {
      const entry = (raw ?? {}) as Record<string, unknown>;
      const questionId = Number(entry.questionId);
      const choiceId = Number(entry.choiceId);
      if (!Number.isInteger(questionId) || !Number.isInteger(choiceId)) {
        throw new HttpError(400, "Données invalides : chaque réponse requiert questionId et choiceId");
      }
      if (submitted.some((answer) => answer.questionId === questionId)) {
        throw new HttpError(400, "Données invalides : réponses dupliquées pour une même question");
      }
      submitted.push({ questionId, choiceId });
    }

    await client.query("BEGIN");
    const exam = await getExamOr404(client, examId);
    assertInWindow(exam);
    await assertNotAttempted(client, examId, studentId, 409, "L'étudiant a déjà passé cet examen");

    const questionsResult = await client.query<{
      id: number;
      text: string;
      score: number;
    }>(
      `SELECT id, statement AS text, points AS score
       FROM questions WHERE exam_id = $1 ORDER BY position, id`,
      [examId],
    );
    const questions = questionsResult.rows;

    const choicesResult = await client.query<{
      id: number;
      questionId: number;
      isCorrect: boolean;
    }>(
      `SELECT id, question_id AS "questionId", is_correct AS "isCorrect"
       FROM choices
       WHERE question_id IN (SELECT id FROM questions WHERE exam_id = $1)`,
      [examId],
    );
    const validChoices = new Map(choicesResult.rows.map((choice) => [choice.id, choice]));

    let score = 0;
    for (const answer of submitted) {
      const choice = validChoices.get(answer.choiceId);
      if (!choice || choice.questionId !== answer.questionId) {
        throw new HttpError(400, "Données invalides : choix inconnu pour une question de cet examen");
      }
      if (choice.isCorrect) {
        score += questions.find((question) => question.id === answer.questionId)?.score ?? 0;
      }
    }

    const attemptResult = await client.query<{ id: number; submittedAt: Date }>(
      `INSERT INTO attempts(student_id, exam_id, started_at, submitted_at, score)
       VALUES ($1, $2, NOW(), NOW(), $3)
       RETURNING id, submitted_at AS "submittedAt"`,
      [studentId, examId, score],
    );
    const attempt = attemptResult.rows[0];
    if (!attempt) throw new HttpError(500, "Erreur interne du serveur");

    for (const answer of submitted) {
      await client.query(
        "INSERT INTO answers(attempt_id, question_id, choice_id) VALUES ($1, $2, $3)",
        [attempt.id, answer.questionId, answer.choiceId],
      );
    }

    const correctionsResult = await client.query<{
      questionId: number;
      text: string;
      score: number;
      selectedChoiceId: number | null;
      correctChoiceId: number | null;
      answers: { id: number; content: string }[];
    }>(
      `SELECT q.id AS "questionId",
              q.statement AS text,
              q.points AS score,
              (SELECT a.choice_id FROM answers a
               WHERE a.attempt_id = $1 AND a.question_id = q.id) AS "selectedChoiceId",
              (SELECT c.id FROM choices c
               WHERE c.question_id = q.id AND c.is_correct = TRUE LIMIT 1) AS "correctChoiceId",
              (SELECT COALESCE(json_agg(json_build_object('id', ch.id, 'content', ch.label) ORDER BY ch.id), '[]'::json)
               FROM choices ch WHERE ch.question_id = q.id) AS answers
       FROM questions q
       WHERE q.exam_id = $2
       ORDER BY q.position, q.id`,
      [attempt.id, examId],
    );

    await client.query("COMMIT");

    res.status(201).json({
      attemptId: attempt.id,
      examId,
      score,
      maxScore: questions.reduce((total, question) => total + question.score, 0),
      submittedAt: attempt.submittedAt,
      corrections: correctionsResult.rows.map((row) => ({
        ...row,
        isCorrect:
          row.selectedChoiceId !== null &&
          row.correctChoiceId !== null &&
          row.selectedChoiceId === row.correctChoiceId,
      })),
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    next(error);
  } finally {
    client.release();
  }
});

myRouter.get("/results", async (req, res, next) => {
  try {
    const results = await pool.query(
      `SELECT a.exam_id AS "examId",
              (SELECT title FROM exams WHERE id = a.exam_id) AS "examTitle",
              (SELECT name FROM courses
               WHERE id = (SELECT course_id FROM exams WHERE id = a.exam_id)) AS "courseName",
              COALESCE(a.score, 0) AS score,
              a.submitted_at AS "submittedAt",
              COALESCE((SELECT SUM(points) FROM questions WHERE exam_id = a.exam_id), 0) AS "maxScore"
       FROM attempts a
       WHERE a.student_id = $1 AND a.submitted_at IS NOT NULL
       ORDER BY a.submitted_at DESC`,
      [req.user?.id],
    );
    res.status(200).json(results.rows);
  } catch (error) {
    next(error);
  }
});

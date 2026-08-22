import { Router } from "express";
import { pool } from "../config/db.ts";
import type { PoolClient } from "pg";
import { HttpError } from "../errors.ts";
import { requireAuth, requireRole } from "../middlewares/auth.ts";

export const questionsRouter = Router();

interface ChoiceRow {
  id: number;
  content: string;
  isCorrect: boolean;
}

interface QuestionRow {
  id: number;
  text: string;
  score: number;
}

const loadQuestion = async (
  client: PoolClient | typeof pool,
  questionId: number,
): Promise<{ question: QuestionRow; examId: number }> => {
  const result = await client.query<QuestionRow & { examId: number }>(
    `SELECT id, statement AS "text", points AS score, exam_id AS "examId"
     FROM questions WHERE id = $1`,
    [questionId],
  );
  const row = result.rows[0];
  if (!row) throw new HttpError(404, "Ressource introuvable");
  return { question: { id: row.id, text: row.text, score: row.score }, examId: row.examId };
};

const loadChoices = async (
  client: PoolClient | typeof pool,
  questionId: number,
): Promise<ChoiceRow[]> => {
  const result = await client.query<ChoiceRow>(
    `SELECT id, label AS content, is_correct AS "isCorrect"
     FROM choices WHERE question_id = $1 ORDER BY id`,
    [questionId],
  );
  return result.rows;
};

const countAttempts = async (client: PoolClient | typeof pool, examId: number): Promise<number> => {
  const result = await client.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM attempts WHERE exam_id = $1",
    [examId],
  );
  return Number(result.rows[0]?.count ?? "0");
};

interface ParsedAnswer {
  content: string;
  isCorrect: boolean;
}

const parseQuestionPayload = (
  body: unknown,
): { text: string; score: number; answers: ParsedAnswer[] } => {
  const { text, score, answers } = ((body ?? {}) as Record<string, unknown>);
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new HttpError(400, "Données invalides : text est requis");
  }
  const parsedScore = Number(score);
  if (!Number.isInteger(parsedScore) || parsedScore < 1) {
    throw new HttpError(400, "Données invalides : score doit être un entier >= 1");
  }
  if (!Array.isArray(answers) || answers.length < 2 || answers.length > 6) {
    throw new HttpError(400, "Données invalides : entre 2 et 6 choix requis");
  }
  let correctCount = 0;
  const parsedAnswers: ParsedAnswer[] = answers.map((answer) => {
    const { content, isCorrect } = (answer ?? {}) as Record<string, unknown>;
    if (typeof content !== "string" || content.trim().length === 0) {
      throw new HttpError(400, "Données invalides : chaque choix requiert un content");
    }
    if (typeof isCorrect !== "boolean") {
      throw new HttpError(400, "Données invalides : isCorrect est requis pour chaque choix");
    }
    if (isCorrect) correctCount += 1;
    return { content: content.trim(), isCorrect };
  });
  if (correctCount !== 1) {
    throw new HttpError(400, "Données invalides : exactement une réponse correcte requise");
  }
  return { text: text.trim(), score: parsedScore, answers: parsedAnswers };
};

questionsRouter.get("/exams/:id/questions", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const examId = Number(req.params.id);
    if (!Number.isInteger(examId)) throw new HttpError(404, "Ressource introuvable");

    const exam = await pool.query("SELECT id FROM exams WHERE id = $1", [examId]);
    if (!exam.rowCount) throw new HttpError(404, "Ressource introuvable");

    const questions = await pool.query(
      `SELECT q.id, q.statement AS "text", q.points AS score,
              (SELECT COALESCE(
                         json_agg(json_build_object('id', c.id, 'content', c.label, 'isCorrect', c.is_correct)
                                  ORDER BY c.id),
                         '[]'::json)
               FROM choices c WHERE c.question_id = q.id) AS answers
       FROM questions q
       WHERE q.exam_id = $1
       ORDER BY q.position, q.id`,
      [examId],
    );
    res.status(200).json(questions.rows);
  } catch (error) {
    next(error);
  }
});

questionsRouter.post("/exams/:id/questions", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const examId = Number(req.params.id);
    if (!Number.isInteger(examId)) throw new HttpError(404, "Ressource introuvable");
    const payload = parseQuestionPayload(req.body);

    await client.query("BEGIN");
    const exam = await client.query("SELECT id FROM exams WHERE id = $1", [examId]);
    if (!exam.rowCount) throw new HttpError(404, "Ressource introuvable");
    if ((await countAttempts(client, examId)) > 0) {
      throw new HttpError(409, "L'examen a déjà au moins une tentative, ajout refusé");
    }

    const positionResult = await client.query<{ max: number | null }>(
      "SELECT MAX(position) AS max FROM questions WHERE exam_id = $1",
      [examId],
    );
    const position = (positionResult.rows[0]?.max ?? 0) + 1;

    const questionResult = await client.query<{ id: number; score: number }>(
      `INSERT INTO questions(exam_id, statement, points, position)
       VALUES ($1, $2, $3, $4) RETURNING id, points AS score`,
      [examId, payload.text, payload.score, position],
    );
    const question = questionResult.rows[0];
    if (!question) throw new HttpError(404, "Ressource introuvable");

    for (const answer of payload.answers) {
      await client.query(
        "INSERT INTO choices(question_id, label, is_correct) VALUES ($1, $2, $3)",
        [question.id, answer.content, answer.isCorrect],
      );
    }
    await client.query("COMMIT");

    res.status(201).json({
      id: question.id,
      text: payload.text,
      score: question.score,
      answers: await loadChoices(client, question.id),
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    next(error);
  } finally {
    client.release();
  }
});

questionsRouter.put("/questions/:id", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new HttpError(404, "Ressource introuvable");
    const payload = parseQuestionPayload(req.body);

    await client.query("BEGIN");
    const { question, examId } = await loadQuestion(client, id);
    if ((await countAttempts(client, examId)) > 0) {
      throw new HttpError(409, "L'examen a déjà au moins une tentative, modification refusée");
    }

    await client.query("UPDATE questions SET statement = $1, points = $2 WHERE id = $3", [
      payload.text,
      payload.score,
      id,
    ]);
    await client.query("DELETE FROM choices WHERE question_id = $1", [id]);
    for (const answer of payload.answers) {
      await client.query("INSERT INTO choices(question_id, label, is_correct) VALUES ($1, $2, $3)", [
        id,
        answer.content,
        answer.isCorrect,
      ]);
    }
    await client.query("COMMIT");

    res.status(200).json({ ...question, ...payload, answers: await loadChoices(client, id) });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    next(error);
  } finally {
    client.release();
  }
});

questionsRouter.delete("/questions/:id", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new HttpError(404, "Ressource introuvable");

    const { examId } = await loadQuestion(pool, id);
    if ((await countAttempts(pool, examId)) > 0) {
      throw new HttpError(409, "L'examen a déjà au moins une tentative, suppression refusée");
    }

    const result = await pool.query("DELETE FROM questions WHERE id = $1", [id]);
    if (!result.rowCount) throw new HttpError(404, "Ressource introuvable");
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

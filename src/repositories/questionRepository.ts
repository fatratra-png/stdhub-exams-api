import type { PoolClient } from "pg";
import { pool } from "../config/db.ts";
import type { Choice, ChoiceInput } from "../models/choice.ts";
import type { QuestionRow, QuestionWithExam, QuestionWithChoicesRow } from "../models/question.ts";
type Queryable = typeof pool | PoolClient;

export class QuestionRepository {
    async beginTransaction(): Promise<PoolClient> {
        const client = await pool.connect();
        await client.query("BEGIN");
        return client;
    }
    async commit(client: PoolClient): Promise<void> {
        await client.query("COMMIT");
        client.release();
    }
    async roolback(client: PoolClient): Promise<void> {
        await client.query("ROLLBACK").catch(() => undefined);
        client.release();
    }

    async examExists(examId: number, client: Queryable = pool): Promise<boolean> {
        const result = await client.query("SELECT id FROM exams WHERE id = $1", [examId]);
        return (result.rowCount ?? 0) > 0;
    }
    async hasAttempt(examId: number, client: Queryable = pool): Promise<boolean> {
        const result = await client.query("SELECT id FROM attempts WHERE exam_id = $1 LIMIT 1", [examId]);
        return (result.rowCount ?? 0) > 0;
    }

    async findForExam(examId: number): Promise<QuestionWithChoicesRow[]> {
        const result = await pool.query<QuestionWithChoicesRow>(
            `  
                SELECT q.id, q.statement AS "text", q.points AS score,
                    (SELECT COALESCE(
                        json_agg(json_build_object('id', c.id, 'label', c.label, 'isCorrect', c.is_correct)
                        ORDER BY c.id),
                    '[]'::json)
                    FROM choices c WHERE c.question_id = q.id) AS choices
                FROM questions q
                WHERE q.exam_id = $1
                ORDER BY q.position, q.id
            `, [examId],
        );
        return result.rows;
    }

    async findWithExamId(quesionId: number, client: Queryable = pool): Promise<QuestionWithExam | null> {
        const result = await client.query<{
            id: number;
            text: string;
            score: number;
            examId: number;
            position: number;
        }>(
            `
            SELECT id, statement AS "text", points AS score, exam_id AS "examId", position
            FROM questions WHERE id=$1
            `, [quesionId]
        );
        const row = result.rows[0];
        if(!row) return null;
        return {
            question: {id: row.id, text: row.text, score: row.score},
            examId: row.examId,
            position: row.position,
        };
    }

    async findChoices(questionId: number, client: Queryable = pool): Promise<Choice[]> {
        const result = await client.query<Choice>(
            `
            SELECT id, question_id AS "questionId", label, is_correct AS "isCorrect"
            FROM choices WHERE question_id = $1 ORDER BY id
            `, [questionId],
        );
        return result.rows;
    }

    async nextPosition(examId: number, client: Queryable): Promise<number> {
        const result = await client.query<{max: number | null}>(
            "SELECT MAX(position) AS max FROM questions WHERE exam_id = $1",
            [examId],
        );
        return (result.rows[0]?.max ?? 0) + 1;
    }

    async createQuestion(examId: number, text: string, score: number, position: number, client: Queryable,): Promise<QuestionRow> {
        const result = await client.query<{id: number; score: number}>(
            `INSERT INTO questions(exam_id, statement, points, position)
            VALUES ($1, $2, $3, $4) RETURNING id, points AS score
            `, [examId, text, score, position],
        );
        const row = result.rows[0] as {id: number; score: number};
        return {id: row.id, text, score: row.score};
    }

    async createChoices(questionId: number, choices: ChoiceInput[], client: Queryable): Promise<void> {
        for (const choice of choices) {
            await client.query("INSERT INTO choices(question_id, label, is_correct) VALUES ($1, $2, $3)", [questionId, choice.label, choice.isCorrect,]);
        }
    }

    async updateQuestion(id: number, text: string, score: number, client: Queryable): Promise<void> {
        await client.query("UPDATE questions SET statement = $1, points = $2 WHERE id = $3", [text, score, id]);
    }

    async replaceChoice(questionId: number, choices: ChoiceInput[], client: Queryable): Promise<void> {
        await client.query("DELETE FROM choices WHERE question_id = $1", [questionId]);
        await this.createChoices(questionId, choices, client);
    }
    async deleteQuestion(id: number): Promise<boolean> {
        const result = await pool.query("DELETE FROM questions WHERE id=$1", [id]);
        return (result.rowCount ?? 0) > 0;
    }
}
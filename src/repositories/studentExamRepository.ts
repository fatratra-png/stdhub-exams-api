import type { PoolClient } from "pg";
import { pool } from "../config/db.ts";
import type { PublicExamRow, AttemptHistoryRow } from "../models/exam.ts";
import type { GradingChoiceRow } from "../models/choice.ts";
import type { PublicQuestionRow, QuestionRow, CorrectionRow } from "../models/question.ts";
type Queryable = typeof pool | PoolClient;

const PUBLIC_EXAM_SELECT = `
    SELECT e.id, e.course_id AS "courseId", c.name AS "courseName",
        e.title, e.description, e.start_date AS "startDate", e.end_date AS "endDate"
    FROM exams e
    JOIN courses c ON c.id = e.course_id
`;

export class StudentExamRepository {
    async beginTransaction(): Promise<PoolClient> {
        const client = await pool.connect();
        await client.query("BEGIN");
        return client;
    }
    async commit(client: PoolClient): Promise<void> {
        await client.query("COMMIT");
        client.release();
    }
    async rollback(client: PoolClient): Promise<void> {
        await client.query("ROLLBACK").catch(() => {undefined});
        client.release();
    }

    async findAvailableExams(studentId: string): Promise<PublicExamRow[]> {
        const result = await pool.query<PublicExamRow>(
            `${PUBLIC_EXAM_SELECT}
            WHERE NOW() BETWEEN e.start_date AND e.end_date
            AND NOT EXISTS (
                SELECT 1 FROM attempts a
                WHERE a.exam_id = e.id AND a.student_id = $1 AND a.submitted_at IS NOT NULL
            )
            ORDER BY e.start_date`,
        [studentId],
        );
        return result.rows;
    }

    async findExamById(examId: number, client: Queryable = pool): Promise<PublicExamRow | null> {
        const result = await client.query<PublicExamRow>(
            `${PUBLIC_EXAM_SELECT} WHERE e.id = $1`, [examId]
        );
        return result.rows[0] ?? null;
    }

    async hasSubmittedAttempt(examId: number, studentId: string, client: Queryable = pool): Promise<boolean> {
        const result = await client.query(
            "SELECT id FROM attempts WHERE student_id = $1 AND exam_id = $2 AND submitted_at IS NOT NULL",
            [studentId, examId],
        );
        return (result.rowCount ?? 0) > 0;
    }

    async findPublicQuestions(examId: number, client: Queryable = pool): Promise<PublicQuestionRow[]> {
        const result = await client.query<PublicQuestionRow>(
            `SELECT q.id, q.statement AS "text", q.points AS score,
                (SELECT COALESCE (
                    json_agg(json_build_object('id', ch.id, 'label', ch.label) ORDER BY ch.id),
                    '[]'::json)
                FROM choices ch WHERE ch.question_id = q.id
                ) AS choices
            FROM questions q
            WHERE q.exam_id = $1
            ORDER BY q.position, q.id
            `, [examId],
        );
        return result.rows;
    }

    async findGradingQuestions(examId: number, client: Queryable): Promise<QuestionRow[]> {
        const result = await client.query<QuestionRow>(
            `SELECT id, statement AS "text", points AS score
            FROM questions WHERE exam_id = $1 ORDER BY position, id`,
        [examId],
        );
        return result.rows;
    }


    async findGradingChoices(examId: number, client: Queryable = pool): Promise<GradingChoiceRow[]> {
        const result = await client.query<GradingChoiceRow>(
            `SELECT id, question_id AS "questionId", is_correct AS "isCorrect"
             FROM choices
             WHERE question_id IN (SELECT id FROM questions WHERE exam_id = $1)
            `, [examId],
        );
        return result.rows;
    }

    async createAttempt(studentId: string, examId: number, score: number, client: PoolClient): Promise<{ id: number; submittedAt: Date }> {
        const result = await client.query<{ id: number; submittedAt: Date }>(
            `INSERT INTO attempts(student_id, exam_id, started_at, submitted_at, score)
            VALUES ($1, $2, NOW(), NOW(), $3)
            RETURNING id, submitted_at AS "submittedAt"`,
        [studentId, examId, score],
        );
        return result.rows[0] as { id: number; submittedAt: Date };
    }

    async insertAnswers(attemptId: number, answers: Array<{ questionId: number; choiceId: number }>, client: PoolClient): Promise<void> {
        for (const answer of answers) {
            await client.query("INSERT INTO answers(attempt_id, question_id, choice_id) VALUES ($1, $2, $3)", [
                attemptId,
                answer.questionId,
                answer.choiceId,
            ]);
        }
    }

    async findCorrections(attemptId: number, examId: number, client: PoolClient): Promise<CorrectionRow[]> {
        const result = await client.query<CorrectionRow>(
            `SELECT q.id AS "questionId",
                q.statement AS "text",
                q.points AS score,
                (SELECT a.choice_id FROM answers a
                WHERE a.attempt_id = $1 AND a.question_id = q.id) AS "selectedChoiceId",
                (SELECT c.id FROM choices c
                WHERE c.question_id = q.id AND c.is_correct = TRUE LIMIT 1) AS "correctChoiceId",
                (SELECT COALESCE(
                            json_agg(json_build_object('id', ch.id, 'label', ch.label) ORDER BY ch.id),
                            '[]'::json)
                FROM choices ch WHERE ch.question_id = q.id) AS choices
            FROM questions q
            WHERE q.exam_id = $2
            ORDER BY q.position, q.id`,
            [attemptId, examId],
        );
        return result.rows;
    }

    async findMyResults(studentId: string): Promise<AttemptHistoryRow[]> {
        const result = await pool.query<AttemptHistoryRow>(
            `SELECT a.exam_id AS "examId",
                e.title AS "examTitle",
                c.name AS "courseName",
                COALESCE(a.score, 0) AS score,
                a.submitted_at AS "submittedAt",
                COALESCE((SELECT SUM(points) FROM questions WHERE exam_id = a.exam_id), 0) AS "maxScore"
            FROM attempts a
            JOIN exams e ON e.id = a.exam_id
            JOIN courses c ON c.id = e.course_id
            WHERE a.student_id = $1 AND a.submitted_at IS NOT NULL
            ORDER BY a.submitted_at DESC`,
            [studentId],
        );
        return result.rows;
    }
}
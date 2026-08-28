import { pool } from "../config/db.ts";
import type { ExamRow, RawExamRow, ExamInput, ExamDetailQuestionRow, ExamResultRow } from "../models/exam.ts";

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

const toExamRow = (row: RawExamRow): ExamRow => ({
    ...row,
    questionCount: Number(row.questionCount),
    attemptCount: Number(row.attemptCount),
});

export class ExamRepository {
    async findAll(courseId?: number): Promise<ExamRow[]> {
        const params: number[] = [];
        let where = "";
        if (courseId !== undefined) {
            params.push(courseId);
            where = `WHERE e.course_id = $${params.length}`;
        }
        const result = await pool.query<RawExamRow>(`${EXAM_SELECT} ${where} ORDER BY e.id`, params);
        return result.rows.map(toExamRow);
    }

    async findById(id: number): Promise<ExamRow | null> {
        const result = await pool.query<RawExamRow>(`${EXAM_SELECT} WHERE e.id = $1`, [id]);
        const row = result.rows[0];
        return row ? toExamRow(row) : null;
    }

    async findQuestionsForExam(examId: number): Promise<ExamDetailQuestionRow[]> {
        
        const result = await pool.query<ExamDetailQuestionRow>(
            `SELECT q.id, q.statement AS "text", q.points AS score,
                    (SELECT COALESCE(
                                json_agg(json_build_object('id', c.id, 'label', c.label, 'isCorrect', c.is_correct)
                                        ORDER BY c.id),
                                '[]'::json)
                    FROM choices c WHERE c.question_id = q.id) AS answers
            FROM questions q
            WHERE q.exam_id = $1
            ORDER BY q.position, q.id`,
            [examId],
        );
        return result.rows;
    }

    async courseExists(courseId: number): Promise<boolean> {
        const result = await pool.query("SELECT id FROM courses WHERE id = $1", [courseId]);
        return (result.rowCount ?? 0) > 0;
    }

    async exists(id: number): Promise<boolean> {
        const result = await pool.query("SELECT id FROM exams WHERE id = $1", [id]);
        return (result.rowCount ?? 0) > 0;
    }

    async create(input: ExamInput): Promise<ExamRow> {
        const result = await pool.query<{
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
            [input.courseId, input.title, input.description, input.startDate, input.endDate],
        );
        const row = result.rows[0] as (typeof result.rows)[number];
        return { ...row, questionCount: 0, attemptCount: 0 };
    }

    async update(id: number, input: ExamInput): Promise<boolean> {
        const result = await pool.query(
            `UPDATE exams SET course_id = $1, title = $2, description = $3, start_date = $4, end_date = $5
            WHERE id = $6`,
            [input.courseId, input.title, input.description, input.startDate, input.endDate, id],
        );
        return (result.rowCount ?? 0) > 0;
    }

    async delete(id: number): Promise<void> {
        await pool.query("DELETE FROM exams WHERE id = $1", [id]);
    }

    async hasAttempts(id: number): Promise<boolean> {
        const result = await pool.query("SELECT id FROM attempts WHERE exam_id = $1 LIMIT 1", [id]);
        return (result.rowCount ?? 0) > 0;
    }

    async findTitle(id: number): Promise<string | null> {
        const result = await pool.query<{ title: string }>("SELECT title FROM exams WHERE id = $1", [id]);
        return result.rows[0]?.title ?? null;
    }

    async getResultRows(examId: number): Promise<ExamResultRow[]> {
        const result = await pool.query<ExamResultRow>(
            `SELECT a.student_id AS "studentId",
                    TRIM(s.first_name || ' ' || COALESCE(s.name, '')) AS "studentName",
                    COALESCE(a.score, 0) AS score,
                    COALESCE((SELECT SUM(points) FROM questions WHERE exam_id = a.exam_id), 0) AS "maxScore",
                    a.submitted_at AS "submittedAt"
            FROM attempts a
            JOIN students s ON s.id = a.student_id
            WHERE a.exam_id = $1 AND a.submitted_at IS NOT NULL
            ORDER BY a.submitted_at`,
            [examId],
        );
        return result.rows;
    }
}
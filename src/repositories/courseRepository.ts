import { pool } from "../config/db.ts";
import type { CourseRow } from "../models/course.ts";

export class CourseRepository {
    async findAll(): Promise<CourseRow[]> {
        const result = await pool.query<CourseRow>(
            "SELECT id, code, name, description FROM courses ORDER BY id",
        );
        return result.rows;
    }

    async findByCode(code: string, excludeId?: number): Promise<CourseRow | null> {
        const result = excludeId
        ? await pool.query<CourseRow>(
            "SELECT id, code, name, description FROM courses WHERE code = $1 AND id <> $2",
            [code, excludeId],
            )
        : await pool.query<CourseRow>(
            "SELECT id, code, name, description FROM courses WHERE code = $1",
            [code],
            );
        return result.rows[0] ?? null;
    }

    async create(code: string, name: string, description: string | null): Promise<CourseRow> {
        const result = await pool.query<CourseRow>(
        "INSERT INTO courses(code, name, description) VALUES ($1, $2, $3) RETURNING id, code, name, description",
        [code, name, description],
        );
        return result.rows[0] as CourseRow;
    }

    async update(
        id: number,
        code: string,
        name: string,
        description: string | null,
    ): Promise<CourseRow | null> {
        const result = await pool.query<CourseRow>(
        "UPDATE courses SET code = $1, name = $2, description = $3 WHERE id = $4 RETURNING id, code, name, description",
        [code, name, description, id],
        );
        return result.rows[0] ?? null;
    }

    async hasExams(id: number): Promise<boolean> {
        const result = await pool.query("SELECT id FROM exams WHERE course_id = $1 LIMIT 1", [id]);
        return (result.rowCount ?? 0) > 0;
    }

    async delete(id: number): Promise<boolean> {
        const result = await pool.query("DELETE FROM courses WHERE id = $1", [id]);
        return (result.rowCount ?? 0) > 0;
    }
}
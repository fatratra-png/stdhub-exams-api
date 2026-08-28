import { pool } from "../config/db.ts";
import type { PublicStudent, RawStudentRow, CreateStudentRow, UpdateStudentRow } from "../models/user.ts";

const STUDENT_COLUMNS = "id, first_name, name, email, is_active, created_at";

const toStudent = (row: RawStudentRow): PublicStudent => ({
  id: row.id,
  firstName: row.first_name ?? undefined,
  name: row.name,
  email: row.email,
  isActive: row.is_active,
  createdAt: row.created_at,
});

export class StudentRepository {
    async findAll(): Promise<PublicStudent[]> {
        const result = await pool.query<RawStudentRow>(`SELECT ${STUDENT_COLUMNS} FROM students ORDER BY id`);
        return result.rows.map(toStudent);
    }

    async findById(id: string): Promise<PublicStudent | null> {
        const result = await pool.query<RawStudentRow>(`SELECT ${STUDENT_COLUMNS} FROM students WHERE id = $1`, [id]);
        const row = result.rows[0];
        return row ? toStudent(row) : null;
    }

    async findEmailOwnerId(email: string, excludeId?: string): Promise<string | null> {
        const result = await pool.query<{ id: string }>(
            "SELECT id FROM students WHERE email = $1 UNION ALL SELECT id FROM admins WHERE email = $1 LIMIT 1",
            [email],
        );
        const ownerId = result.rows[0]?.id ?? null;
        return ownerId === excludeId ? null : ownerId;
    }

    async create(input: CreateStudentRow): Promise<PublicStudent> {
        const result = await pool.query<RawStudentRow>(
            `INSERT INTO students(first_name, name, email, password_hash)
            VALUES ($1, $2, $3, $4)
            RETURNING ${STUDENT_COLUMNS}`,
            [input.firstName, input.name, input.email, input.passwordHash],
        );
        return toStudent(result.rows[0] as RawStudentRow);
    }

    async update(id: string, input: UpdateStudentRow): Promise<PublicStudent | null> {
        const result = await pool.query<RawStudentRow>(
            `UPDATE students SET
                first_name = $1,
                name = $2,
                email = $3,
                password_hash = COALESCE($4, password_hash)
                WHERE id = $5
            RETURNING ${STUDENT_COLUMNS}`,
            [input.firstName, input.name, input.email, input.passwordHash ?? null, id],
        );
        const row = result.rows[0];
        return row ? toStudent(row) : null;
    }

    async deactivate(id: string): Promise<PublicStudent | null> {
        const result = await pool.query<RawStudentRow>(
            `UPDATE students SET is_active = FALSE WHERE id = $1 RETURNING ${STUDENT_COLUMNS}`,
            [id],
        );
        const row = result.rows[0];
        return row ? toStudent(row) : null;
    }
}

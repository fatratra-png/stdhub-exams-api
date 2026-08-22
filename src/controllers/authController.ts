import type { Role, AccountRow } from "../models/user.ts";
import { pool } from "../config/db.ts";

export class AuthRepository {
    async getUserAccount(email: string): Promise<AccountRow | null> {
        let role: Role = "STUDENT";
        let account: AccountRow | undefined = (
            await pool.query<AccountRow>(
                "SELECT id, email, password_hash AS \"passwordHash\", NULL::boolean AS \"isActive\" FROM admins WHERE email = $1",
                [email],
            ) 
        ).rows[0];

        if (account) {
            role = "ADMIN";
        } else {
            account = (
                await pool.query<AccountRow>(
                    "SELECT id, email, password_hash AS \"passwordHash\", is_active AS \"isActive\" FROM students WHERE email = $1",
                    [email]
                )
            ).rows[0];
        }
        return account || null;
    }
}
import type { Role, AccountRow, AccountResponse } from "../models/user.ts";
import { pool } from "../config/db.ts";

export class AuthRepository {
    async getUserAccount(email: string): Promise<AccountResponse | null> {
        let role: Role = "STUDENT";
        let account: AccountRow | undefined = (
            await pool.query<AccountRow>(
                "SELECT id, email, password_hash AS \"passwordHash\", true::boolean AS \"isActive\" FROM admins WHERE email = $1",
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
        if (!account) {
            return null;
        }
        const accountResponse: AccountResponse = {
            ...account,
            role: role
        };
        return accountResponse;
    }
}
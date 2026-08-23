import bcrypt from "bcryptjs";

const SALT_ROUNDS: number = 10;
export const PasswordSecurity = {
    async hash(password: string): Promise<string> {
        return bcrypt.hash(password, SALT_ROUNDS);
    },
    async compare(plain: string, hash: string): Promise<boolean> {
        return bcrypt.compare(plain, hash);
    }
}
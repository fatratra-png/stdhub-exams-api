import type { AuthRepository } from "../repositories/authRepository.ts";
import { JwtSecurity } from "../security/jwtSecurity.ts";
import { PasswordSecurity } from "../security/passwordSecurity.ts";

export class AuthService {
    constructor(private authRepository: AuthRepository) {}
    async login(email: string, passwordPlain: string) {
        const user = await this.authRepository.getUserAccount(email);
        if (!user) throw new Error('Email ou mot de passe incorrect');

        const isValidPassword = await PasswordSecurity.compare(passwordPlain, user.passwordHash);
        if (!isValidPassword) throw new Error("Mot de passe non valide");

        const isValidStatus = user.isActive;
        if (!isValidStatus) throw new Error("Compte non actif");

        const token = JwtSecurity.generateToken({
            id: user.id,
            role: user.role
        });

        return {
            token,
            user: {id: user.id, email: user.email, role: user.role}
        };
    }
}
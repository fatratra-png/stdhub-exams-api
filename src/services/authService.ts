import type { AuthRepository } from "../repositories/authRepository.ts";

export class AuthService {
    constructor(private authRepository: AuthRepository) {}
    async login(email: string, passwordPlain: string) {
        const user = await this.authRepository.getUserAccount(email);
        if (!user) throw new Error('Email ou mot de passe incorrect');
        
    }
}
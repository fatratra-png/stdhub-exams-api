import type { Request, Response } from "express";
import { AuthRepository } from "../repositories/authRepository.ts";
import { AuthService } from "../services/authService.ts";

const authRepository = new AuthRepository();
const authService = new AuthService(authRepository);

export class AuthController {
    async authUser(req: Request, res: Response): Promise<void> {
        try {
            const {email, password} = req.body;
            if (!email || !password) {
                res.status(400).json({message: 'Champs manquant'});
                return;
            }
            const result = await authService.login(email, password);
            res.status(200).json(result);
        } catch (error) {
            if (error instanceof Error) {
                if (error.message === 'Email ou mot de passe incorrect' || error.message === 'Mot de passe non valide' || error.message === "Compte non actif") {
                    res.status(401).json({ message: 'Email ou mot de passe incorrect' });
                    return; 
                }
                res.status(500).json({ message: 'Erreur serveur', detail: error.message });
            }
        }
    }
}
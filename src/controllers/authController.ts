import type { NextFunction, Request, Response } from "express";
import { AuthRepository } from "../repositories/authRepository.ts";
import { AuthService } from "../services/authService.ts";
import { HttpError } from "../errors/errors.ts";
import { handleControllerError } from "./controllerError.ts";

const authRepository = new AuthRepository();
const authService = new AuthService(authRepository);

export class AuthController {
    async authUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const {email, password} = req.body;
            if (!email || !password) {
                res.status(400).json({message: 'Champs manquant'});
                return;
            }
            const result = await authService.login(email, password);
            res.status(200).json(result);
        } catch (error) {
            if (error instanceof Error && (error.message === 'Email ou mot de passe incorrect' || error.message === 'Mot de passe non valide' || error.message === "Compte non actif")) {
                next(new HttpError(401, 'Email ou mot de passe incorrect'));
                return;
            }
            handleControllerError(error, next);
        }
    }
}

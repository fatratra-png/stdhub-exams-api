import { Router } from "express";
import { AuthController } from "../controllers/authController.ts";
import rateLimit from "express-rate-limit";

export const authRouter = Router();
const authController = new AuthController();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Erreur : trop de tentative, réessaie plus tard"},
});

authRouter.post('/login', loginLimiter, (req, res) => authController.authUser(req, res));
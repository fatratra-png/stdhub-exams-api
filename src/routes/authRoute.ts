import { Router } from "express";
import { AuthController } from "../controllers/authController.ts";

export const authRouter = Router();
const authController = new AuthController();

authRouter.post('/login', (req, res) => authController.authUser(req, res));
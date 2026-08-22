import { Router } from "express";
import { AuthController } from "../controllers/authController.ts";

const router = Router();
const authController = new AuthController();

router.post('/login', (req, res) => authController.authUser(req, res));

export default router;
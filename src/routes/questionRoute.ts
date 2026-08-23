import { Router } from "express";
import { QuestionController } from "../controllers/questionController.ts";
import { requireAuth, requireRole } from "../middlewares/auth.ts";

export const questionsRouter = Router();
const questionController = new QuestionController();

questionsRouter.use(requireAuth, requireRole("ADMIN"));

questionsRouter.get("/exams/:id/questions", (req, res, next) => questionController.listForExam(req, res, next));
questionsRouter.post("/exams/:id/questions", (req, res, next) => questionController.create(req, res, next));
questionsRouter.put("/questions/:id", (req, res, next) => questionController.update(req, res, next));
questionsRouter.delete("/questions/:id", (req, res, next) => questionController.remove(req, res, next));
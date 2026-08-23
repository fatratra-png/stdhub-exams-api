import { Router } from "express";
import { StudentExamController } from "../controllers/studentExamController.ts";
import { requireAuth, requireRole } from "../middlewares/auth.ts";

export const myRouter = Router();
const studentExamController = new StudentExamController();

myRouter.use(requireAuth, requireRole("STUDENT"));

myRouter.get("/exams", (req, res, next) => studentExamController.listAvailable(req, res, next));
myRouter.get("/exams/:id", (req, res, next) => studentExamController.detail(req, res, next));
myRouter.post("/exams/:id/submit", (req, res, next) => studentExamController.submit(req, res, next));
myRouter.get("/results", (req, res, next) => studentExamController.myResults(req, res, next));
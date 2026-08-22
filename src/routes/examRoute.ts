import { Router } from "express";
import { ExamController } from "../controllers/examController.ts";
import { requireAuth, requireRole } from "../middlewares/auth.ts";

export const examsRouter = Router();
const examController = new ExamController();

examsRouter.use(requireAuth, requireRole("ADMIN"));

examsRouter.get("/", (req, res, next) => examController.list(req, res, next));
examsRouter.post("/", (req, res, next) => examController.create(req, res, next));
examsRouter.get("/:id/results", (req, res, next) => examController.results(req, res, next));
examsRouter.get("/:id", (req, res, next) => examController.detail(req, res, next));
examsRouter.put("/:id", (req, res, next) => examController.update(req, res, next));
examsRouter.delete("/:id", (req, res, next) => examController.remove(req, res, next));
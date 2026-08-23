import { Router } from "express";
import { StudentController } from "../controllers/studentController.ts";
import { requireAuth, requireRole } from "../middlewares/auth.ts";

export const studentsRouter = Router();
const studentController = new StudentController();

studentsRouter.use(requireAuth, requireRole("ADMIN"));

studentsRouter.get("/", (req, res, next) => studentController.list(req, res, next));
studentsRouter.post("/", (req, res, next) => studentController.create(req, res, next));
studentsRouter.put("/:id", (req, res, next) => studentController.update(req, res, next));
studentsRouter.delete("/:id", (req, res, next) => studentController.deactivate(req, res, next));

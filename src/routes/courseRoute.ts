import { Router } from "express";
import { CourseController } from "../controllers/courseController.ts";
import { requireAuth, requireRole } from "../middlewares/auth.ts";

export const coursesRouter = Router();
const courseController = new CourseController();

coursesRouter.use(requireAuth, requireRole("ADMIN"));

coursesRouter.get("/", (req, res, next) => courseController.list(req, res, next));
coursesRouter.post("/", (req, res, next) => courseController.create(req, res, next));
coursesRouter.put("/:id", (req, res, next) => courseController.update(req, res, next));
coursesRouter.delete("/:id", (req, res, next) => courseController.remove(req, res, next));
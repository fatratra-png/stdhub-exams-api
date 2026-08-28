import type { NextFunction, Request, Response } from "express";
import { CourseRepository } from "../repositories/courseRepository.ts";
import { CourseService } from "../services/courseService.ts";
import { handleControllerError } from "./controllerError.ts";

const courseRepository = new CourseRepository();
const courseService = new CourseService(courseRepository);

export class CourseController {
    async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const courses = await courseService.list();
            res.status(200).json(courses);
        } catch (error) {
            handleControllerError(error, next);
        }
    }

    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const course = await courseService.create(req.body);
            res.status(201).json(course);
        } catch (error) {
            handleControllerError(error, next);
        }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = Number(req.params.id);
            const course = await courseService.update(id, req.body);
            res.status(200).json(course);
        } catch (error) {
            handleControllerError(error, next);
        }
    }

    async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = Number(req.params.id);
            await courseService.remove(id);
            res.status(204).send();
        } catch (error) {
            handleControllerError(error, next);
        }
    }
}
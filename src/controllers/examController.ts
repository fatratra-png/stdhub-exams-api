import type { NextFunction, Request, Response } from "express";
import { ExamRepository } from "../repositories/examRepository.ts";
import { ExamService } from "../services/examService.ts";

const examRepository = new ExamRepository();
const examService = new ExamService(examRepository);

export class ExamController {
    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const exams = await examService.list(req.query.courseId);
            res.status(200).json(exams);
        } catch (error) {
            next(error);
        }
    }

    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const exam = await examService.create(req.body);
            res.status(201).json(exam);
        } catch (error) {
            next(error);
        }
    }

    async detail(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = Number(req.params.id);
            const exam = await examService.getDetail(id);
            res.status(200).json(exam);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = Number(req.params.id);
            const exam = await examService.update(id, req.body);
            res.status(200).json(exam);
        } catch (error) {
            next(error);
        }
    }

    async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = Number(req.params.id);
            await examService.remove(id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    async results(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = Number(req.params.id);
            const summary = await examService.getResults(id);
            res.status(200).json(summary);
        } catch (error) {
            next(error);
        }
    }
}
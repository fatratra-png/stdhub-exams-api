import type { NextFunction, Request, Response } from "express";
import { QuestionRepository } from "../repositories/questionRepository.ts";
import { QuestionService } from "../services/questionService.ts";

const questionRepository = new QuestionRepository();
const questionService = new QuestionService(questionRepository);

export class QuestionController {
    async listForExam(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const examId = Number(req.params.id);
            const questions = await questionService.listForExam(examId);
            res.status(200).json(questions);
        } catch (error) {
            next(error);
        }
    }

    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const examId = Number(req.params.id);
            const question = await questionService.create(examId, req.body);
            res.status(201).json(question);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = Number(req.params.id);
            const question = await questionService.update(id, req.body);
            res.status(200).json(question);
        } catch (error) {
            next(error);
        }
    }

    async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = Number(req.params.id);
            await questionService.remove(id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}
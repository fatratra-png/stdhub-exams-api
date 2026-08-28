import type { NextFunction, Request, Response } from "express";
import { StudentExamRepository } from "../repositories/studentExamRepository.ts";
import { StudentExamService } from "../services/studentExamService.ts";
import type { AuthentificatedRequest } from "../security/authentificatedRequest.ts";
import { handleControllerError } from "./controllerError.ts";
const studentExamRepository = new StudentExamRepository();
const studentExamService = new StudentExamService(studentExamRepository);

export class StudentExamController {
    async listAvailable(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const studentId = (req as AuthentificatedRequest).user.id;
            const exams = await studentExamService.listAvailable(studentId);
            res.status(200).json(exams);
        } catch (error) {
            handleControllerError(error, next);
        }
    }

    async detail(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const examId = Number(req.params.id);
            const studentId = (req as AuthentificatedRequest).user.id;
            const exam = await studentExamService.getDetail(examId, studentId);
            res.status(200).json(exam);
        } catch (error) {
            handleControllerError(error, next);
        }
    }

    async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const examId = Number(req.params.id);
            const studentId = (req as AuthentificatedRequest).user.id;
            const result = await studentExamService.submit(examId, studentId, req.body);
            res.status(201).json(result);
        } catch (error) {
            handleControllerError(error, next);
        }
    }

    async myResults(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const studentId = (req as AuthentificatedRequest).user.id;
            const results = await studentExamService.getMyResults(studentId);
            res.status(200).json(results);
        } catch (error) {
            handleControllerError(error, next);
        }
    }
}
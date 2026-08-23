import type { NextFunction, Request, Response } from "express";
import { StudentRepository } from "../repositories/studentRepository.ts";
import { StudentService } from "../services/studentService.ts";

const studentRepository = new StudentRepository();
const studentService = new StudentService(studentRepository);

export class StudentController {
    async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const students = await studentService.list();
            res.status(200).json(students);
        } catch (error) {
            next(error);
        }
    }
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const student = await studentService.create(req.body);
            res.status(201).json(student);
        } catch (error) {
            next(error);
        }
    }
    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const student = await studentService.update(String(req.params.id), req.body);
            res.status(200).json(student);
        } catch (error) {
            next(error);
        }
    }
    async deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const student = await studentService.deactivate(String(req.params.id));
            res.status(200).json(student);
        } catch (error) {
            next(error);
        }
    }
}
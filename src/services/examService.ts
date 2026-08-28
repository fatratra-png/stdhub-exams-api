import type {ExamRow, ExamInput, ExamDetail, ExamResultsSummary} from "../models/exam.ts";
import { ExamRepository } from "../repositories/examRepository.ts";
import { DomainError } from "../errors/errors.ts";

export class ExamService {
    private examRepository: ExamRepository;
    constructor(examRepository: ExamRepository) {
        this.examRepository = examRepository;
    }

    private parsePayload(body: unknown): ExamInput {
        const { courseId, title, description, startDate, endDate } = (body ?? {}) as Record<string, unknown>;

        const cid = Number(courseId);
        if (!Number.isInteger(cid)) {
            throw new DomainError("Données invalides : courseId doit être un entier");
        }
        if (typeof title !== "string" || title.trim().length === 0) {
            throw new DomainError("Données invalides : title est requis");
        }
        if (typeof startDate !== "string" || typeof endDate !== "string") {
            throw new DomainError("Données invalides : startDate et endDate doivent être des dates");
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            throw new DomainError("Données invalides : startDate et endDate doivent être des dates");
        }
        if (end.getTime() <= start.getTime()) {
            throw new DomainError("Données invalides : endDate doit être postérieure à startDate");
        }
        if (description !== undefined && description !== null && typeof description !== "string") {
            throw new DomainError("Données invalides : description doit être une chaîne");
        }

        return {
            courseId: cid,
            title: title.trim(),
            description: typeof description === "string" ? description : null,
            startDate: start,
            endDate: end,
        };
    }

    async list(courseIdParam: unknown): Promise<ExamRow[]> {
        let courseId: number | undefined;
        if (courseIdParam !== undefined) {
            courseId = Number(courseIdParam);
            if (!Number.isInteger(courseId)) {
                throw new DomainError("Données invalides : courseId doit être un entier");
            }
        }
        return this.examRepository.findAll(courseId);
    }

    async create(body: unknown): Promise<ExamRow> {
        const payload = this.parsePayload(body);
        const courseExists = await this.examRepository.courseExists(payload.courseId);
        if (!courseExists) {
            throw new DomainError("Le cours référencé n'existe pas");
        }
        return this.examRepository.create(payload);
    }

    async getDetail(id: number): Promise<ExamDetail> {
        if (!Number.isInteger(id)) {
            throw new DomainError("Ressource introuvable");
        }
        const exam = await this.examRepository.findById(id);
        if (!exam) {
            throw new DomainError("Ressource introuvable");
        }
        const questions = await this.examRepository.findQuestionsForExam(id);
        return { ...exam, questions };
    }

    async update(id: number, body: unknown): Promise<ExamRow> {
        if (!Number.isInteger(id)) {
            throw new DomainError("Ressource introuvable");
        }
        const payload = this.parsePayload(body);
        const courseExists = await this.examRepository.courseExists(payload.courseId);
        if (!courseExists) {
            throw new DomainError("Le cours référencé n'existe pas");
        }
        const updated = await this.examRepository.update(id, payload);
        if (!updated) {
            throw new DomainError("Ressource introuvable");
        }
        return (await this.examRepository.findById(id)) as ExamRow;
    }

    async remove(id: number): Promise<void> {
        if (!Number.isInteger(id)) {
            throw new DomainError("Ressource introuvable");
        }
        const exists = await this.examRepository.exists(id);
        if (!exists) {
            throw new DomainError("Ressource introuvable");
        }
        const hasAttempts = await this.examRepository.hasAttempts(id);
        if (hasAttempts) {
            throw new DomainError("L'examen possède des tentatives, suppression refusée");
        }
        await this.examRepository.delete(id);
    }

    async getResults(id: number): Promise<ExamResultsSummary> {
        if (!Number.isInteger(id)) {
            throw new DomainError("Ressource introuvable");
        }
        const title = await this.examRepository.findTitle(id);
        if (title === null) {
            throw new DomainError("Ressource introuvable");
        }
        const results = await this.examRepository.getResultRows(id);
        const attemptsCount = results.length;
        const average = attemptsCount
            ? Math.round((results.reduce((sum, row) => sum + row.score, 0) / attemptsCount) * 100) / 100
            : 0;
        return { examId: id, examTitle: title, average, attemptsCount, results };
    }
}
import type { CourseRepository } from "../repositories/courseRepository.ts";
import { HttpError } from "../errors/errors.ts";
import type { CourseRow, CoursePayload } from "../models/course.ts";

export class CourseService {
    private courseRepository: CourseRepository;
    constructor(courseRepository: CourseRepository) {
        this.courseRepository = courseRepository;
    }

    private parsePayload(body: unknown): CoursePayload {
        const { code, name, description } = (body ?? {}) as Record<string, unknown>;

        if (typeof code !== "string" || code.trim().length === 0) {
            throw new HttpError(400, "Données invalides : code est requis");
        }
        if (typeof name !== "string" || name.trim().length === 0) {
            throw new HttpError(400, "Données invalides : name est requis");
        }
        if (description !== undefined && description !== null && typeof description !== "string") {
            throw new HttpError(400, "Données invalides : description doit être une chaîne");
        }
        return {
            code: code.trim(),
            name: name.trim(),
            description:
                typeof description === "string" && description.trim().length > 0
                ? description.trim()
                : null,
        };
    }

    async list(): Promise<CourseRow[]> {
        return this.courseRepository.findAll();
    }

    async create(body: unknown): Promise<CourseRow> {
        const payload = this.parsePayload(body);

        const existing = await this.courseRepository.findByCode(payload.code);
        if (existing) {
            throw new HttpError(409, "Le code de cours existe déjà");
        }
        return this.courseRepository.create(payload.code, payload.name, payload.description);
    }

    async update(id: number, body: unknown): Promise<CourseRow> {
        if (!Number.isInteger(id)) {
            throw new HttpError(404, "Ressource introuvable");
        }
        const payload = this.parsePayload(body);

        const duplicate = await this.courseRepository.findByCode(payload.code, id);
        if (duplicate) {
            throw new HttpError(409, "Le code de cours existe déjà");
        }
        const updated = await this.courseRepository.update(
            id,
            payload.code,
            payload.name,
            payload.description,
        );
        if (!updated) {
            throw new HttpError(404, "Ressource introuvable");
        }
        return updated;
    }

    async remove(id: number): Promise<void> {
        if (!Number.isInteger(id)) {
            throw new HttpError(404, "Ressource introuvable");
        }
        const hasExams = await this.courseRepository.hasExams(id);
        if (hasExams) {
            throw new HttpError(409, "Le cours possède des examens, suppression refusée");
        }
        const deleted = await this.courseRepository.delete(id);
        if (!deleted) {
            throw new HttpError(404, "Ressource introuvable");
        }
    }
}
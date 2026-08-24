import type { CreateStudentRow, UpdateStudentRow, PublicStudent } from "../models/user.ts";
import { StudentRepository } from "../repositories/studentRepository.ts";
import { HttpError } from "../errors/errors.ts";
import { PasswordSecurity } from "../security/passwordSecurity.ts";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@mail\.hei\.school$/;

interface CreatePayload {
  firstName: string;
  lastName: string | null;
  email: string;
  password: string;
}
 
interface UpdatePayload {
  firstName?: string;
  lastName?: string | null;
  email?: string;
  password?: string;
}

export class StudentService {
    private studentRepository: StudentRepository;
    constructor(studentRepository: StudentRepository) {
        this.studentRepository = studentRepository;
    }
 
    private parseCreatePayload(body: unknown): CreatePayload {
        const { firstName, lastName, email, password } = (body ?? {}) as Record<string, unknown>;
    
        if (typeof firstName !== "string" || firstName.trim().length === 0) {
            throw new HttpError(400, "Champ requis manquant : firstName");
        }
        if (typeof email !== "string") {
            throw new HttpError(400, "Champ requis manquant : email");
        }
        if (!EMAIL_REGEX.test(email)) {
            throw new HttpError(400, "Adresse email invalide");
        }
        if (typeof password !== "string" || password.length < 8) {
            throw new HttpError(400, "Le mot de passe doit contenir au moins 8 caractères");
        }
        if (lastName !== undefined && lastName !== null && typeof lastName !== "string") {
            throw new HttpError(400, "Champ invalide : lastName");
        }
    
        return {
            firstName: firstName.trim(),
            lastName: typeof lastName === "string" && lastName.trim().length > 0 ? lastName.trim() : null,
            email: email.toLowerCase(),
            password,
        };
    }
    private parseUpdatePayload(body: unknown): UpdatePayload {
        const { firstName, lastName, email, password } = (body ?? {}) as Record<string, unknown>;
        const result: UpdatePayload = {};
    
        if (firstName !== undefined) {
            if (typeof firstName !== "string" || firstName.trim().length === 0) {
                throw new HttpError(400, "Champ invalide : firstName");
            }
            result.firstName = firstName.trim();
        }
        if (lastName !== undefined) {
            if (lastName !== null && typeof lastName !== "string") {
                throw new HttpError(400, "Champ invalide : lastName");
            }
            result.lastName = typeof lastName === "string" ? lastName.trim() || null : null;
        }
        if (email !== undefined) {
            if (typeof email !== "string" || !EMAIL_REGEX.test(email)) {
                throw new HttpError(400, "Adresse email invalide");
            }
            result.email = email.toLowerCase();
        }
        if (password !== undefined) {
            if (typeof password !== "string" || password.length < 8) {
                throw new HttpError(400, "Le mot de passe doit contenir au moins 8 caractères");
            }
            result.password = password;
        }
        return result;
    }
    
    async list(): Promise<PublicStudent[]> {
        return this.studentRepository.findAll();
    }
 
    async create(body: unknown): Promise<PublicStudent> {
        const payload = this.parseCreatePayload(body);
    
        const existingOwnerId = await this.studentRepository.findEmailOwnerId(payload.email);
        if (existingOwnerId !== null) {
            throw new HttpError(409, "Un compte avec cet email existe déjà");
        }
    
        const passwordHash = await PasswordSecurity.hash(payload.password);
        const input: CreateStudentRow = {
            firstName: payload.firstName,
            lastName: payload.lastName,
            email: payload.email,
            passwordHash,
        };
        return this.studentRepository.create(input);
    }
 
    async update(id: string, body: unknown): Promise<PublicStudent> {
        const current = await this.studentRepository.findById(id);
        if (!current) {
            throw new HttpError(404, "Ressource introuvable");
        }
        const payload = this.parseUpdatePayload(body);
        if (payload.email !== undefined) {
            const ownerId = await this.studentRepository.findEmailOwnerId(payload.email, id);
            if (ownerId !== null) {
                throw new HttpError(409, "Un compte avec cet email existe déjà");
            }
        }
        const passwordHash = payload.password !== undefined ? await PasswordSecurity.hash(payload.password) : undefined;
        const input: UpdateStudentRow = {
            firstName: payload.firstName ?? current.firstName,
            lastName: payload.lastName !== undefined ? payload.lastName : current.lastName,
            email: payload.email ?? current.email,
            passwordHash,
        };
        const updated = await this.studentRepository.update(id, input);
        if (!updated) {
            throw new HttpError(404, "Ressource introuvable");
        }
        return updated;
    }
    
    async deactivate(id: string): Promise<PublicStudent> {
        const updated = await this.studentRepository.deactivate(id);
        if (!updated) {
            throw new HttpError(404, "Ressource introuvable");
        }
        return updated;
    }
}
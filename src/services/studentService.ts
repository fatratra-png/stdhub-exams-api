import type { CreateStudentRow, UpdateStudentRow, PublicStudent } from "../models/user.ts";
import { StudentRepository } from "../repositories/studentRepository.ts";
import { DomainError } from "../errors/errors.ts";
import { PasswordSecurity } from "../security/passwordSecurity.ts";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@mail\.hei\.school$/;

interface CreatePayload {
  firstName: string | null;
  name: string;
  email: string;
  password: string;
}

interface UpdatePayload {
  firstName?: string | null;
  name?: string;
  email?: string;
  password?: string;
}

export class StudentService {
    private studentRepository: StudentRepository;
    constructor(studentRepository: StudentRepository) {
        this.studentRepository = studentRepository;
    }

    private parseCreatePayload(body: unknown): CreatePayload {
        const { firstName, name, email, password } = (body ?? {}) as Record<string, unknown>;

        if (typeof name !== "string" || name.trim().length === 0) {
            throw new DomainError("Champ requis manquant : name");
        }
        if (typeof email !== "string") {
            throw new DomainError("Champ requis manquant : email");
        }
        if (!EMAIL_REGEX.test(email)) {
            throw new DomainError("Adresse email invalide");
        }
        if (typeof password !== "string" || password.length < 8) {
            throw new DomainError("Le mot de passe doit contenir au moins 8 caractères");
        }
        if (firstName !== undefined && firstName !== null && typeof firstName !== "string") {
            throw new DomainError("Champ invalide : firstName");
        }

        return {
            firstName: typeof firstName === "string" && firstName.trim().length > 0 ? firstName.trim() : null,
            name: name.trim(),
            email: email.toLowerCase(),
            password,
        };
    }

    private parseUpdatePayload(body: unknown): UpdatePayload {
        const { firstName, name, email, password } = (body ?? {}) as Record<string, unknown>;
        const result: UpdatePayload = {};

        if (firstName !== undefined) {
            if (firstName !== null && typeof firstName !== "string") {
                throw new DomainError("Champ invalide : firstName");
            }
            result.firstName = typeof firstName === "string" ? firstName.trim() || null : null;
        }
        if (name !== undefined) {
            if (typeof name !== "string" || name.trim().length === 0) {
                throw new DomainError("Champ invalide : name");
            }
            result.name = name.trim();
        }
        if (email !== undefined) {
            if (typeof email !== "string" || !EMAIL_REGEX.test(email)) {
                throw new DomainError("Adresse email invalide");
            }
            result.email = email.toLowerCase();
        }
        if (password !== undefined) {
            if (typeof password !== "string" || password.length < 8) {
                throw new DomainError("Le mot de passe doit contenir au moins 8 caractères");
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
            throw new DomainError("Un compte avec cet email existe déjà");
        }

        const passwordHash = await PasswordSecurity.hash(payload.password);
        const input: CreateStudentRow = {
            firstName: payload.firstName,
            name: payload.name,
            email: payload.email,
            passwordHash,
        };
        return this.studentRepository.create(input);
    }

    async update(id: string, body: unknown): Promise<PublicStudent> {
        const current = await this.studentRepository.findById(id);
        if (!current) {
            throw new DomainError("Ressource introuvable");
        }
        const payload = this.parseUpdatePayload(body);
        if (payload.email !== undefined) {
            const ownerId = await this.studentRepository.findEmailOwnerId(payload.email, id);
            if (ownerId !== null) {
                throw new DomainError("Un compte avec cet email existe déjà");
            }
        }
        const passwordHash = payload.password !== undefined ? await PasswordSecurity.hash(payload.password) : undefined;
        const input: UpdateStudentRow = {
            firstName: payload.firstName !== undefined ? payload.firstName : (current.firstName ?? null),
            name: payload.name ?? current.name,
            email: payload.email ?? current.email,
            passwordHash,
        };
        const updated = await this.studentRepository.update(id, input);
        if (!updated) {
            throw new DomainError("Ressource introuvable");
        }
        return updated;
    }

    async deactivate(id: string): Promise<PublicStudent> {
        const updated = await this.studentRepository.deactivate(id);
        if (!updated) {
            throw new DomainError("Ressource introuvable");
        }
        return updated;
    }
}

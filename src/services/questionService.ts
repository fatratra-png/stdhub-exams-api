import type { QuestionWithChoicesRow, QuestionInput } from "../models/question.ts";
import type { ChoiceInput } from "../models/choice.ts";
import { QuestionRepository } from "../repositories/questionRepository.ts";
import { HttpError } from "../errors/errors.ts";

export class QuestionService {
    private questionRepository: QuestionRepository;
    constructor(questionRepository: QuestionRepository) {
        this.questionRepository = questionRepository;
    }
    
    private parsePayload(body: unknown): QuestionInput {
        const {text, score, choices} = (body ?? {}) as Record<string, unknown>;
        if (typeof text !== "string" || text.trim().length === 0) {
            throw new HttpError(400, "Données invalides : text est requis");
        }
        const parsedScore = Number(score);
        if (!Number.isInteger(parsedScore) || parsedScore < 1) {
            throw new HttpError(400, "Données invalides : score doit être un entier >= 1");
        }
        if (!Array.isArray(choices) || choices.length < 2 || choices.length > 6) {
            throw new HttpError(400, "Données invalides : entre 2 et 6 choix requis");
        } 

        let correctCount = 0;
        const parsedChoices: ChoiceInput[] = choices.map((choice) => {
            const {label, isCorrect} = (choice ?? {}) as Record<string, unknown>;
            if (typeof label !== "string" || label.trim().length === 0) {
                throw new HttpError(400, "Données invalides : chaque choix requiert un label");
            }
            if (typeof isCorrect !== "boolean") {
                throw new HttpError(400, "Données invalides : isCorrect est requis pour chaque choix");
            }
            if (isCorrect) correctCount += 1;
            return {label: label.trim(), isCorrect};
        });

        if (correctCount !== 1) {
            throw new HttpError(400, "Données invalides : une seule réponse correcte requise");
        }
        return {text: text.trim(), score: parsedScore, choices: parsedChoices};
    }

    async listForExam(examId: number): Promise<QuestionWithChoicesRow[]> {
        if (!Number.isInteger(examId)) {
            throw new HttpError(404, "Ressource introuvable");
        }
        const examExists = await this.questionRepository.examExists(examId);
        if (!examExists) {
            throw new HttpError(404, "Ressource introuvable");
        }
        return this.questionRepository.findForExam(examId);
    }

    async create(examId: number, body: unknown) {
        if (!Number.isInteger(examId)) {
            throw new HttpError(404, "Ressource introuvable");
        }
        const payload = this.parsePayload(body);
        const client = await this.questionRepository.beginTransaction();
        try {
            const examExists = await this.questionRepository.examExists(examId, client);
            if (!examExists) {
                throw new HttpError(404, "Ressource introuvable");
            }
            const hasAttempts = await this.questionRepository.hasAttempt(examId, client);
            if (!hasAttempts) {
                throw new HttpError(409, "Ajout refusé : l'examen a déjà au moins tentative");
            }
            const position = await this.questionRepository.nextPosition(examId, client);
            const question = await this.questionRepository.createQuestion(examId, payload.text, payload.score, position, client,);
            await this.questionRepository.createChoices(question.id, payload.choices, client);
            await this.questionRepository.commit(client);

            const choices = await this.questionRepository.findChoices(question.id);
            return {...question, examId, position, choices};
        } catch (error) {
            await this.questionRepository.roolback(client);
            throw error;
        }
    }

    async update(id: number, body: unknown) {
        if (!Number.isInteger(id)) {
            throw new HttpError(404, "Ressource introuvable");
        }
        const payload = this.parsePayload(body);
        const client = await this.questionRepository.beginTransaction();
        try {
            const found = await this.questionRepository.findWithExamId(id, client);
            if (!found) {
                throw new HttpError(404, "Ressource introuvable");
            }
            const hasAttempts = await this.questionRepository.hasAttempt(found.examId, client);
            if (hasAttempts) {
                throw new HttpError(409, "Modification refusé : l'examen a déjà au moins une tentative");
            }
            await this.questionRepository.updateQuestion(id, payload.text, payload.score, client);
            await this.questionRepository.replaceChoice(id, payload.choices, client);
            await this.questionRepository.commit(client);

            const choices = await this.questionRepository.findChoices(id);
            return {
                id,
                examId: found.examId,
                text: payload.text,
                score: payload.score,
                position: found.position,
                choices,
            };
        } catch (error) {
            await this.questionRepository.roolback(client);
            throw error;
        }
    }

      async remove(id: number): Promise<void> {
        if (!Number.isInteger(id)) {
            throw new HttpError(404, "Ressource introuvable");
        }
        const found = await this.questionRepository.findWithExamId(id);
        if (!found) {
            throw new HttpError(404, "Ressource introuvable");
        }
        const hasAttempts = await this.questionRepository.hasAttempt(found.examId);
        if (hasAttempts) {
            throw new HttpError(409, "Suppression refusé : l'examen a déjà une tentative");
        }
        const deleted = await this.questionRepository.deleteQuestion(id);
        if (!deleted) {
            throw new HttpError(404, "Ressource introuvable");
        }
    }
}
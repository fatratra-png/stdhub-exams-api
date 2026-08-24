import { HttpError } from "../errors/errors.ts";
import type { PublicExamRow, AttemptHistoryRow, PublicExamDetail, ExamResult } from "../models/exam.ts";
import { StudentExamRepository } from "../repositories/studentExamRepository.ts";
import type { SubmittedAnswer } from "../models/choice.ts";

const isUniqueViolation = (error: unknown): boolean =>
    typeof error === "object" && error !== null && (error as {code?: string}).code === "23505";

export class StudentExamService {
    private studentExamRepository: StudentExamRepository;
    constructor(studentExamRepository: StudentExamRepository) {
        this.studentExamRepository = studentExamRepository;
    }

    private assertInWindow(exam: PublicExamRow): void {
        const now = new Date();
        if (now < new Date(exam.startDate) || now > new Date(exam.endDate)) {
            throw new HttpError(403, "Examen hors de sa fenêtre de disponibilité");
        }
    }

    private parseSubmission(body: unknown): SubmittedAnswer[] {
        const { answers } = (body ?? {}) as Record<string, unknown>;
        if (!Array.isArray(answers)) {
            throw new HttpError(400, "Données invalides : answers est requis");
        }
        const submitted: SubmittedAnswer[] = [];
        for (const raw of answers) {
            const entry = (raw ?? {}) as Record<string, unknown>;
            const questionId = Number(entry.questionId);
            const choiceId = Number(entry.choiceId);
            if (!Number.isInteger(questionId) || !Number.isInteger(choiceId)) {
                throw new HttpError(400, "Données invalides : chaque réponse requiert questionId et choiceId");
            }
            if (submitted.some((answer) => answer.questionId === questionId)) {
                throw new HttpError(400, "Données invalides : réponses dupliquées pour une même question");
            }
            submitted.push({ questionId, choiceId });
        }
        return submitted;
    }

    async listAvailable(studentId: string): Promise<PublicExamRow[]> {
        return this.studentExamRepository.findAvailableExams(studentId);
    }
    
    async getDetail(examId: number, studentId: string): Promise<PublicExamDetail> {
        if (!Number.isInteger(examId)) {
            throw new HttpError(404, "Ressource introuvable");
        }
        const exam = await this.studentExamRepository.findExamById(examId);
        if (!exam) {
            throw new HttpError(404, "Ressource introuvable");
        }
        this.assertInWindow(exam);
    
        const alreadyAttempted = await this.studentExamRepository.hasSubmittedAttempt(examId, studentId);
        if (alreadyAttempted) {
            throw new HttpError(403, "Vous avez déjà passé cet examen");
        }
    
        const questions = await this.studentExamRepository.findPublicQuestions(examId);
        return { ...exam, questions };
    }

    async submit(examId: number, studentId: string, body: unknown): Promise<ExamResult> {
        if (!Number.isInteger(examId)) {
            throw new HttpError(404, "Ressource introuvable");
        }
        const submitted = this.parseSubmission(body);
        const client = await this.studentExamRepository.beginTransaction();
        try {
            const exam = await this.studentExamRepository.findExamById(examId, client);
            if (!exam) {
                throw new HttpError(404, "Ressource introuvable");
            }
            this.assertInWindow(exam);
    
            const alreadyAttempted = await this.studentExamRepository.hasSubmittedAttempt(examId, studentId, client);
            if (alreadyAttempted) {
                throw new HttpError(409, "L'étudiant a déjà passé cet examen");
            }
    
            const questions = await this.studentExamRepository.findGradingQuestions(examId, client);
            const choices = await this.studentExamRepository.findGradingChoices(examId, client);
            const choiceById = new Map(choices.map((choice) => [choice.id, choice]));
    
            let score = 0;
            for (const answer of submitted) {
                const choice = choiceById.get(answer.choiceId);
                if (!choice || choice.questionId !== answer.questionId) {
                    throw new HttpError(400, "Données invalides : choix inconnu pour une question de cet examen");
                }
                if (choice.isCorrect) {
                    score += questions.find((question) => question.id === answer.questionId)?.score ?? 0;
                }
            }
    
            let attempt: { id: number; submittedAt: Date };
            try {
                attempt = await this.studentExamRepository.createAttempt(studentId, examId, score, client);
            } catch (error) {
                if (isUniqueViolation(error)) {
                    throw new HttpError(409, "L'étudiant a déjà passé cet examen");
                }
                throw error;
            }
        
            await this.studentExamRepository.insertAnswers(attempt.id, submitted, client);
        
            const correctionRows = await this.studentExamRepository.findCorrections(attempt.id, examId, client);
            await this.studentExamRepository.commit(client);
        
            const maxScore = questions.reduce((total, question) => total + question.score, 0);
            const corrections = correctionRows.map((row) => ({
                ...row,
                isCorrect:
                row.selectedChoiceId !== null &&
                row.correctChoiceId !== null &&
                row.selectedChoiceId === row.correctChoiceId,
            }));
        
            return {
                attemptId: attempt.id,
                examId,
                score,
                maxScore,
                submittedAt: attempt.submittedAt,
                corrections,
            };
        } catch (error) {
            await this.studentExamRepository.rollback(client);
            throw error;
        }
    }

    async getMyResults(studentId: string): Promise<AttemptHistoryRow[]> {
        return this.studentExamRepository.findMyResults(studentId);
    }
}
import type { Choice, PublicChoice } from "./choice.ts";

export interface Question {
    id: number;
    examId: number;
    statement: string;
    points: number;
    position: number;
}

export interface QuestionWithChoices extends Choice {
    choices: Choice[];
}

export interface PublicQuestion {
    id: number;
    statement: string;
    points: number;
    choices: PublicChoice[];
}

export interface QuestionCorrection {
    questionId: number;
    statement: string;
    points: number;
    choices: PublicChoice[];
    selectedChoiceId: number | null;
    correctChoiceId: number;
    isCorrect: boolean;
}
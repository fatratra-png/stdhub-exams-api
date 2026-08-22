import type { Choice, PublicChoice } from "./choice.ts";

export interface Question {
    id: number;
    examId: number;
    text: string;
    points: number;
    position: number;
}

export interface QuestionWithChoices extends Question {
    choices: Choice[];
}

export interface PublicQuestion {
    id: number;
    text: string;
    points: number;
    choices: PublicChoice[];
}

export interface QuestionCorrection {
    questionId: number;
    text: string;
    score: number;
    choices: PublicChoice[];
    selectedChoiceId: number | null;
    correctChoiceId: number;
    isCorrect: boolean;
}
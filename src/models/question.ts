import type { Choice, ChoiceInput, PublicChoiceRow } from "./choice.ts";

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

export interface PublicQuestionRow {
    id: number;
    text: string;
    score: number;
    choices: PublicChoiceRow[];
}

export interface CorrectionRow {
    questionId: number;
    text: string;
    score: number;
    choices: PublicChoiceRow[];
    selectedChoiceId: number | null;
    correctChoiceId: number;
}
export interface QuestionRow {
  id: number;
  text: string;
  score: number;
}

export interface QuestionWithExam {
    question: QuestionRow;
    examId: number;
    position: number;
}

export interface QuestionWithChoicesRow {
    id: number;
    text: string;
    score: number;
    choices: Choice[];
}

export interface QuestionInput {
    text: string;
    score: number;
    choices: ChoiceInput[];
}
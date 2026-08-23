export interface Choice {
  id: number;
  questionId: number;
  label: string;
  isCorrect: boolean;
}

export interface PublicChoiceRow {
  id: number;
  label: string;
}

export interface ChoiceRow {
  id: number;
  label: string;
  isCorrect: boolean;
}

export interface GradingChoiceRow {
  id: number
  questionId: number;
  isCorrect: boolean;
}

export interface ChoiceInput {
  label: string;
  isCorrect: boolean;
}

export interface SubmittedAnswer {
  questionId: number;
  choiceId: number;
}

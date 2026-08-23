export interface Choice {
  id: number;
  questionId: number;
  label: string;
  isCorrect: boolean;
}

export interface PublicChoice {
  id: number;
  label: string;
}

export interface ChoiceRow {
  id: number;
  content: string;
  isCorrect: boolean;
}

export interface ChoiceInput {
  label: string;
  isCorrect: boolean;
}
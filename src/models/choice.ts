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
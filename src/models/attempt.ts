export interface Attempt {
    id: string;
    studentId: string;
    examId: number;
    startedAt: Date;
    submittedAt: Date | null;
    score: number | null;
}

export interface AttemptAnswer {
    id: number;
    attemptId: number;
    questionId: number;
    choiceId: number | null;
}

export interface AttemptHistoryItem {
    examId: number;
    examTitle: string;
    courseName: string;
    score: number | null;
    maxScore: number;
    submittedAt: Date | null;
}
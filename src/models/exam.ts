import type { PublicQuestion, QuestionCorrection } from "./question.ts";

export interface Exam {
  id: number;
  courseId: number;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}

export interface PublicExam {
  id: number;
  courseId: number;
  courseName: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
}

export interface PublicExamDetail extends PublicExam {
  questions: PublicQuestion[];
}

export interface ExamResult {
  attemptId: number;
  examId: number;
  score: number;
  maxScore: number;
  submittedAt: Date;
  corrections: QuestionCorrection[];
}

export interface ExamResultRow {
  studentId: string;
  studentName: string;
  score: number;
  maxScore: number;
  submittedAt: Date;
}

export interface ExamRow {
  id: number;
  courseId: number;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  questionCount: number;
  attemptCount: number;
}
 
export interface RawExamRow {
  id: number;
  courseId: number;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  questionCount: string;
  attemptCount: string;
}

export interface ExamDetailChoiceRow {
  id: number;
  content: string;
  isCorrect: boolean;
}

export interface ExamDetailQuestionRow {
  id: number;
  text: string;
  score: number;
  answers: ExamDetailChoiceRow[];
}

export interface ExamInput {
    courseId: number;
    title: string;
    description: string | null;
    startDate: Date;
    endDate: Date;
}

export interface ExamDetail extends ExamRow {
  questions: ExamDetailQuestionRow[];
}

export interface ExamResultsSummary {
  examId: number;
  examTitle: string;
  average: number;
  attemptsCount: number;
  results: ExamResultRow[];
}
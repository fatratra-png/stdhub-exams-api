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
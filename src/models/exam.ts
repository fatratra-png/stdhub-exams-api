export interface Exam {
  id: number;
  courseId: number;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}

export interface Course {
  id: number;
  code: string;
  name: string;
  description: string;
  createdAt: Date;
}

export interface CourseRow {
  id: number;
  code: string;
  name: string;
  description: string;
}
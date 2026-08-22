export interface Student {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  passwordHash: string;
  isActive: boolean;
  createdAt: Date;
}

export type PublicStudent = Omit<Student, "passwordHash">;

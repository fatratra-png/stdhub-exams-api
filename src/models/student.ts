export interface Student {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  passwordHash: string;
  isActive: boolean;
  createdAt: Date;
}

export type publicStudent = Omit<Student, "passwordHash">;

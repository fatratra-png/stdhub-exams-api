export type Role = 'ADMIN' | 'STUDENT';

export interface Admin {
    id: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
}

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

export interface AuthUser {
    id: string;
    role: Role;
}

export interface AccountRow {
    id: string;
    email: string;
    passwordHash: string;
    isActive: boolean;
}
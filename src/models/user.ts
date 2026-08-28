export type Role = 'ADMIN' | 'STUDENT';

export interface Admin {
    id: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
}

export interface Student {
  id: string;
  firstName?: string | undefined;
  name: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
  createdAt: Date;
}

export type PublicStudent = Omit<Student, "passwordHash">;

export interface RawStudentRow {
  id: string;
  first_name: string | null;
  name: string;
  email: string;
  is_active: boolean;
  created_at: Date;
}

export interface CreateStudentRow {
  firstName: string | null;
  name: string;
  email: string;
  passwordHash: string;
}

export interface UpdateStudentRow {
  firstName: string | null;
  name: string;
  email: string;
  passwordHash?: string | undefined;
}

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

export interface AccountResponse {
    id: string;
    email: string;
    passwordHash: string;
    isActive: boolean;
    role: Role;
}

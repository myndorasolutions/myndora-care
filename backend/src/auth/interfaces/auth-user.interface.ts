import { UserRole } from '@prisma/client';

export interface AuthUser {
  userId: string;
  email: string | null;
  role: UserRole;
  isVerified: boolean;
}

import { Role, User } from 'generated/prisma';

export const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  passwordHash: 'hashed-password',
  role: Role.USER,
  createdAt: new Date(),
  updatedAt: new Date(),
};

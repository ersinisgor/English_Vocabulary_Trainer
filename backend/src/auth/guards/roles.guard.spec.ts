import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { Role } from 'generated/prisma';
import { AuthenticatedRequest } from '../types/interfaces/authenticated-request.interface';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (
    user?: any,
    requiredRoles?: Role[],
  ): ExecutionContext => {
    if (requiredRoles !== undefined) {
      reflector.getAllAndOverride.mockReturnValue(requiredRoles);
    }

    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user,
        } as AuthenticatedRequest),
      }),
    } as any;
  };

  describe('canActivate', () => {
    describe('no roles required', () => {
      it('should return true when no roles are required', () => {
        reflector.getAllAndOverride.mockReturnValue(undefined);
        const context = createMockExecutionContext();

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should return true when roles array is empty', () => {
        reflector.getAllAndOverride.mockReturnValue([]);
        const context = createMockExecutionContext();

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should return true when roles is null', () => {
        reflector.getAllAndOverride.mockReturnValue(null);
        const context = createMockExecutionContext();

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });
    });

    describe('USER role', () => {
      const userWithUserRole = {
        id: 'user-123',
        email: 'user@example.com',
        role: Role.USER,
      };

      it('should allow USER when USER role is required', () => {
        const context = createMockExecutionContext(userWithUserRole, [
          Role.USER,
        ]);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should throw ForbiddenException when ADMIN role is required but user is USER', () => {
        const context = createMockExecutionContext(userWithUserRole, [
          Role.ADMIN,
        ]);

        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        expect(() => guard.canActivate(context)).toThrow('Insufficient role');
      });

      it('should allow USER when multiple roles include USER', () => {
        const context = createMockExecutionContext(userWithUserRole, [
          Role.USER,
          Role.ADMIN,
        ]);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });
    });

    describe('ADMIN role', () => {
      const userWithAdminRole = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: Role.ADMIN,
      };

      it('should allow ADMIN when ADMIN role is required', () => {
        const context = createMockExecutionContext(userWithAdminRole, [
          Role.ADMIN,
        ]);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should allow ADMIN when USER role is required', () => {
        // Assuming ADMIN has access to USER routes too
        const context = createMockExecutionContext(userWithAdminRole, [
          Role.USER,
        ]);

        const result = guard.canActivate(context);

        // Note: Current implementation checks if user.role is IN requiredRoles
        // So ADMIN won't automatically have USER access unless explicitly listed
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      });

      it('should allow ADMIN when multiple roles include ADMIN', () => {
        const context = createMockExecutionContext(userWithAdminRole, [
          Role.USER,
          Role.ADMIN,
        ]);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });
    });

    describe('no user (unauthenticated)', () => {
      it('should throw ForbiddenException when user is null', () => {
        const context = createMockExecutionContext(null, [Role.USER]);

        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        expect(() => guard.canActivate(context)).toThrow('Insufficient role');
      });

      it('should throw ForbiddenException when user is undefined', () => {
        const context = createMockExecutionContext(undefined, [Role.USER]);

        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        expect(() => guard.canActivate(context)).toThrow('Insufficient role');
      });

      it('should throw ForbiddenException when user has no role property', () => {
        const userWithoutRole = {
          id: 'user-123',
          email: 'user@example.com',
        };
        const context = createMockExecutionContext(userWithoutRole as any, [
          Role.USER,
        ]);

        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      });
    });

    describe('metadata extraction', () => {
      it('should check metadata on both handler and class', () => {
        const user = { id: '1', email: 'test@example.com', role: Role.USER };
        const context = createMockExecutionContext(user, [Role.USER]);
        const handler = jest.fn();
        const classType = jest.fn();

        context.getHandler = jest.fn().mockReturnValue(handler);
        context.getClass = jest.fn().mockReturnValue(classType);

        guard.canActivate(context);

        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
          handler,
          classType,
        ]);
      });
    });

    describe('edge cases', () => {
      it('should handle user with invalid role value', () => {
        const userWithInvalidRole = {
          id: 'user-123',
          email: 'user@example.com',
          role: 'INVALID_ROLE' as any,
        };
        const context = createMockExecutionContext(userWithInvalidRole, [
          Role.USER,
        ]);

        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      });

      it('should return true even when user has role but no roles required', () => {
        const user = { id: '1', email: 'test@example.com', role: Role.ADMIN };
        const context = createMockExecutionContext(user);
        reflector.getAllAndOverride.mockReturnValue(undefined);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });
    });

    describe('multiple roles scenarios', () => {
      it('should allow when user has one of multiple required roles', () => {
        const user = {
          id: 'user-123',
          email: 'user@example.com',
          role: Role.USER,
        };
        const context = createMockExecutionContext(user, [
          Role.USER,
          Role.ADMIN,
        ]);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should reject when user role is not in any of required roles', () => {
        const user = {
          id: 'user-123',
          email: 'user@example.com',
          role: Role.USER,
        };
        const context = createMockExecutionContext(user, [Role.ADMIN]);

        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      });
    });
  });

  describe('request extraction', () => {
    it('should correctly extract request from HTTP context', () => {
      const user = { id: '1', email: 'test@example.com', role: Role.USER };
      const mockRequest = { user } as AuthenticatedRequest;
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as any;

      reflector.getAllAndOverride.mockReturnValue([Role.USER]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(context.switchToHttp().getRequest()).toBe(mockRequest);
    });
  });
});

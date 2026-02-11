import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { Role, User } from 'generated/prisma';
import { AuthenticatedRequest } from 'src/auth/types/interfaces/authenticated-request.interface';
import { mockUser } from '../../../test/utils/mock-user';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get(RolesGuard);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createExecutionContext = (
    user: User | undefined,
    requiredRoles?: Role[] | null,
  ): ExecutionContext => {
    reflector.getAllAndOverride.mockReturnValue(requiredRoles ?? undefined);

    const request: AuthenticatedRequest = {
      user: user as User,
    } as AuthenticatedRequest;

    return {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('returns true when no roles are required', () => {
      const context = createExecutionContext(undefined, undefined);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('throws ForbiddenException when roles array is empty', () => {
      const context = createExecutionContext(undefined, []);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('allows USER when USER role is required', () => {
      const context = createExecutionContext({ ...mockUser, role: Role.USER }, [
        Role.USER,
      ]);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('throws ForbiddenException when role mismatch', () => {
      const context = createExecutionContext({ ...mockUser, role: Role.USER }, [
        Role.ADMIN,
      ]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('allows when user has one of multiple roles', () => {
      const context = createExecutionContext(
        { ...mockUser, role: Role.ADMIN },
        [Role.USER, Role.ADMIN],
      );

      expect(guard.canActivate(context)).toBe(true);
    });

    it('throws when user is undefined', () => {
      const context = createExecutionContext(undefined, [Role.USER]);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('throws when user has invalid role', () => {
      const context = createExecutionContext(
        { ...mockUser, role: 'INVALID_ROLE' as Role },
        [Role.USER],
      );

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('checks metadata on handler and class', () => {
      const spy = jest.spyOn(reflector, 'getAllAndOverride');

      const context = createExecutionContext({ ...mockUser, role: Role.USER }, [
        Role.USER,
      ]);

      guard.canActivate(context);

      expect(spy).toHaveBeenCalledWith(ROLES_KEY, [undefined, undefined]);
    });

    it('extracts request correctly from HTTP context', () => {
      const context = createExecutionContext({ ...mockUser, role: Role.USER }, [
        Role.USER,
      ]);

      expect(guard.canActivate(context)).toBe(true);
    });
  });
});

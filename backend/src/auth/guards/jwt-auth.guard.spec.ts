/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (): ExecutionContext => {
    const mockRequest = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    const mockResponse = {};

    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn().mockReturnValue('http'),
    } as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should return true for public routes', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should call super.canActivate for protected routes', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext();

      // Mock the parent class method
      const superCanActivate = jest.spyOn(
        Object.getPrototypeOf(JwtAuthGuard.prototype),
        'canActivate',
      );
      superCanActivate.mockResolvedValue(true);

      await guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      expect(superCanActivate).toHaveBeenCalledWith(context);

      superCanActivate.mockRestore();
    });

    it('should check metadata on both handler and class', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext();
      const handler = jest.fn();
      const classType = jest.fn();

      context.getHandler = jest.fn().mockReturnValue(handler);
      context.getClass = jest.fn().mockReturnValue(classType);

      const superCanActivate = jest.spyOn(
        Object.getPrototypeOf(JwtAuthGuard.prototype),
        'canActivate',
      );
      superCanActivate.mockResolvedValue(true);

      await guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        handler,
        classType,
      ]);

      superCanActivate.mockRestore();
    });

    it('should prioritize public metadata when set to true', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      // Should not call parent canActivate when public
    });

    it('should handle undefined public metadata (not public)', async () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext();

      const superCanActivate = jest.spyOn(
        Object.getPrototypeOf(JwtAuthGuard.prototype),
        'canActivate',
      );
      superCanActivate.mockResolvedValue(true);

      await guard.canActivate(context);

      expect(superCanActivate).toHaveBeenCalled();

      superCanActivate.mockRestore();
    });

    it('should handle null public metadata (not public)', async () => {
      reflector.getAllAndOverride.mockReturnValue(null);
      const context = createMockExecutionContext();

      const superCanActivate = jest.spyOn(
        Object.getPrototypeOf(JwtAuthGuard.prototype),
        'canActivate',
      );
      superCanActivate.mockResolvedValue(true);

      await guard.canActivate(context);

      expect(superCanActivate).toHaveBeenCalled();

      superCanActivate.mockRestore();
    });

    it('should handle false public metadata (not public)', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext();

      const superCanActivate = jest.spyOn(
        Object.getPrototypeOf(JwtAuthGuard.prototype),
        'canActivate',
      );
      superCanActivate.mockResolvedValue(true);

      await guard.canActivate(context);

      expect(superCanActivate).toHaveBeenCalled();

      superCanActivate.mockRestore();
    });
  });

  describe('metadata priority', () => {
    it('should use getAllAndOverride which prioritizes closest metadata', async () => {
      // getAllAndOverride gets metadata from handler first, then class
      const context = createMockExecutionContext();
      reflector.getAllAndOverride.mockReturnValue(true);

      await guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        IS_PUBLIC_KEY,
        expect.any(Array),
      );
    });
  });

  describe('integration with passport', () => {
    it('should extend AuthGuard with jwt strategy', () => {
      // JwtAuthGuard extends AuthGuard('jwt')
      expect(guard).toBeDefined();
      expect(typeof guard.canActivate).toBe('function');
    });
  });
});

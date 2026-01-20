// import { Request } from 'express';

// export function mockRequest(overrides: Partial<Request> = {}): Request {
//   return {
//     cookies: {},
//     headers: {},
//     get: jest.fn(),
//     header: jest.fn(),
//     accepts: jest.fn(),
//     signedCookies: {},
//     ...overrides,
//   } as unknown as Request;
// }

import { mockUser } from './mock-user';
import { AuthenticatedRequest } from 'src/auth/types/interfaces/authenticated-request.interface';

export function mockRequest(
  overrides: Partial<AuthenticatedRequest> = {},
): AuthenticatedRequest {
  return {
    cookies: {},
    signedCookies: {},
    headers: {},
    user: mockUser,
    ...overrides,
  } as AuthenticatedRequest;
}

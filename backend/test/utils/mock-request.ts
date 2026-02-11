import { AuthenticatedRequest } from 'src/auth/types/interfaces/authenticated-request.interface';

export function mockRequest(
  overrides: Partial<AuthenticatedRequest> = {},
): AuthenticatedRequest {
  return {
    signedCookies: {},
    headers: {},
    ...overrides,
  } as AuthenticatedRequest;
}

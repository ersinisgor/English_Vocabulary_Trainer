// import { Response } from 'express';

// export interface MockResponse {
//   cookie: jest.Mock<void, any[]>;
//   clearCookie: jest.Mock<void, any[]>;
// }

// export const mockResponse = (): MockResponse => ({
//   cookie: jest.fn(),
//   clearCookie: jest.fn(),
// });

// inside auth.controller.spec.ts
interface MockResponse {
  cookie: jest.Mock;
  clearCookie: jest.Mock;
}

export const mockResponse = (): MockResponse => ({
  cookie: jest.fn(),
  clearCookie: jest.fn(),
});

// export interface ResponseLike {
//   cookie: (...args: any[]) => void;
//   clearCookie: (...args: any[]) => void;
// }

// export const mockResponse = (): jest.Mocked<ResponseLike> => ({
//   cookie: jest.fn(),
//   clearCookie: jest.fn(),
// });

interface MockResponse {
  cookie: jest.Mock;
  clearCookie: jest.Mock;
}

export const mockResponse = (): MockResponse => ({
  cookie: jest.fn(),
  clearCookie: jest.fn(),
});

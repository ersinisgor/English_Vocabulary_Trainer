# Test Suite Documentation

This document describes the comprehensive test suite for the English Vocabulary Trainer backend application.

## Overview

The test suite includes:
- **Unit Tests**: Test individual components in isolation
- **E2E Tests**: Test complete application flows with real database

## Test Database Setup

### Prerequisites

1. PostgreSQL running locally (or accessible)
2. Create a test database:
   ```bash
   createdb english_vocab_test
   ```

3. Create `.env.test` file in project root:
   ```env
   NODE_ENV=test
   PORT=3001
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/english_vocab_test?schema=public"
   JWT_SECRET="test-jwt-secret-key-for-testing-only"
   JWT_EXPIRES_IN="15m"
   JWT_REFRESH_EXPIRES_IN="1d"
   BCRYPT_SALT_ROUNDS=4
   ```

## Running Tests

### Run All Unit Tests
```bash
npm test
```

### Run Unit Tests in Watch Mode
```bash
npm run test:watch
```

### Run Unit Tests with Coverage
```bash
npm run test:cov
```

### Run E2E Tests
```bash
npm run test:e2e
```

### Run Specific Test File
```bash
# Unit test
npm test -- auth.service.spec.ts

# E2E test
npm run test:e2e -- auth.e2e-spec.ts
```

### Run Tests in Debug Mode
```bash
npm run test:debug
```

## Test Structure

### Unit Tests

Located in `src/` alongside source files (`*.spec.ts`):

#### 1. **Utils Tests**
- `src/common/utils/token.utils.spec.ts`
  - Token composition and parsing
  - Malformed token handling
  - Round-trip testing

- `src/common/utils/time.utils.spec.ts`
  - Duration parsing (days, hours, minutes, seconds)
  - Edge cases and invalid input

- `src/common/utils/cookie.utils.spec.ts`
  - Cookie options generation
  - Security flags (HttpOnly, Secure, SameSite)
  - Environment-based configuration

#### 2. **Strategy Tests**
- `src/auth/strategies/local.strategy.spec.ts`
  - Email/password validation
  - User authentication
  - Error handling

- `src/auth/strategies/jwt.strategy.spec.ts`
  - JWT payload validation
  - User lookup by token
  - Deleted user detection

#### 3. **Guard Tests**
- `src/auth/guards/jwt-auth.guard.spec.ts`
  - Public route handling
  - JWT authentication
  - Metadata priority

- `src/auth/guards/roles.guard.spec.ts`
  - Role-based access control
  - Multiple role scenarios
  - Unauthenticated user handling

#### 4. **Service Tests**
- `src/auth/auth.service.spec.ts`
  - Login flow
  - Registration with duplicate detection
  - User validation
  - Refresh token generation and verification
  - Token rotation
  - Logout and token revocation

#### 5. **Controller Tests**
- `src/auth/auth.controller.spec.ts`
  - Request/response handling
  - Cookie management
  - Error propagation
  - Token priority (cookie vs body)

### E2E Tests

Located in `test/` directory (`*.e2e-spec.ts`):

#### **Auth E2E Tests** (`test/auth.e2e-spec.ts`)

**Registration Flow:**
- ✅ Successful registration
- ✅ Email conflict detection (409)
- ✅ Email validation
- ✅ Password validation
- ✅ Required field validation
- ✅ Password hashing verification

**Login Flow:**
- ✅ Successful login with valid credentials
- ✅ Wrong password (401)
- ✅ Non-existent email (401)
- ✅ Refresh cookie creation
- ✅ Cookie security attributes
- ✅ Database token record creation

**Protected Routes (/auth/me):**
- ✅ Valid token access
- ✅ Missing token (401)
- ✅ Invalid token (401)
- ✅ Malformed header (401)
- ✅ Expired token (401)

**Refresh Token Flow:**
- ✅ Refresh using cookie
- ✅ Refresh using body token
- ✅ Token priority (cookie > body)
- ✅ Missing token (401)
- ✅ Invalid token (401)
- ✅ Tampered token (401)
- ✅ Old token invalidation after rotation
- ✅ New access token validation
- ✅ Revoked token rejection (401)
- ✅ Expired token rejection (401)

**Logout Flow:**
- ✅ Logout with cookie token
- ✅ Logout with body token
- ✅ Cookie clearing
- ✅ Token revocation in database
- ✅ Post-logout token rejection
- ✅ Idempotent logout (no token)

**Cookie Security:**
- ✅ HttpOnly flag
- ✅ SameSite=Lax
- ✅ Path=/
- ✅ Correct Max-Age
- ✅ Secure flag (environment-based)

**Token Rotation & Security:**
- ✅ Token rotation on each refresh
- ✅ Old token revocation after rotation
- ✅ Token reuse detection (theft prevention)
- ✅ Session persistence across multiple refreshes

**Complete Flow:**
- ✅ Register → Login → Access Protected → Refresh → Logout

## Test Helpers

### Database Helpers (`test/test-db-setup.ts`)

- `TestDbSetup.setup()` - Initialize test database with schema
- `TestDbSetup.cleanDatabase()` - Clear all data between tests
- `TestDbSetup.getPrismaClient()` - Get Prisma client instance
- `TestDbSetup.teardown()` - Disconnect from database

### Test Utilities (`test/test-helpers.ts`)

- `createTestUser()` - Create a user in test database
- `loginTestUser()` - Login and get tokens
- `registerTestUser()` - Register via API
- `extractRefreshTokenFromCookie()` - Parse refresh token from cookie header
- `createTamperedRefreshToken()` - Create invalid token for testing
- `authenticatedRequest()` - Make authenticated HTTP request
- `createRefreshToken()` - Manually create refresh token in DB
- `revokeRefreshToken()` - Revoke a refresh token

## Best Practices

### Unit Tests
- Mock all external dependencies
- Test one unit at a time
- Cover edge cases and error scenarios
- Use descriptive test names
- Group related tests with `describe` blocks

### E2E Tests
- Use real database (not mocked)
- Clean database between tests
- Test complete user flows
- Verify database state after operations
- Test both success and failure paths

## Coverage Goals

Aim for:
- **Unit Tests**: 80%+ coverage
- **E2E Tests**: All critical user flows covered
- **Integration**: All API endpoints tested

## Running Coverage Report

```bash
npm run test:cov
```

Coverage report will be generated in `coverage/` directory.

## Continuous Integration

Tests should run on:
- Pre-commit (unit tests only - fast)
- Pull request (all tests)
- Main branch push (all tests)

## Debugging Tests

### Debug Single Test
```bash
npm run test:debug -- --testNamePattern="should login successfully"
```

### Debug E2E Test
```bash
npm run test:e2e -- --testNamePattern="should register a new user"
```

### View Test Output
```bash
npm test -- --verbose
```

## Common Issues

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL in `.env.test`
- Verify test database exists

### Port Already in Use
- Change PORT in `.env.test`
- Kill existing processes: `lsof -ti:3001 | xargs kill`

### Tests Hanging
- Check for unclosed database connections
- Verify `afterAll()` hooks are cleaning up
- Increase test timeout: `jest.setTimeout(30000)`

### Intermittent Failures
- Clean database between tests
- Avoid test interdependencies
- Use proper async/await

## Maintenance

### Adding New Tests

1. **Unit Test**:
   - Create `*.spec.ts` file next to source file
   - Import module and dependencies
   - Mock external dependencies
   - Write test cases

2. **E2E Test**:
   - Add test cases to appropriate `*.e2e-spec.ts` file
   - Use test helpers for common operations
   - Clean database in `beforeEach`

### Updating Tests

When changing code:
1. Update corresponding unit tests
2. Update E2E tests if API changes
3. Run full test suite before committing
4. Update this documentation if needed

## Performance

- Unit tests: ~5-10 seconds
- E2E tests: ~30-60 seconds
- Full suite with coverage: ~1-2 minutes

## Further Reading

- [Jest Documentation](https://jestjs.io/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Supertest Documentation](https://github.com/visionmedia/supertest)

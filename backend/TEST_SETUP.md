# Test Setup Guide

## 🚀 Quick Start

Follow these steps to set up and run the complete test suite.

## Prerequisites

- Node.js (v18+)
- PostgreSQL (v14+)
- npm or yarn

## Step 1: Install Dependencies

```bash
npm install
```

This will install the new `dotenv` package needed for test configuration.

## Step 2: Create Test Database

```bash
# Create test database
createdb english_vocab_test

# Or if you need sudo
sudo -u postgres createdb english_vocab_test
```

## Step 3: Create `.env.test` File

Create a file named `.env.test` in the `backend/` directory:

```bash
# Test Environment Configuration
NODE_ENV=test
PORT=3001

# Test Database (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/english_vocab_test?schema=public"

# JWT Configuration (use shorter expiry for tests)
JWT_SECRET="test-jwt-secret-key-for-testing-only-do-not-use-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="1d"

# Bcrypt (lower rounds for faster tests)
BCRYPT_SALT_ROUNDS=4
```

**⚠️ Adjust the DATABASE_URL** to match your PostgreSQL credentials:
- Replace `postgres:postgres` with `username:password`
- Replace `localhost:5432` with your PostgreSQL host and port

## Step 4: Setup Test Database Schema

```bash
npm run test:db:setup
```

This will push your Prisma schema to the test database.

## Step 5: Run Tests

### Run All Unit Tests
```bash
npm test
```

### Run E2E Tests
```bash
npm run test:e2e
```

### Run All Tests (Unit + E2E)
```bash
npm run test:all
```

### Run Tests with Coverage
```bash
npm run test:all:cov
```

## 📊 Test Coverage

### What's Covered

✅ **Unit Tests:**
- Token utilities (compose, parse)
- Time utilities (duration parsing)
- Cookie utilities (options generation)
- Local Strategy (email/password validation)
- JWT Strategy (token validation)
- JWT Auth Guard (public route handling)
- Roles Guard (role-based access control)
- Auth Service (all methods with mocks)
- Auth Controller (all endpoints with mocks)

✅ **E2E Tests:**
- **Register Flow** (7 scenarios)
- **Login Flow** (6 scenarios)
- **Protected Routes** (/auth/me - 5 scenarios)
- **Refresh Token Flow** (11 scenarios)
- **Logout Flow** (6 scenarios)
- **Cookie Security** (5 scenarios)
- **Token Rotation** (4 scenarios)
- **Complete Auth Flow** (1 scenario)

**Total: 45+ E2E test scenarios + 100+ unit test scenarios**

## 🧪 Running Specific Tests

### Run specific test file
```bash
npm test -- auth.service.spec.ts
npm run test:e2e -- auth.e2e-spec.ts
```

### Run tests matching pattern
```bash
npm test -- --testNamePattern="should login"
```

### Run auth-related unit tests only
```bash
npm run test:unit:auth
```

### Run utils tests only
```bash
npm run test:utils
```

## 🐛 Debugging Tests

### Debug Unit Tests
```bash
npm run test:debug
```

Then open Chrome and navigate to `chrome://inspect`

### Debug E2E Tests
```bash
npm run test:e2e -- --detectOpenHandles --forceExit
```

### Verbose Output
```bash
npm test -- --verbose
npm run test:e2e -- --verbose
```

## 🔄 Database Management

### Reset test database
```bash
npm run test:db:reset
```

This will drop all data and recreate the schema.

### Manual cleanup (if needed)
```bash
# Connect to PostgreSQL
psql -U postgres

# Drop and recreate test database
DROP DATABASE english_vocab_test;
CREATE DATABASE english_vocab_test;
\q

# Push schema again
npm run test:db:setup
```

## ⚙️ CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: english_vocab_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma Client
        run: npx prisma generate
      
      - name: Setup test database
        run: npm run test:db:setup
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/english_vocab_test
      
      - name: Run unit tests
        run: npm test
      
      - name: Run e2e tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/english_vocab_test
          JWT_SECRET: test-secret
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        if: always()
```

## 📝 Test Structure

```
backend/
├── src/
│   ├── auth/
│   │   ├── auth.controller.spec.ts       # Controller unit tests
│   │   ├── auth.service.spec.ts          # Service unit tests
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.spec.ts      # JWT strategy tests
│   │   │   └── local.strategy.spec.ts    # Local strategy tests
│   │   └── guards/
│   │       ├── jwt-auth.guard.spec.ts    # JWT guard tests
│   │       └── roles.guard.spec.ts       # Roles guard tests
│   └── common/
│       └── utils/
│           ├── token.utils.spec.ts       # Token utility tests
│           ├── time.utils.spec.ts        # Time utility tests
│           └── cookie.utils.spec.ts      # Cookie utility tests
└── test/
    ├── auth.e2e-spec.ts                  # Auth E2E tests
    ├── test-db-setup.ts                  # Database setup utilities
    ├── test-helpers.ts                   # Test helper functions
    ├── setup-e2e.ts                      # E2E test setup
    ├── jest-e2e.json                     # E2E Jest configuration
    └── README.md                         # Test documentation
```

## 🎯 Coverage Goals

- **Unit Tests**: 80%+ code coverage
- **E2E Tests**: 100% critical path coverage
- **Auth Module**: 95%+ coverage (critical security component)

## 📈 View Coverage Report

```bash
npm run test:all:cov
open coverage/lcov-report/index.html
```

## 🔍 Common Issues & Solutions

### Issue: Tests hanging or not finishing

**Solution:**
```bash
# Add timeout to test command
npm test -- --testTimeout=10000

# Or check for open handles
npm run test:e2e -- --detectOpenHandles
```

### Issue: Database connection refused

**Solution:**
- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in `.env.test`
- Check database exists: `psql -l | grep english_vocab_test`

### Issue: Port already in use

**Solution:**
```bash
# Find and kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or change PORT in .env.test
```

### Issue: Prisma schema out of sync

**Solution:**
```bash
# Regenerate Prisma client
npx prisma generate

# Reset test database
npm run test:db:reset
```

### Issue: Module not found errors

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Regenerate Prisma client
npx prisma generate
```

## 🚦 Test Workflow

```mermaid
graph TD
    A[Write Code] --> B[Write Unit Tests]
    B --> C[Run Unit Tests]
    C --> D{Tests Pass?}
    D -->|No| B
    D -->|Yes| E[Write E2E Tests]
    E --> F[Run E2E Tests]
    F --> G{Tests Pass?}
    G -->|No| E
    G -->|Yes| H[Run Coverage]
    H --> I[Review Coverage]
    I --> J{>80% Coverage?}
    J -->|No| B
    J -->|Yes| K[Commit & Push]
```

## 📚 Additional Resources

- [Test Documentation](./test/README.md)
- [Jest Documentation](https://jestjs.io/)
- [NestJS Testing Guide](https://docs.nestjs.com/fundamentals/testing)
- [Supertest Documentation](https://github.com/visionmedia/supertest)

## 🎓 Best Practices

1. **Write tests first** (TDD approach)
2. **Keep tests independent** - no shared state
3. **Use descriptive test names** - explain what is being tested
4. **Test edge cases** - not just happy paths
5. **Mock external dependencies** in unit tests
6. **Use real database** for E2E tests
7. **Clean database between tests**
8. **Run tests before committing**
9. **Maintain test coverage** above 80%
10. **Keep tests fast** - unit tests should run in seconds

## ✅ Checklist Before Committing

- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] Coverage is above 80%
- [ ] No linting errors
- [ ] Test database is clean
- [ ] New features have tests
- [ ] Documentation is updated

---

**Happy Testing! 🎉**

For questions or issues, refer to the [Test README](./test/README.md) or create an issue.

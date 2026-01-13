import { TestDbSetup } from './test-db-setup';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// Global setup before all tests
beforeAll(async () => {
  console.log('🚀 Starting E2E test suite...');
  await TestDbSetup.setup();
}, 60000);

// Clean database before each test
beforeEach(async () => {
  await TestDbSetup.cleanDatabase();
});

// Global teardown after all tests
afterAll(async () => {
  console.log('🏁 E2E test suite complete');
  await TestDbSetup.teardown();
}, 30000);

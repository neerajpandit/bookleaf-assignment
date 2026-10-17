import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import Counter from '../../../src/modules/tickets/counter.model.js';
import { setupTestDb, teardownTestDb } from '../../setup/testDb.js';
import { clearDatabase } from '../../helpers/modelTestHelper.js';

describe('Counter model', () => {
  beforeAll(async () => {
    await setupTestDb();
  }, 60000);

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('creates a valid counter document', async () => {
    const counter = await Counter.create({
      key: 'ticketNumber',
      sequence: 0,
    });

    expect(counter.key).toBe('ticketNumber');
    expect(counter.sequence).toBe(0);
  });

  it('requires key and sequence fields', async () => {
    const counter = new Counter({});

    await expect(counter.validate()).rejects.toThrow(/Counter key is required/);
  });

  it('rejects negative sequence values', async () => {
    const counter = new Counter({
      key: 'ticketNumber',
      sequence: -1,
    });

    await expect(counter.validate()).rejects.toThrow(/Sequence cannot be negative/);
  });

  it('enforces unique counter keys through the database index', async () => {
    const uniqueKey = 'uniqueCounterConstraintTest';

    await Counter.create({
      key: uniqueKey,
      sequence: 1,
    });

    await expect(
      Counter.create({
        key: uniqueKey,
        sequence: 2,
      }),
    ).rejects.toThrow(/duplicate key/i);
  });
});

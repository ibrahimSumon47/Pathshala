import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import { connectToDatabase, disconnectFromDatabase, User } from '@pathshala/db';
import { registerStudent } from './registration';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  await connectToDatabase();
  await User.init();
});

afterAll(async () => {
  await disconnectFromDatabase();
  await mongo?.stop();
});

describe('registerStudent', () => {
  it('creates a student-only account and stores a password hash', async () => {
    const result = await registerStudent({ name: 'Learner One', email: 'One@Example.com', password: 'learner-test-pass-2026' });
    expect(result).toEqual({ ok: true });
    const account = await User.findOne({ email: 'one@example.com' }).select('+passwordHash').lean();
    expect(account?.roles).toEqual(['student']);
    expect(account?.passwordHash).not.toBe('learner-test-pass-2026');
    expect(account?.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('normalises email and rejects duplicate accounts', async () => {
    const result = await registerStudent({ name: 'Duplicate Learner', email: 'ONE@example.com', password: 'learner-test-pass-2026' });
    expect(result).toEqual({ ok: false, code: 'exists' });
  });

  it('rejects weak or malformed input before writing a user', async () => {
    expect(await registerStudent({ name: 'A', email: 'not-an-email', password: 'short' })).toEqual({ ok: false, code: 'invalid' });
    expect(await User.countDocuments()).toBe(1);
  });
});

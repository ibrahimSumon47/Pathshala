import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { authenticate, listAccounts } from './accounts';
import { DEMO_ACCOUNTS } from './demo-accounts';

describe('demo accounts', () => {
  beforeEach(() => {
    vi.stubEnv('MONGODB_URI', '');
    vi.stubEnv('DEMO_AUTH', 'true');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('authenticates every demo role with its password', async () => {
    for (const account of DEMO_ACCOUNTS) {
      const user = await authenticate(account.email, account.password);
      expect(user).not.toBeNull();
      expect(user?.roles).toEqual([account.role]);
      expect(user).not.toHaveProperty('passwordHash');
    }
  });

  it('normalises the email before looking it up', async () => {
    await expect(authenticate('  Student@Pathshala.dev  ', 'student-demo-2026')).resolves.not.toBeNull();
  });

  it('rejects a wrong password', async () => {
    await expect(authenticate('student@pathshala.dev', 'not-the-password')).resolves.toBeNull();
  });

  it('rejects unknown email addresses', async () => {
    await expect(authenticate('nobody@pathshala.dev', 'student-demo-2026')).resolves.toBeNull();
  });

  it('turns demo accounts off when DEMO_AUTH is false', async () => {
    vi.stubEnv('DEMO_AUTH', 'false');
    await expect(authenticate('student@pathshala.dev', 'student-demo-2026')).resolves.toBeNull();
    await expect(listAccounts()).resolves.toEqual([]);
  });

  it('lists the public accounts without password hashes', async () => {
    const accounts = await listAccounts();
    expect(accounts).toHaveLength(DEMO_ACCOUNTS.length);
    expect(accounts[0]).not.toHaveProperty('passwordHash');
  });
});

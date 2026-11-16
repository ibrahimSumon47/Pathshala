import { afterEach, describe, expect, it, vi } from 'vitest';
import { demoAuthEnabled } from './demo-accounts';

describe('demoAuthEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is on by default while developing', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DEMO_AUTH', '');
    expect(demoAuthEnabled()).toBe(true);
  });

  it('is off by default in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DEMO_AUTH', '');
    expect(demoAuthEnabled()).toBe(false);
  });

  it('follows an explicit flag in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DEMO_AUTH', 'true');
    expect(demoAuthEnabled()).toBe(true);

    vi.stubEnv('DEMO_AUTH', 'false');
    expect(demoAuthEnabled()).toBe(false);
  });
});

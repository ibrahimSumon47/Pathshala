import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The database suites start mongodb-memory-server. The workspace package.json points it at the
    // shared binary cache, so a warm machine is instant; this budget is for the one run that has
    // to download the binary (about 380 MB), which the 10 s default cannot cover.
    hookTimeout: 120_000,
  },
});

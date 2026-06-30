import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['{src,app,lib}/**/*.test.{ts,tsx}'],
    env: {
      // Dummy 32-byte key for tests only (NOT a secret). Real key lives in .env.local / Vercel.
      KYC_ENCRYPTION_KEY: 'YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE=',
    },
  },
});

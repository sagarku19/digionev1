import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    // Mirror the tsconfig "@/*" paths so tests can resolve "@/lib/...", "@/types/...", etc.
    // tsconfig lists "./*" first (project root), then "./src/*" — root covers lib/, types/.
    alias: [
      { find: /^@\/(.*)/, replacement: path.resolve(__dirname, '$1') },
    ],
  },
  test: {
    environment: 'node',
    include: ['{src,app,lib}/**/*.test.{ts,tsx}'],
    env: {
      // Dummy 32-byte key for tests only (NOT a secret). Real key lives in .env.local / Vercel.
      KYC_ENCRYPTION_KEY: 'YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE=',
      // Dummy Supabase credentials for tests — createBrowserClient throws on empty strings.
      NEXT_PUBLIC_SUPABASE_URL: 'https://fake.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake-anon-key-for-tests-only',
    },
  },
});

import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vitest/config';
import fs from 'fs';
import path from 'path';

// Mirror tsconfig "@/*" → ["./*", "./src/*"]. The repo keeps some modules at the
// project root (lib/supabase/*, types/*) and others under src/ (lib/server/*,
// lib/shared/*), so a single string alias can't cover both — resolve by existence,
// root first (matching the tsconfig path order), then src.
function atPathResolver(): Plugin {
  const roots = [__dirname, path.resolve(__dirname, 'src')];
  const exts = ['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.json'];
  return {
    name: 'digione-at-path-resolver',
    enforce: 'pre',
    resolveId(id) {
      if (!id.startsWith('@/')) return null;
      const rel = id.slice(2);
      for (const root of roots) {
        const base = path.join(root, rel);
        for (const e of ['', ...exts]) {
          const p = base + e;
          if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
        }
        for (const e of exts) {
          const idx = path.join(base, `index${e}`);
          if (fs.existsSync(idx)) return idx;
        }
      }
      return null;
    },
  };
}

// Integration suite — runs the REAL money-path code (fulfillment, refund engine,
// route handlers) against the live test Supabase project. Kept OUT of the default
// `npm test` glob (which only scans {src,app,lib}) so unit runs stay hermetic and
// creds-free. Run with `npm run test:integration`.
export default defineConfig({
  plugins: [atPathResolver()],
  test: {
    environment: 'node',
    include: ['test/integration/**/*.integration.test.ts'],
    setupFiles: ['test/integration/setup.ts'],
    // auth.admin.createUser + multi-table seeding + RPCs are network-bound.
    testTimeout: 40_000,
    hookTimeout: 40_000,
    // Shared DB + per-IP rate limits → never run integration files in parallel.
    fileParallelism: false,
    env: {
      // Dummy 32-byte key for tests only (NOT a secret). Real key lives in .env.local.
      KYC_ENCRYPTION_KEY: 'YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE=',
    },
  },
});

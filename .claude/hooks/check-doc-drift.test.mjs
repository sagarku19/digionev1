import { computeReminders } from './check-doc-drift.mjs';

let failed = 0;
function assert(name, cond) {
  if (cond) console.log(`PASS ${name}`);
  else { console.error(`FAIL ${name}`); failed++; }
}

// 1. dashboard source changed, map not updated -> 1 reminder
assert('dashboard source without map',
  computeReminders(['app/dashboard/products/page.tsx']).length === 1);

// 2. dashboard source changed AND map updated -> no reminder
assert('dashboard source with map',
  computeReminders(['app/dashboard/products/page.tsx', 'docs/reference/dashboard-map.md']).length === 0);

// 3. only the map changed -> no reminder
assert('only map changed',
  computeReminders(['docs/reference/dashboard-map.md']).length === 0);

// 4. unrelated file -> no reminder
assert('unrelated file',
  computeReminders(['src/lib/utils.ts']).length === 0);

// 5. storefront source -> reminder names the storefront map
{
  const r = computeReminders(['src/components/storefront/LinkInBioPage.tsx']);
  assert('storefront reminder names map', r.length === 1 && r[0].includes('storefront-map.md'));
}

// 6. both surfaces changed, neither map -> 2 reminders
assert('both surfaces changed',
  computeReminders(['app/dashboard/x/page.tsx', 'app/(storefront)/link/[username]/page.tsx']).length === 2);

// 7. storefront parens path is matched
assert('storefront parens path',
  computeReminders(['app/(storefront)/store/[slug]/page.tsx']).length === 1);

if (failed > 0) { console.error(`\n${failed} test(s) failed`); process.exit(1); }
console.log('\nAll tests passed');

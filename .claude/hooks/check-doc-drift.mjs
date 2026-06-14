// Stop hook: nudge reference maps to stay in sync with watched source dirs.
// Pure logic (computeReminders) is unit-tested; main() wires git + stdin.
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const WATCHED_PAIRS = [
  { name: 'dashboard', sources: ['app/dashboard/', 'src/components/dashboard/'], map: 'docs/reference/dashboard-map.md' },
  { name: 'storefront', sources: ['app/(storefront)/', 'src/components/storefront/'], map: 'docs/reference/storefront-map.md' },
];

export function computeReminders(changedFiles, pairs = WATCHED_PAIRS) {
  const changed = new Set(changedFiles);
  const reminders = [];
  for (const pair of pairs) {
    const sourceChanged = changedFiles.some(
      (f) => f !== pair.map && pair.sources.some((s) => f.startsWith(s))
    );
    const mapChanged = changed.has(pair.map);
    if (sourceChanged && !mapChanged) {
      reminders.push(
        `You edited ${pair.name} source files but did not update ${pair.map}. ` +
        `Update it to reflect the change, or confirm the change does not affect the map (e.g. CSS-only / copy tweak).`
      );
    }
  }
  return reminders;
}

function getChangedFiles() {
  let out = '';
  try {
    out = execSync('git status --porcelain', { encoding: 'utf8' });
  } catch {
    return [];
  }
  return out
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => {
      let p = line.slice(3);                       // strip "XY " status prefix
      if (p.includes(' -> ')) p = p.split(' -> ')[1]; // rename: keep new path
      p = p.trim();
      if (p.startsWith('"') && p.endsWith('"')) p = p.slice(1, -1); // unquote
      return p.replace(/\\/g, '/');                // normalize separators
    });
}

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  let input = {};
  try { input = JSON.parse((await readStdin()) || '{}'); } catch { input = {}; }
  if (input.stop_hook_active) process.exit(0); // loop guard

  const reminders = computeReminders(getChangedFiles());
  if (reminders.length > 0) {
    process.stdout.write(JSON.stringify({ decision: 'block', reason: reminders.join('\n') }));
  }
  process.exit(0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();

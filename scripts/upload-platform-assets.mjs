// Platform asset uploader for Cloudflare R2.
//
// Uploads DigiOne-managed stock images (public) and demo deliverable files
// (private, attached to a product) to R2, converting images to WebP, and records
// them in the DB. Self-contained Node ESM — uses the already-installed sharp,
// @aws-sdk/client-s3 and @supabase/supabase-js. No new deps.
//
// Run with env from .env.local:
//   node --env-file=.env.local scripts/upload-platform-assets.mjs <command> [flags]
//
// Commands:
//   migrate-stock
//       Re-host every existing public_images row on R2 (download -> WebP ->
//       digione-public-assets) and update public_images.url to the R2 link.
//
//   seed-stock [--category NAME]
//       Upload NEW stock images from scripts/assets/stock/ (any image files) AND
//       from URLs in scripts/assets/stock-urls.txt (one per line). Converts to
//       WebP, uploads to R2, and INSERTs public_images rows.
//
//   seed-demo --product <productId>
//       Upload demo deliverable files from scripts/assets/demo/ AND from URLs in
//       scripts/assets/demo-urls.txt to the PRIVATE digione-products bucket, and
//       INSERT storage_files rows (kind='deliverable') bound to <productId> and
//       its creator — so a demo storefront serves real downloads via
//       /api/deliverables/[productId].
//
// Flags: --category (seed-stock), --product (seed-demo), --dry (no writes).

import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const ASSETS = path.join(ROOT, 'scripts', 'assets');
const STOCK_MAX_WIDTH = 1024;
const STOCK_QUALITY = 80;

const args = process.argv.slice(2);
const command = args[0];
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : undefined;
};
const DRY = Boolean(flag('dry'));

// ── env ──
function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name} (run with: node --env-file=.env.local ...)`);
  return v;
}
const PUBLIC_BASE = () => env('NEXT_PUBLIC_R2_BUCKET_PUBLIC_URL').replace(/\/+$/, '');

// ── clients ──
let _s3;
function s3() {
  if (!_s3) {
    _s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: env('R2_ACCESS_KEY_ID'), secretAccessKey: env('R2_SECRET_ACCESS_KEY') },
    });
  }
  return _s3;
}
let _db;
function db() {
  if (!_db) _db = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_KEY'), { auth: { persistSession: false } });
  return _db;
}

// ── helpers ──
async function putR2(bucket, key, body, contentType) {
  if (DRY) { console.log(`   [dry] would put ${bucket}/${key} (${body.length} bytes, ${contentType})`); return; }
  await s3().send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
}
async function fetchBuf(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`fetch ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}
async function toWebp(buf) {
  const { data, info } = await sharp(buf).rotate()
    .resize({ width: STOCK_MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: STOCK_QUALITY })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}
function sanitize(name) {
  return name.trim().replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_{2,}/g, '_').replace(/^\./, '_');
}
const MIME = { zip: 'application/zip', pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', mp4: 'video/mp4', mp3: 'audio/mpeg', csv: 'text/csv', txt: 'text/plain', json: 'application/json', epub: 'application/epub+zip', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
function mimeOf(name) { return MIME[name.split('.').pop()?.toLowerCase()] ?? 'application/octet-stream'; }

async function readUrlList(file) {
  if (!existsSync(file)) return [];
  const txt = await readFile(file, 'utf8');
  return txt.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}
async function readFolder(dir) {
  if (!existsSync(dir)) return [];
  const names = await readdir(dir);
  const out = [];
  for (const n of names) {
    if (n.startsWith('.')) continue;
    const p = path.join(dir, n);
    if ((await stat(p)).isFile()) out.push({ name: n, path: p });
  }
  return out;
}

// ── commands ──
async function migrateStock() {
  const { data: rows, error } = await db().from('public_images').select('id, url, name');
  if (error) throw error;
  console.log(`migrate-stock: ${rows.length} images`);
  let ok = 0, fail = 0;
  for (const r of rows) {
    try {
      const src = await fetchBuf(r.url);
      const { data, width, height } = await toWebp(src);
      const key = `digione/stock/${r.id}.webp`;
      await putR2(env('R2_BUCKET_PUBLIC'), key, data, 'image/webp');
      const newUrl = `${PUBLIC_BASE()}/${key}`;
      if (!DRY) {
        const { error: upErr } = await db().from('public_images').update({ url: newUrl, width, height }).eq('id', r.id);
        if (upErr) throw upErr;
      }
      console.log(`  ✓ ${r.name ?? r.id} -> ${newUrl} (${width}x${height}, ${(data.length / 1024).toFixed(0)}KB)`);
      ok++;
    } catch (e) { console.error(`  ✗ ${r.id}: ${e.message}`); fail++; }
  }
  console.log(`Done. ${ok} migrated, ${fail} failed.`);
}

async function seedStock() {
  const category = typeof flag('category') === 'string' ? flag('category') : 'other';
  const folder = await readFolder(path.join(ASSETS, 'stock'));
  const urls = await readUrlList(path.join(ASSETS, 'stock-urls.txt'));
  console.log(`seed-stock: ${folder.length} local + ${urls.length} url(s), category="${category}"`);
  let ok = 0, fail = 0;
  const items = [
    ...folder.map((f) => ({ label: f.name, get: () => readFile(f.path), base: f.name })),
    ...urls.map((u) => ({ label: u, get: () => fetchBuf(u), base: path.basename(new URL(u).pathname) || 'image' })),
  ];
  for (const it of items) {
    try {
      const { data, width, height } = await toWebp(await it.get());
      const stem = sanitize(it.base.replace(/\.[^.]+$/, '')) || 'image';
      const key = `digione/stock/${stem}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.webp`;
      await putR2(env('R2_BUCKET_PUBLIC'), key, data, 'image/webp');
      const url = `${PUBLIC_BASE()}/${key}`;
      if (!DRY) {
        const { error } = await db().from('public_images').insert({ url, name: stem, category, tags: [], width, height });
        if (error) throw error;
      }
      console.log(`  ✓ ${it.label} -> ${url}`);
      ok++;
    } catch (e) { console.error(`  ✗ ${it.label}: ${e.message}`); fail++; }
  }
  console.log(`Done. ${ok} added, ${fail} failed.`);
}

async function seedDemo() {
  const productId = typeof flag('product') === 'string' ? flag('product') : null;
  if (!productId) throw new Error('seed-demo requires --product <productId>');
  const { data: product, error: pErr } = await db().from('products').select('id, creator_id, name').eq('id', productId).maybeSingle();
  if (pErr) throw pErr;
  if (!product) throw new Error(`product ${productId} not found`);
  const creatorId = product.creator_id;
  const bucket = env('R2_BUCKET_PRODUCTS');
  const folder = await readFolder(path.join(ASSETS, 'demo'));
  const urls = await readUrlList(path.join(ASSETS, 'demo-urls.txt'));
  console.log(`seed-demo: product "${product.name}" (${productId}), ${folder.length} local + ${urls.length} url(s)`);
  let ok = 0, fail = 0;
  const items = [
    ...folder.map((f) => ({ label: f.name, get: () => readFile(f.path), base: f.name })),
    ...urls.map((u) => ({ label: u, get: () => fetchBuf(u), base: path.basename(new URL(u).pathname) || 'file' })),
  ];
  for (const it of items) {
    try {
      const body = await it.get();
      const safe = sanitize(it.base) || 'file';
      const key = `${creatorId}/${productId}/${Date.now()}_${safe}`;
      const contentType = mimeOf(safe);
      await putR2(bucket, key, body, contentType);
      if (!DRY) {
        const { error } = await db().from('storage_files').insert({
          owner_id: creatorId, bucket, object_key: key, file_name: safe,
          mime_type: contentType, size: body.length, visibility: 'private',
          kind: 'deliverable', product_id: productId,
        });
        if (error) throw error;
      }
      console.log(`  ✓ ${it.label} -> ${bucket}/${key} (${(body.length / 1024).toFixed(0)}KB)`);
      ok++;
    } catch (e) { console.error(`  ✗ ${it.label}: ${e.message}`); fail++; }
  }
  console.log(`Done. ${ok} attached, ${fail} failed.`);
}

const COMMANDS = { 'migrate-stock': migrateStock, 'seed-stock': seedStock, 'seed-demo': seedDemo };

const run = COMMANDS[command];
if (!run) {
  console.error('Usage: node --env-file=.env.local scripts/upload-platform-assets.mjs <migrate-stock|seed-stock|seed-demo> [flags]');
  process.exit(1);
}
run().then(() => process.exit(0)).catch((e) => { console.error('FATAL:', e.message); process.exit(1); });

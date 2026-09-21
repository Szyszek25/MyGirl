// Generate one Supabase SQL file from the existing ordered fresh-install modules.
// Usage: node scripts/build-full-sql.mjs
// Never execute the generated SQL on MyCampus or an existing MyGirl project.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const names = [
  'MYGIRL_FRESH_INSTALL.sql',
  'AFTER_FRESH_INSTALL_004_STORAGE_WAITLIST.sql',
  'AFTER_FRESH_INSTALL_005_HARDENING_LEGAL.sql',
  'AFTER_FRESH_INSTALL_006_CLUBS_MEETUPS_REALTIME.sql',
];
const chunks = names.map(name => {
  const path = resolve(root, 'supabase', name);
  const original = readFileSync(path, 'utf8');
  if (!/^\s*BEGIN\s*;/m.test(original) || !/^\s*COMMIT\s*;/m.test(original)) {
    throw new Error(`Missing expected transaction markers in ${name}`);
  }
  // Wrap every module in ONE transaction: partial installation rolls back on SQL errors.
  const body = original.replace(/^\s*BEGIN\s*;\s*$/gm, '').replace(/^\s*COMMIT\s*;\s*$/gm, '').trim();
  return `-- =================== ${name} ===================\n${body}`;
});
const output = resolve(root, 'supabase', 'MYGIRL_COMPLETE_INSTALL.sql');
const text = [
  '-- MyGirl single-transaction install. NEW, EMPTY Supabase project only.',
  '-- Generated from fresh schema + modules 004, 005, 006 (clubs/meetups/chat dedupe).',
  '-- Do not run historical migrations 001-003 separately or run on MyCampus.',
  '-- Not automatically tested or deployed. Review all SQL and execute exactly once.',
  'BEGIN;',
  ...chunks,
  'COMMIT;',
  '',
].join('\n\n');
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, text, 'utf8');
console.log(`Generated ${output} (${Buffer.byteLength(text, 'utf8')} bytes)`);

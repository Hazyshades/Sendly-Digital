import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const pub = join(root, '..', 'public');
const required = ['llm.txt', 'llms.txt', 'openapi.json'].map((name) => join(pub, name));

const candidates = [
  join(root, '..', '..', 'SENDLY MAIN', 'sendly-supabase', 'functions', 'arc', 'creator-paywall'),
  join(root, '..', '..', 'sendly-supabase', 'functions', 'arc', 'creator-paywall'),
];

const src = candidates.find((p) => existsSync(join(p, 'llm.txt')));

if (src) {
  copyFileSync(join(src, 'llm.txt'), join(pub, 'llm.txt'));
  copyFileSync(join(src, 'llm.txt'), join(pub, 'llms.txt'));
  copyFileSync(join(src, 'openapi.json'), join(pub, 'openapi.json'));
  console.log(`Synced agent docs from ${src} -> ${pub}`);
  process.exit(0);
}

const missing = required.filter((path) => !existsSync(path));
if (missing.length === 0) {
  console.log('creator-paywall source not found; using committed public/ agent docs.');
  process.exit(0);
}

console.error(
  'creator-paywall source not found and public agent docs are missing:\n' +
    missing.map((path) => `  - ${path}`).join('\n') +
    '\nRun sync locally or copy llm.txt and openapi.json into public/.',
);
process.exit(1);

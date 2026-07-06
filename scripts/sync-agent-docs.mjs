import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const pub = join(root, '..', 'public');
const candidates = [
  join(root, '..', '..', 'SENDLY MAIN', 'sendly-supabase', 'functions', 'arc', 'creator-paywall'),
  join(root, '..', '..', 'sendly-supabase', 'functions', 'arc', 'creator-paywall'),
];

const src = candidates.find((p) => existsSync(join(p, 'llm.txt')));
if (!src) {
  console.error('creator-paywall source not found. Copy llm.txt and openapi.json into public/ manually.');
  process.exit(1);
}

copyFileSync(join(src, 'llm.txt'), join(pub, 'llm.txt'));
copyFileSync(join(src, 'llm.txt'), join(pub, 'llms.txt'));
copyFileSync(join(src, 'openapi.json'), join(pub, 'openapi.json'));
console.log(`Synced agent docs from ${src} -> ${pub}`);

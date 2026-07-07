import { copyFileSync, existsSync, readFileSync } from 'node:fs';
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

function filesEqual(a, b) {
  try {
    return readFileSync(a).equals(readFileSync(b));
  } catch {
    return false;
  }
}

function syncFile(sourceName, destName) {
  const sourcePath = join(src, sourceName);
  const destPath = join(pub, destName);

  if (!existsSync(sourcePath)) return;

  if (existsSync(destPath) && filesEqual(sourcePath, destPath)) {
    return;
  }

  if (process.env.CI) {
    console.warn(
      `[sync:agent-docs] Skipping ${destName}: local creator-paywall source differs from committed public/ copy.`,
    );
    return;
  }

  if (existsSync(destPath) && !filesEqual(sourcePath, destPath)) {
    console.warn(
      `[sync:agent-docs] Overwriting public/${destName} from local creator-paywall checkout. Commit public/ if this should ship.`,
    );
  }

  copyFileSync(sourcePath, destPath);
}

if (src) {
  syncFile('llm.txt', 'llm.txt');
  syncFile('llm.txt', 'llms.txt');
  syncFile('openapi.json', 'openapi.json');
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

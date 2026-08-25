import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'status.json');
const publicDir = join(root, 'public');
const dest = join(publicDir, 'status.json');

if (!existsSync(src)) {
  console.warn('sync-status: site/status.json missing, skipping');
  process.exit(0);
}

if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });
copyFileSync(src, dest);
console.log('sync-status: copied status.json → public/status.json');

// Copies the MediaPipe WASM runtime into public/ so the frontend hosts it itself
// (no CDN dependency at runtime, and no need for the backend to serve it).
import { cpSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve('@mediapipe/tasks-vision'));
const dest = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'vendor', 'mediapipe-wasm');

mkdirSync(dest, { recursive: true });
cpSync(join(pkgDir, 'wasm'), dest, { recursive: true });
console.log(`[mediapipe] wasm copied to ${dest}`);

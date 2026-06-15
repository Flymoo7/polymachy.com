// Builds the password-gated production app and writes it to the repo root
// as omni-matrix.html (served at polymachy.com/omni-matrix.html, linked
// from the "Launch App" button).
//
// Usage:  node scripts/build-gated.mjs <password>
//   or:   OMNI_PASSWORD=... node scripts/build-gated.mjs
//
// The password is used only at build time to AES-encrypt the app; it is
// NOT stored in the output (only a salted hash for verification). Re-run
// with a new password to rotate it.

import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(here, '..');
const repoRoot = resolve(appDir, '..');

const password = process.argv[2] || process.env.OMNI_PASSWORD;
if (!password) {
  console.error('No password given. Usage: node scripts/build-gated.mjs <password>');
  process.exit(1);
}

const run = (cmd) => execSync(cmd, { cwd: appDir, stdio: 'inherit' });

// 1) build the self-contained single-file app
run('vite build --mode singlefile');

// 2) encrypt it with staticrypt into a temp dir
const tmp = resolve(appDir, '.gated-tmp');
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
run(`npx staticrypt preview/index.html -p ${JSON.stringify(password)} -d ${JSON.stringify(tmp)} --short --remember 30`);

// 3) place the gated file at the served path
const out = resolve(repoRoot, 'omni-matrix.html');
copyFileSync(resolve(tmp, 'index.html'), out);
rmSync(tmp, { recursive: true, force: true });

console.log(`\nGated app written to ${out}`);

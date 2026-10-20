#!/usr/bin/env node
/**
 * deps.js — where this skill's npm packages live, and the one command that puts them there.
 *
 * The packages (playwright, marked, mermaid, sharp — ~120 MB) used to be installed
 * into the skill folder itself. On a consultant machine that folder is the catalog
 * cache, `~/.ntt-cache/ntt-catalog/<catalog version>/...`, and every catalog release
 * is a new version folder — so every release silently undid the install, and the
 * next run stopped at precheck until someone ran `npm install` again (2026-09-25).
 *
 * They now live OUTSIDE the catalog, in one folder per dependency set:
 *
 *     %LOCALAPPDATA%\ntt-node\sap-enduser-doc\<hash of package-lock.json>\node_modules
 *
 * A release that does not touch package-lock.json finds the same folder and needs
 * nothing; one that changes a dependency gets a new hash, and precheck says so.
 * A `node_modules` next to the skill (a repo checkout, an older machine) still wins,
 * so nothing that works today stops working.
 *
 *   node scripts/deps.js --where     print the folder (and whether it is installed)
 *   node scripts/deps.js --install   the one-time, person-run install: npm ci into
 *                                    that folder, then Playwright's Chromium
 *
 * `--install` is a step a PERSON runs once per machine (the installer prints it).
 * The skill's own rule stands: nothing in a documentation run installs anything.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { createRequire } = require('module');

const SKILL_ROOT = path.resolve(__dirname, '..');
const LOCAL_MODULES = path.join(SKILL_ROOT, 'node_modules');

function lockHash() {
  const lock = path.join(SKILL_ROOT, 'package-lock.json');
  const src = fs.existsSync(lock) ? lock : path.join(SKILL_ROOT, 'package.json');
  // Line endings differ between a git checkout and a synced copy; the content does not.
  const text = fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
}

function depsDir() {
  if (process.env.SAP_ENDUSER_DOC_DEPS) return path.resolve(process.env.SAP_ENDUSER_DOC_DEPS);
  const base = process.env.LOCALAPPDATA || path.join(os.homedir(), '.cache');
  return path.join(base, 'ntt-node', 'sap-enduser-doc', lockHash());
}

/** The node_modules folder packages are taken from: the skill's own when it has
 *  one, otherwise the shared one. */
function modulesDir() {
  return fs.existsSync(LOCAL_MODULES) ? LOCAL_MODULES : path.join(depsDir(), 'node_modules');
}

/** require() for this skill's npm packages. */
function requireDep(name) {
  return createRequire(path.join(path.dirname(modulesDir()), 'package.json'))(name);
}

/** Resolves a package name for precheck; throws like require.resolve when absent. */
function resolveDep(name) {
  return createRequire(path.join(path.dirname(modulesDir()), 'package.json')).resolve(name);
}

/** A file inside an installed package (render.js loads mermaid's browser bundle). */
function depFile(rel) {
  return path.join(modulesDir(), rel);
}

function run(cmd, args, cwd) {
  const { spawnSync } = require('child_process');
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) {
    console.error(`\n${cmd} ${args.join(' ')} failed (exit ${r.status}). Nothing else was run.`);
    process.exit(r.status || 1);
  }
}

function install() {
  const dir = depsDir();
  fs.mkdirSync(dir, { recursive: true });
  for (const f of ['package.json', 'package-lock.json']) {
    const from = path.join(SKILL_ROOT, f);
    if (fs.existsSync(from)) fs.copyFileSync(from, path.join(dir, f));
  }
  // The folder name is the lock file's hash, so a folder that already holds the
  // packages holds THESE packages. Running it twice costs nothing.
  if (fs.existsSync(path.join(dir, 'node_modules', '.package-lock.json'))) {
    console.log(`Packages already installed in ${dir}`);
  } else {
    console.log(`Installing packages into ${dir}`);
    const hasLock = fs.existsSync(path.join(dir, 'package-lock.json'));
    run('npm', [hasLock ? 'ci' : 'install', '--no-audit', '--no-fund'], dir);
  }
  // Chromium: only when none is usable. `playwright install` fetches the ONE
  // revision this playwright version expects, even with three complete builds on
  // disk -- and behind a corporate proxy that download hung halfway (2026-09-25),
  // leaving a lock and a partial folder. browser-path.js runs any complete build,
  // so a machine that has one needs nothing more.
  let browser = null;
  try { browser = require('./browser-path').resolveExecutablePath(); } catch (_) { /* none usable */ }
  if (browser) {
    console.log(`Chromium already present: ${browser}`);
  } else {
    // Lands in the machine-wide Playwright cache, not in this folder.
    run('npx', ['playwright', 'install', 'chromium'], dir);
  }
  console.log('\nDone. Check with: node scripts/precheck.js');
}

module.exports = { depsDir, modulesDir, requireDep, resolveDep, depFile, lockHash };

if (require.main === module) {
  const arg = process.argv[2];
  if (arg === '--install') {
    install();
  } else if (arg === '--where') {
    const dir = depsDir();
    const ok = fs.existsSync(path.join(dir, 'node_modules', 'playwright'));
    console.log(`${dir}  (${ok ? 'installed' : 'not installed'})`);
    if (fs.existsSync(LOCAL_MODULES)) console.log(`in use instead: ${LOCAL_MODULES} (the skill's own node_modules)`);
  } else {
    console.error('Usage: node scripts/deps.js --where | --install');
    process.exit(1);
  }
}

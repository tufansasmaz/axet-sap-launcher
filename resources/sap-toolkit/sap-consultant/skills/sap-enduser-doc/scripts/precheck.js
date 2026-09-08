#!/usr/bin/env node
/**
 * precheck.js — Phase 0 read-only diagnostic. Run this before anything else.
 *
 * It ONLY reads/checks the local environment. It never installs, downloads,
 * repairs, or deletes anything (no `npm install`, no `playwright install`, no
 * lock-file cleanup). If a check fails, precheck exits non-zero with a plain
 * explanation of what is missing and what to do about it — the agent must stop
 * and report that, not retry or attempt to fix it automatically.
 *
 * Usage:
 *   node scripts/precheck.js
 *
 * Exit code 0  → all checks passed, safe to proceed to capture/render.
 * Exit code 1+ → at least one check failed; see printed report.
 */

const fs = require('fs');
const path = require('path');
const { loadConnAdt } = require('./env');

loadConnAdt(); // fills SAP_WEBGUI_USER/PASS from the project's existing .conn_adt if not already set; never logs values

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
}

// 0. Required skill files present (template, stylesheet, references, scripts) —
//    a missing bundled file should fail fast here, not mid-task.
const skillRoot = path.resolve(__dirname, '..');
const requiredFiles = [
  'assets/template.md',
  'assets/style.css',
  'references/abap-analysis.md',
  'references/webgui-capture.md',
  'references/writing-guide.md',
  'scripts/capture.js',
  'scripts/annotate.js',
  'scripts/render.js',
  'scripts/browser-path.js',
];
const missingFiles = requiredFiles.filter(f => !fs.existsSync(path.join(skillRoot, f)));
check('Required skill files present', missingFiles.length === 0,
  missingFiles.length ? `missing: ${missingFiles.join(', ')}` : 'all present');

// 1. Node version (informational floor: Node 18+, per SKILL.md dependencies).
const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
check('Node.js >= 18', nodeMajor >= 18, `found ${process.version}`);

// 2. Required npm packages resolvable (installed, not installing them now).
//
// The list is READ FROM package.json, not written out here. It used to be the
// literal ['playwright', 'marked', 'sharp'] -- three of the four declared
// dependencies. The missing one was `mermaid`, and it was the worst one to miss:
// every other package throws on require() when it is absent, but render.js falls
// back to a CDN copy of mermaid when node_modules/mermaid is not on disk. So a
// half-finished `npm install` produced a GREEN precheck, and then, on a customer
// site with no route to jsdelivr, a PDF whose process diagrams were silently
// blank. A missing diagram in a Turkish document is easy not to notice.
//
// Deriving the list means adding a dependency to package.json cannot leave this
// check behind again.
let deps = [];
try {
  const pkgJson = JSON.parse(fs.readFileSync(path.join(skillRoot, 'package.json'), 'utf8'));
  deps = Object.keys(pkgJson.dependencies || {}).sort();
} catch (e) {
  check('package.json readable (dependency list source)', false, String(e.message));
}
check('dependency list read from package.json', deps.length > 0,
  deps.length ? deps.join(', ') : 'none found — cannot verify anything below');

for (const pkg of deps) {
  let ok = false;
  let detail = 'not resolvable — run `npm install` in the skill root (one-time, manual)';
  try {
    require.resolve(pkg, { paths: [path.resolve(__dirname, '..')] });
    ok = true;
    detail = 'resolvable';
  } catch (_) { /* keep default detail */ }
  check(`package "${pkg}" installed`, ok, detail);
}

// 3. Browser executable discoverable — reuses the same resolver capture.js/render.js
//    use at runtime, so precheck is a true dry-run of what will actually happen.
let browserPath = null;
let browserErr = null;
try {
  const { resolveExecutablePath } = require('./browser-path');
  browserPath = resolveExecutablePath();
} catch (err) {
  browserErr = err.message;
}
check('Chromium executable found (no install attempted)', !!browserPath, browserPath || browserErr);

// 4. SAP WebGUI connection configuration present (env vars, loaded above from the
//    existing .conn_adt if needed) — presence only, values are never printed.
const hasUser = !!process.env.SAP_WEBGUI_USER;
const hasPass = !!process.env.SAP_WEBGUI_PASS;
check('SAP_WEBGUI_USER set', hasUser, hasUser ? 'set (value not shown)' : 'missing — set it via .conn_adt or export it before capture; never paste it into chat');
check('SAP_WEBGUI_PASS set', hasPass, hasPass ? 'set (value not shown)' : 'missing — set it via .conn_adt or export it before capture; never paste it into chat');

// 5. This is a screenshot-capture-only check — no transaction/program is assumed;
//    the actual WebGUI base URL / transaction come from the per-run walkthrough.json,
//    never from anything hardcoded in this skill.
check('No transaction/program hardcoded in this skill', true, 'transaction/program are supplied per run via work/<task>/walkthrough.json');

// ---------- Report ----------
const failed = results.filter(r => !r.ok);
console.log('PRECHECK — sap-enduser-doc (read-only, installs nothing)\n');
for (const r of results) {
  console.log(`[${r.ok ? 'OK' : 'FAIL'}] ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
}
console.log('');

if (failed.length) {
  console.error(`${failed.length} check(s) failed. Fix the listed items manually, then re-run precheck. Do not auto-retry.`);
  process.exit(1);
}
console.log('All checks passed. Safe to proceed.');
process.exit(0);

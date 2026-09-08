#!/usr/bin/env node
/**
 * browser-path.js — Locates an already-installed Chromium/Chrome executable.
 *
 * This skill NEVER installs browsers. It is a hard rule: no script here may call
 * `playwright install`, `npx playwright install`, delete a Playwright lock file, or
 * shell out to any package/browser installer at runtime. Chromium is assumed to be
 * already present on the machine. If it cannot be found, resolveExecutablePath()
 * throws a clear, actionable error and the caller must stop — never install, never
 * retry the search in a loop.
 *
 * Resolution order (first match wins):
 *   1. PW_EXECUTABLE          — explicit override, must point at an existing file.
 *   2. playwright's own chromium.executablePath() — but only accepted if the file
 *      actually exists on disk (a `playwright` package can report a path for a
 *      revision that was never fully downloaded/extracted).
 *   3. A manual scan of the Playwright browser cache (PLAYWRIGHT_BROWSERS_PATH, or
 *      the OS-default `ms-playwright` cache dir) for any *complete* full Chromium
 *      build (`chromium-<rev>`, never `chromium_headless_shell-<rev>` — the headless
 *      shell cannot print the header/footer PDF templates this skill relies on).
 *
 * Nothing here downloads, extracts, or repairs a browser. If every option above
 * fails, the caller gets one clear error, once, with the exact remediation step
 * (set PW_EXECUTABLE) — no automatic fallback action is taken.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

function isCompleteBuildDir(dir) {
  // A revision directory that Playwright partially downloaded (interrupted install,
  // proxy failure) exists on disk but is missing the actual binary — never trust the
  // directory's mere presence, always verify the marker + the executable file.
  return fs.existsSync(path.join(dir, 'INSTALLATION_COMPLETE'));
}

function candidateExecutables(buildDir) {
  return [
    path.join(buildDir, 'chrome-win64', 'chrome.exe'),
    path.join(buildDir, 'chrome-win', 'chrome.exe'),
    path.join(buildDir, 'chrome-linux', 'chrome'),
    path.join(buildDir, 'chrome-linux64', 'chrome'),
    path.join(buildDir, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
    path.join(buildDir, 'chrome-mac-arm64', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
  ];
}

function defaultBrowsersCacheDir() {
  if (process.env.PLAYWRIGHT_BROWSERS_PATH) return process.env.PLAYWRIGHT_BROWSERS_PATH;
  const home = os.homedir();
  if (process.platform === 'win32') return path.join(home, 'AppData', 'Local', 'ms-playwright');
  if (process.platform === 'darwin') return path.join(home, 'Library', 'Caches', 'ms-playwright');
  return path.join(home, '.cache', 'ms-playwright');
}

/** Scan the browsers cache dir for the newest COMPLETE full Chromium build.
 *  Explicitly skips `chromium_headless_shell-*` — never a valid substitute here. */
function scanCacheForChromium() {
  const cacheDir = defaultBrowsersCacheDir();
  if (!fs.existsSync(cacheDir)) return null;

  const revisionDirs = fs.readdirSync(cacheDir)
    .filter(name => /^chromium-\d+$/.test(name))
    .map(name => ({ name, rev: parseInt(name.split('-')[1], 10), full: path.join(cacheDir, name) }))
    .filter(d => isCompleteBuildDir(d.full))
    .sort((a, b) => b.rev - a.rev); // newest revision first

  for (const d of revisionDirs) {
    for (const exe of candidateExecutables(d.full)) {
      if (fs.existsSync(exe)) return exe;
    }
  }
  return null;
}

/**
 * Returns an absolute path to a usable Chromium/Chrome executable, or throws.
 * Never installs anything. Call once per process; do not loop/retry on failure.
 */
function resolveExecutablePath() {
  // 1. Explicit override.
  if (process.env.PW_EXECUTABLE) {
    if (fs.existsSync(process.env.PW_EXECUTABLE)) return process.env.PW_EXECUTABLE;
    throw new Error(
      `PW_EXECUTABLE is set to "${process.env.PW_EXECUTABLE}" but no file exists there. ` +
      `Fix the path — this skill will not install a browser to compensate.`
    );
  }

  // 2. Playwright's own expected path, verified against disk (not trusted blindly).
  try {
    const { chromium } = require('playwright');
    const expected = chromium.executablePath();
    if (expected && fs.existsSync(expected)) return expected;
  } catch (_) {
    // playwright not resolvable / no expectation available — fall through to the scan.
  }

  // 3. Manual cache scan for any other already-installed full Chromium build.
  const found = scanCacheForChromium();
  if (found) return found;

  throw new Error(
    'No usable Chromium executable found, and this skill does not install browsers ' +
    'automatically. Options (pick one, do not retry blindly):\n' +
    '  - Set PW_EXECUTABLE to an existing chrome.exe / chrome / Chromium binary.\n' +
    '  - Set PLAYWRIGHT_BROWSERS_PATH to a directory containing a complete ' +
    '"chromium-<rev>" build (not "chromium_headless_shell-<rev>").\n' +
    '  - Ask whoever manages the machine to install Chromium for Playwright once, ' +
    'outside of this skill run.\n' +
    'See references/webgui-capture.md and scripts/precheck.js.'
  );
}

module.exports = { resolveExecutablePath, scanCacheForChromium, defaultBrowsersCacheDir };

if (require.main === module) {
  try {
    console.log(resolveExecutablePath());
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

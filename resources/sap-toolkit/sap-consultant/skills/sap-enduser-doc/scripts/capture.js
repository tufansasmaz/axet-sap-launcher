#!/usr/bin/env node
/**
 * capture.js — Replays a walkthrough script against SAP GUI for HTML (WebGUI)
 * and produces screenshots + marker coordinates for annotation.
 *
 * Usage:
 *   SAP_WEBGUI_USER=... SAP_WEBGUI_PASS=... node scripts/capture.js work/walkthrough.json work/shots/
 *
 * Walkthrough JSON schema:
 * {
 *   "baseUrl": "https://sapdev.example.com:44300",   // host only, no path
 *   "client": "100",
 *   "language": "TR",                                 // must match document language
 *   "transaction": "ZMM_STOCK_RPT",
 *   "viewport": { "width": 1440, "height": 900 },     // optional, this is the default
 *   "steps": [
 *     { "action": "wait", "ms": 1500 },
 *     { "action": "press", "key": "Tab" },            // any Playwright key: Tab, Enter, F8, F4...
 *     { "action": "type", "text": "1000" },           // types into the focused field
 *     { "action": "markFocused", "label": 1, "shot": "step-01-selection" },
 *     { "action": "markSelector", "selector": "#ID", "label": 2, "shot": "step-01-selection" },
 *     { "action": "click", "selector": "css" },       // escape hatch; prefer keyboard
 *     { "action": "clickXY", "x": 432, "y": 385, "double": true, "settleMs": 5000 },
 *     { "action": "drag", "x1": 200, "y1": 916, "x2": 1400, "y2": 916 },
 *     { "action": "scroll", "x": 700, "y": 500, "dx": 600, "dy": 0 },
 *     { "action": "readMessage", "name": "after-save" },  // technical verification, not decorative
 *     { "action": "screenshot", "name": "step-01-selection", "fullPage": false }
 *   ]
 * }
 *
 * Environment:
 *   SAP_WEBGUI_USER / SAP_WEBGUI_PASS  — credentials (required; never hardcode, never logged).
 *                                        If not already set, loaded from the project's existing
 *                                        `.conn_adt` secret file via scripts/env.js — no separate
 *                                        secrets mechanism is introduced by this skill.
 *   PW_EXECUTABLE                      — absolute path to a Chromium binary. Optional override;
 *                                        otherwise the browser is located by scripts/browser-path.js
 *                                        (Playwright's own build, then a cache scan). This script
 *                                        never installs a browser — see references/webgui-capture.md
 *                                        and run `node scripts/precheck.js` first if unsure.
 *
 * Conventions:
 *  - Navigate with the keyboard (Tab/Enter/F-keys) wherever possible; WebGUI DOM ids
 *    are dynamic and CSS selectors are fragile.
 *  - "markFocused" records the bounding box of the currently focused element under
 *    the given label, attached to the given screenshot name. Record marks while the
 *    screen is in the exact state that the screenshot will capture.
 *  - "readMessage" reads the actual SAP status/message bar text after a critical step
 *    (run, save, post). Use this — not a visual read of the screenshot — to decide
 *    pass/fail on that step; result goes to <outDir>/verifications.json.
 *  - When replaying an EXISTING variant, only navigate/execute (F8 etc.) — do not add
 *    "type" steps that overwrite the variant's own field values.
 *  - Output: <outDir>/<name>.png for each screenshot, plus <outDir>/markers.json:
 *      { "step-01-selection": [ { "label": 1, "x":.., "y":.., "width":.., "height":.. } ] }
 *    and <outDir>/verifications.json: [ { "step":.., "name":.., "text": "..." } ]
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { resolveExecutablePath } = require('./browser-path');
const { loadConnAdt } = require('./env');

loadConnAdt(); // fills SAP_WEBGUI_USER/PASS from the project's existing .conn_adt if not already set; never logs values

const [scriptPath, outDirArg] = process.argv.slice(2);
if (!scriptPath || !outDirArg) {
  console.error('Usage: node capture.js <walkthrough.json> <output-dir>');
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(path.resolve(scriptPath), 'utf8'));
const outDir = path.resolve(outDirArg);
fs.mkdirSync(outDir, { recursive: true });

const USER = process.env.SAP_WEBGUI_USER;
const PASS = process.env.SAP_WEBGUI_PASS;

// --- secret redaction for the DOM dumps -------------------------------------
//
// `dumpDom` and `dumpInputs` write field values to disk under work/<task>/, and
// both used to write EVERY value. Two paths reached a password with that:
// dumpInputs records `value` for every `input`, and dumpDom's selector includes
// `[tabindex]` -- which SAP WebGUI sets on its inputs -- and then records
// `el.value` as `text`. A dumpInputs/dumpDom step on the logon screen, or on any
// later screen holding a password field (user maintenance and friends), wrote the
// cleartext password into a JSON file that then sits in the project folder.
//
// This skill's own operating rule 6 says credentials never touch text it
// produces, "not even partially", and calls a literal password in a file a
// leaked-credential incident. The rule was stated in the SKILL.md and not
// enforced in the code that could break it.
//
// Redaction happens HERE, in Node, on the returned array -- not inside each
// page.evaluate(). Writing the predicate twice in two page contexts is how one
// copy gets fixed and the other does not, which is precisely the shape of the
// bug being fixed. The field itself is kept (position and label are what the
// annotation step needs); only the value is replaced.
const REDACTED = '<gizlendi: parola alani>';
const PASS_HINTS = ['password', 'passwd', 'pwd', 'kennwort', 'sifre'];

function redactSecrets(items) {
  for (const it of items) {
    const type = String(it.type || '').toLowerCase();
    const hay = `${it.name || ''} ${it.id || ''} ${it.autocomplete || ''}`.toLowerCase();
    if (type === 'password' || PASS_HINTS.some(h => hay.includes(h))) {
      if ('value' in it) it.value = REDACTED;
      if ('text' in it) it.text = REDACTED;
    }
  }
  return items;
}
if (!USER || !PASS) {
  console.error('Set SAP_WEBGUI_USER and SAP_WEBGUI_PASS environment variables (never hardcode credentials).');
  process.exit(1);
}

const markers = {}; // shotName -> [{label, x, y, width, height}]
const verifications = []; // technical checks (system messages) — see readMessage action

/** Best-effort extraction of the SAP WebGUI status/message bar text. Selectors are a
 *  heuristic covering common WebGUI skins; if none match, returns null rather than
 *  guessing — the caller must treat null as "could not verify", never as "no message". */
async function readMessageBar(page) {
  const selectors = [
    '[role="status"]',
    '.urMessageArea', '.lsMessageBar', '.sapMessage',
    '[id*="MESSAGE" i]', '[class*="message" i]', '[class*="Msg" i]', '[class*="statusbar" i]',
  ];
  for (const fr of [appFrame(page), page.mainFrame()]) {
    const text = await fr.evaluate((sels) => {
      for (const sel of sels) {
        const el = document.querySelector(sel);
        if (el && el.textContent && el.textContent.trim()) return el.textContent.trim();
      }
      return null;
    }, selectors).catch(() => null);
    if (text) return text;
  }
  return null;
}

/** WebGUI sometimes runs inside a frameset; find the frame that hosts the app. */
function appFrame(page) {
  const f = page.frames().find(fr => /webgui|its/i.test(fr.url()) && fr !== page.mainFrame());
  return f || page.mainFrame();
}

async function focusedBox(page) {
  // activeElement may live inside a frame; check frames too.
  for (const fr of [appFrame(page), page.mainFrame()]) {
    const handle = await fr.evaluateHandle(() => document.activeElement);
    const el = handle.asElement();
    if (el) {
      const box = await el.boundingBox();
      if (box && (box.width > 0 || box.height > 0)) return box;
    }
  }
  return null;
}

(async () => {
  // Resolve once, fail loud and stop — this skill never installs a browser and
  // never retries the search. See scripts/browser-path.js.
  let executablePath;
  try {
    executablePath = resolveExecutablePath();
  } catch (err) {
    console.error(err.message);
    process.exit(4);
  }

  const viewport = cfg.viewport || { width: 1440, height: 900 };
  const browser = await chromium.launch({
    executablePath,
    args: ['--force-device-scale-factor=2'], // crisp screenshots for print
    ignoreHTTPSErrors: true,
  });
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    ignoreHTTPSErrors: true,
    locale: (cfg.language || 'TR').toLowerCase() === 'tr' ? 'tr-TR' : undefined,
  });
  const page = await context.newPage();

  // --- Login ---
  const url = `${cfg.baseUrl}/sap/bc/gui/sap/its/webgui` +
    `?sap-client=${cfg.client}&sap-language=${cfg.language || 'TR'}` +
    (cfg.transaction ? `&~transaction=${encodeURIComponent(cfg.transaction)}` : '');
  console.log('Opening', url.replace(/sap-client=\d+/, 'sap-client=***'));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Standard SAP logon page field names; SSO landscapes may skip this entirely.
  const userField = page.locator('input[name="sap-user"], #sap-user').first();
  if (await userField.isVisible({ timeout: 8000 }).catch(() => false)) {
    // This logon page (WDA/urtransport-style) attaches its button's click handler via a
    // client-side "lsevents" JS dispatcher AFTER the field is already visible/paintable — a
    // click that lands before that JS finishes bootstrapping is silently swallowed (no
    // navigation, no error). Give it a fixed settle window before interacting.
    await page.waitForTimeout(1500);
    await userField.fill(USER);
    await page.locator('input[name="sap-password"], #sap-password').first().fill(PASS);
    // Pressing Enter is unreliable on the ITS logon form; submit the button when there is one.
    // Some NetWeaver logon skins render "Oturum aç"/"Log On" as a <button>, <input>, or even an
    // <a>/<div role="button"> — match by visible text first (most robust across skins), falling
    // back to type-based selectors, then Enter as a last resort.
    const submit = page.locator(
      'button:has-text("Oturum aç"), button:has-text("Log On"), input[value="Oturum aç" i], ' +
      'input[value="Log On" i], input[type="submit"], button[type="submit"], ' +
      'button:not([type="button"]):not([type="reset"])'
    ).first();
    let attempts = 0;
    while (attempts < 3 && await userField.isVisible({ timeout: 1000 }).catch(() => false)) {
      if (await submit.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submit.click({ force: true }).catch(() => {});
      } else {
        await page.keyboard.press('Enter').catch(() => {});
      }
      await page.waitForTimeout(1500);
      attempts++;
    }
  }
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000); // let the dynpro paint

  // Never replay steps against a logon page: the "type" steps would spray input into it and
  // each stray submit counts toward SAP's failed-logon lockout counter.
  if (await userField.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.screenshot({ path: path.join(outDir, 'FAILED-logon.png') }).catch(() => {});
    console.error('Still on the logon page after submitting — aborting without retrying (lockout safety).');
    await browser.close();
    process.exit(3);
  }

  // --- Replay steps ---
  for (const [i, step] of cfg.steps.entries()) {
    try {
      switch (step.action) {
        case 'wait':
          await page.waitForTimeout(step.ms || 1000);
          break;
        case 'press':
          await page.keyboard.press(step.key);
          await page.waitForTimeout(step.settleMs || 400);
          break;
        case 'type':
          await page.keyboard.type(step.text, { delay: 30 });
          break;
        case 'click':
          await appFrame(page).locator(step.selector).first().click();
          await page.waitForTimeout(step.settleMs || 400);
          break;
        case 'clickText': {
          // Playwright's getByText picks the innermost element matching the text —
          // robust against WebGUI toolbar buttons rendered as plain <div> with dynamic ids.
          await appFrame(page).getByText(step.text, { exact: step.exact !== false }).first().click({ force: true });
          await page.waitForTimeout(step.settleMs || 400);
          break;
        }
        case 'clickMain': {
          // Some native browser-level dialogs (e.g. the "Dikkat" confirm popup) render
          // outside the webgui|its app frame; search the top-level page instead.
          await page.locator(step.selector).first().click({ force: true });
          await page.waitForTimeout(step.settleMs || 400);
          break;
        }
        case 'clickIfVisible': {
          // Best-effort click for transient system popups (e.g. NetWeaver certificate
          // notices) that only sometimes appear. Never fails the run if absent.
          const target = page.locator(step.selector).first();
          const visible = await target.isVisible({ timeout: step.timeout || 3000 }).catch(() => false);
          if (visible) {
            await target.click({ force: true }).catch(() => {});
            await page.waitForTimeout(step.settleMs || 800);
          }
          break;
        }
        case 'clickXY':
          // Last resort for WebGUI widgets that are <input> cells (no matchable text)
          // and carry dynamic ids. Coordinates are CSS pixels in the configured viewport.
          await page.mouse.click(step.x, step.y, { clickCount: step.double ? 2 : 1, delay: 60 });
          await page.waitForTimeout(step.settleMs || 400);
          break;
        case 'drag':
          // Drag a WebGUI scrollbar thumb; the ALV grid ignores mouse-wheel scrolling.
          await page.mouse.move(step.x1, step.y1);
          await page.mouse.down();
          await page.mouse.move(step.x2, step.y2, { steps: 20 });
          await page.mouse.up();
          await page.waitForTimeout(step.settleMs || 2000);
          break;
        case 'scroll':
          await page.mouse.move(step.x ?? 700, step.y ?? 500);
          await page.mouse.wheel(step.dx || 0, step.dy || 0);
          await page.waitForTimeout(step.settleMs || 1500);
          break;
        case 'markFocused': {
          const box = await focusedBox(page);
          if (!box) throw new Error('no focused element with a bounding box');
          (markers[step.shot] ||= []).push({ label: step.label, ...box });
          break;
        }
        case 'markSelector': {
          const box = await appFrame(page).locator(step.selector).first().boundingBox();
          if (!box) throw new Error(`selector not found: ${step.selector}`);
          (markers[step.shot] ||= []).push({ label: step.label, ...box });
          break;
        }
        case 'readMessage': {
          // Technical verification, not a screenshot substitute: reads the actual SAP
          // status/message bar text after a critical step (e.g. after F8 or a save) so
          // the agent can confirm what really happened instead of guessing from a PNG.
          const text = await readMessageBar(page);
          const rec = { step: i, name: step.name || `message-${i}`, text };
          verifications.push(rec);
          console.log(`  [${i}] readMessage -> ${text ? JSON.stringify(text) : '(no message bar text found)'}`);
          break;
        }
        case 'dumpDom': {
          const info = await appFrame(page).evaluate(() => {
            const sel = 'button, a, [role="button"], [onclick], input[type="button"], input[type="submit"], [tabindex]';
            return Array.from(document.querySelectorAll(sel)).map(el => {
              const r = el.getBoundingClientRect();
              return {
                tag: el.tagName,
                text: (el.innerText || el.value || '').trim().slice(0, 60),
                title: el.getAttribute('title') || '',
                aria: el.getAttribute('aria-label') || '',
                id: el.id || '',
                // type/name/autocomplete are reported so redactSecrets() can
                // decide. The selector's `[tabindex]` matches WebGUI inputs, so
                // `text` above can be a field's VALUE, password included.
                type: el.getAttribute('type') || '',
                name: el.name || '',
                autocomplete: el.getAttribute('autocomplete') || '',
                cls: (el.className || '').toString().slice(0, 80),
                x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
              };
            }).filter(e => e.w > 0 && e.h > 0);
          });
          redactSecrets(info);
          fs.writeFileSync(path.join(outDir, `${step.name || 'dom-dump'}.json`), JSON.stringify(info, null, 2));
          console.log(`  [${i}] dumpDom -> ${step.name || 'dom-dump'}.json (${info.length} elements)`);
          break;
        }
        case 'dumpInputs': {
          const info = await appFrame(page).evaluate(() => {
            return Array.from(document.querySelectorAll('input, textarea, select, [role="checkbox"], .urCbx')).map(el => {
              const r = el.getBoundingClientRect();
              const label = el.getAttribute('title') || el.getAttribute('aria-label') || el.name || '';
              return {
                tag: el.tagName, type: el.getAttribute('type') || '', name: el.name || '',
                id: el.id || '', label, value: el.value || '',
                autocomplete: el.getAttribute('autocomplete') || '',
                x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
              };
            }).filter(e => e.w > 0 && e.h > 0);
          });
          redactSecrets(info);
          fs.writeFileSync(path.join(outDir, `${step.name || 'dom-inputs'}.json`), JSON.stringify(info, null, 2));
          console.log(`  [${i}] dumpInputs -> ${step.name || 'dom-inputs'}.json (${info.length} elements)`);
          break;
        }
        case 'screenshot': {
          const file = path.join(outDir, `${step.name}.png`);
          await page.screenshot({ path: file, fullPage: !!step.fullPage });
          console.log(`  [${i}] screenshot -> ${file}`);
          break;
        }
        default:
          console.warn(`  [${i}] unknown action "${step.action}" — skipped`);
      }
    } catch (err) {
      console.error(`  [${i}] step failed (${step.action}):`, err.message);
      // Capture the failure state to make debugging possible, then stop.
      await page.screenshot({ path: path.join(outDir, `FAILED-step-${i}.png`), fullPage: true }).catch(() => {});
      await browser.close();
      process.exit(2);
    }
  }

  // Bounding boxes are in CSS pixels; screenshots are rendered at deviceScaleFactor.
  // annotate.js multiplies coordinates by "scale" to land on the right pixels.
  fs.writeFileSync(path.join(outDir, 'markers.json'), JSON.stringify({ scale: 2, shots: markers }, null, 2));
  console.log('Markers written to markers.json');

  // Small, structured technical-verification log (readMessage results only) — read this
  // instead of re-inspecting screenshots when deciding pass/fail on a critical step.
  fs.writeFileSync(path.join(outDir, 'verifications.json'), JSON.stringify(verifications, null, 2));
  if (verifications.length) console.log(`Verifications written to verifications.json (${verifications.length} entries)`);

  await browser.close();
})().catch(err => { console.error(err); process.exit(1); });

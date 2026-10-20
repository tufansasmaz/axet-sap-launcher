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
 * Fiori elements apps (List Report / Object Page) run through the same file with
 * "ui": "fiori" — see references/fiori-capture.md. The logon, the redaction, the
 * markers and verifications are shared; what changes is how a screen is waited for
 * and how a field is found:
 * {
 *   "ui": "fiori",
 *   "baseUrl": "https://sapdev.example.com:44300", "client": "100", "language": "TR",
 *   "intent": "SalesOrder-manage",                    // the launchpad hash, without '#'
 *   "steps": [
 *     { "action": "waitUI5" },                        // until UI5 has no pending work
 *     { "action": "describeApp", "name": "dom-fiori-list" },   // what is on screen, with labels
 *     { "action": "markControl", "control": { "controlType": "sap.m.Button", "properties": { "text": "Git" } },
 *       "label": 1, "shot": "step-01-list" },
 *     { "action": "pressControl", "control": { "id": "...::FilterBar::...-btnSearch" } },
 *     { "action": "enterText", "control": { ... }, "text": "1000" },
 *     { "action": "screenshot", "name": "step-01-list" }
 *   ]
 * }
 * A "control" is a UI5 control selector (sap/ui/test/RecordReplay): id, controlType,
 * properties, ancestor, labelFor, bindingPath, I18NText.
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
const { requireDep } = require('./deps');
const { chromium } = requireDep('playwright');
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
const FIORI = cfg.ui === 'fiori';

async function readMessageBar(page) {
  // Fiori first when this is a Fiori run: a MessageToast is gone in ~3 s, and the
  // WebGUI heuristics below (`[class*="message" i]`) also match launchpad chrome.
  const fioriSelectors = [
    '.sapMMessageToast',
    '.sapMMessageBox .sapMDialogSection', '.sapMDialog[role="alertdialog"] .sapMDialogSection',
    '.sapMMsgStrip', '.sapMMessageView .sapMMsgViewItem',
  ];
  const webguiSelectors = [
    '[role="status"]',
    '.urMessageArea', '.lsMessageBar', '.sapMessage',
    '[id*="MESSAGE" i]', '[class*="message" i]', '[class*="Msg" i]', '[class*="statusbar" i]',
  ];
  const selectors = FIORI ? fioriSelectors : webguiSelectors;
  for (const fr of [FIORI ? ui5Frame(page) : appFrame(page), page.mainFrame()]) {
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

// --- Fiori (UI5) helpers -----------------------------------------------------
//
// Everything below talks to UI5's own test API, sap/ui/test/RecordReplay, which
// ships inside sap.ui.core on every system that runs UI5 1.61+. It is what OPA5
// and wdi5 use: it knows when UI5 has no pending request, timeout or rendering,
// and it finds a control by type/text/label rather than by a generated DOM id.
// A fixed sleep plus a CSS class is the WebGUI way and it does not survive a UI5
// app, which paints in pieces while its OData calls come back.

/** The frame the UI5 app lives in. The ABAP launchpad runs UI5 apps inline; newer
 *  launchpads can host them in an app-runtime iframe. */
function ui5Frame(page) {
  const f = page.frames().find(fr => /ui5appruntime|appruntime/i.test(fr.url()) && fr !== page.mainFrame());
  return f || page.mainFrame();
}

/** Runs one RecordReplay operation in the app frame. The operations are spelled
 *  out here rather than passed in as source: the launchpad's CSP may forbid eval. */
async function withRecordReplay(page, op, arg) {
  return ui5Frame(page).evaluate(({ op, arg }) => new Promise((resolve, reject) => {
    if (!(window.sap && window.sap.ui && typeof window.sap.ui.require === 'function')) {
      reject(new Error('UI5 is not loaded on this page'));
      return;
    }
    const fail = (e) => reject(new Error(String((e && e.message) || e)));
    window.sap.ui.require(['sap/ui/test/RecordReplay'], (RR) => {
      let p;
      if (op === 'wait') p = RR.waitForUI5({ timeout: arg });
      else if (op === 'press') p = RR.interactWithControl({ selector: arg.control, interactionType: RR.InteractionType.Press });
      else if (op === 'enterText') {
        p = RR.interactWithControl({ selector: arg.control, interactionType: RR.InteractionType.EnterText, enterText: arg.text });
      } else { fail('unknown RecordReplay op ' + op); return; }
      p.then(() => resolve(null), fail);
    }, (e) => fail('sap/ui/test/RecordReplay could not be loaded: ' + String((e && e.message) || e)));
  }), { op, arg });
}

/** Waits until UI5 has nothing pending. After the logon it also waits for the
 *  launchpad to have an application open, since the shell settles before the app starts. */
async function waitUI5(page, timeoutMs = 60000, needApp = false) {
  const fr = ui5Frame(page);
  await fr.waitForFunction(() => !!(window.sap && window.sap.ui && typeof window.sap.ui.require === 'function'),
    null, { timeout: timeoutMs });
  if (needApp) {
    await fr.waitForFunction(() => new Promise((resolve) => {
      try {
        window.sap.ushell.Container.getServiceAsync('AppLifeCycle')
          .then(s => resolve(!!(s.getCurrentApplication() && s.getCurrentApplication().componentInstance)),
            () => resolve(false));
      } catch (_) { resolve(false); }
    }), null, { timeout: timeoutMs, polling: 500 });
  }
  await withRecordReplay(page, 'wait', timeoutMs);
}

/** The DOM element of the first control matching a RecordReplay selector. */
async function controlElement(page, control) {
  const handle = await ui5Frame(page).evaluateHandle((sel) => new Promise((resolve, reject) => {
    window.sap.ui.require(['sap/ui/test/RecordReplay'], (RR) => {
      RR.findDOMElementByControlSelector({ selector: sel }).then(resolve,
        (e) => reject(new Error(String((e && e.message) || e))));
    }, reject);
  }), control);
  const el = handle.asElement();
  if (!el) throw new Error(`no control matches ${JSON.stringify(control)}`);
  return el;
}

/** What a Fiori elements screen shows, read from the running app: which app and
 *  service it is, which system, and every visible button / field / label / column /
 *  section with its label. This is the Fiori counterpart of the ABAP analysis --
 *  the labels here are the ones the user reads, in the logon language. */
async function describeFiori(page) {
  return ui5Frame(page).evaluate(async () => {
    const req = (m) => new Promise((res) => window.sap.ui.require([m], res, () => res(null)));
    const out = { ui5: window.sap.ui.version || null, system: null, app: null, controls: [] };
    try {
      const ls = window.sap.ushell.Container.getLogonSystem();
      out.system = { sid: ls.getName ? ls.getName() : null, client: ls.getClient ? ls.getClient() : null };
    } catch (_) { /* not a launchpad */ }
    try {
      const s = await window.sap.ushell.Container.getServiceAsync('AppLifeCycle');
      const comp = s.getCurrentApplication().componentInstance;
      const sapApp = comp.getManifestEntry('sap.app') || {};
      const ui5 = comp.getManifestEntry('sap.ui5') || {};
      const generic = comp.getManifestEntry('sap.ui.generic.app') || null;
      const targets = Object.entries((ui5.routing && ui5.routing.targets) || {}).map(([k, t]) => ({
        target: k, template: t.name || t.viewName || null,
        entitySet: (t.options && t.options.settings && (t.options.settings.entitySet || t.options.settings.contextPath)) || null,
      }));
      out.app = {
        id: sapApp.id || null, title: sapApp.title || null, version: (sapApp.applicationVersion || {}).version || null,
        dataSources: Object.fromEntries(Object.entries(sapApp.dataSources || {}).map(([k, d]) => [k, { uri: d.uri, type: d.type, odataVersion: d.settings && d.settings.odataVersion }])),
        // v4 (sap.fe) names its pages in routing targets, v2 (sap.suite.ui.generic.template) in sap.ui.generic.app.
        targets, v2pages: generic ? generic.pages : null,
      };
    } catch (_) { /* no current app */ }

    const Element = await req('sap/ui/core/Element');
    const all = Element && Element.registry ? Object.values(Element.registry.all())
      : Object.values((window.sap.ui.getCore && window.sap.ui.getCore().mElements) || {});
    const WANT = /\.(Button|MenuButton|OverflowToolbarButton|ToggleButton|Link|Input|MultiInput|DatePicker|DateTimePicker|DateRangeSelection|TimePicker|ComboBox|MultiComboBox|Select|CheckBox|RadioButton|Switch|TextArea|SearchField|StepInput|Label|Title|Column|FilterField|Field|SmartField|SmartLabel|ObjectPageSection|ObjectPageSubSection|IconTabFilter|VariantManagement|SmartVariantManagement|MessageStrip|ObjectStatus|ObjectIdentifier)$/;
    const call = (el, fn) => { try { return typeof el[fn] === 'function' ? el[fn]() : undefined; } catch (_) { return undefined; } };
    const txt = (v) => (v && typeof v === 'object' && typeof v.getText === 'function') ? v.getText() : v;
    for (const el of all) {
      if (out.controls.length >= 800) break;
      const type = el.getMetadata().getName();
      if (!WANT.test(type)) continue;
      const dom = call(el, 'getDomRef');
      if (!dom) continue;
      const r = dom.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0)) continue;
      const input = dom.querySelector ? dom.querySelector('input, textarea') : null;
      const text = call(el, 'getText') ?? call(el, 'getTitle') ?? txt(call(el, 'getHeader')) ?? txt(call(el, 'getLabel')) ?? '';
      out.controls.push({
        control: type, id: el.getId(),
        text: String(text || '').slice(0, 80),
        tooltip: String(txt(call(el, 'getTooltip')) || '').slice(0, 80),
        placeholder: String(call(el, 'getPlaceholder') || '').slice(0, 80),
        icon: String(call(el, 'getIcon') || ''),   // an icon-only button's one stable handle
        labelFor: call(el, 'getLabelFor') || '',
        value: String(call(el, 'getValue') ?? ''),
        enabled: call(el, 'getEnabled'), editable: call(el, 'getEditable'), required: call(el, 'getRequired'),
        // type/name/autocomplete let redactSecrets() judge the value, as in the WebGUI dumps.
        type: input ? (input.getAttribute('type') || '') : '',
        name: input ? (input.getAttribute('name') || '') : '',
        autocomplete: input ? (input.getAttribute('autocomplete') || '') : '',
        x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      });
    }
    return out;
  });
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
  // SAP's ICM asks for a client certificate by default (icm/HTTPS/verify_client=1:
  // requested, optional). Chromium answers that by waiting for someone to pick one,
  // and in an automated browser nobody does -- the TLS handshake stops at
  // SSL_CLIENT_CERT_REQUESTED and every page.goto times out while curl reaches the
  // same URL in 100 ms (measured 2026-09-25 on a customer QA system). Requests to
  // the SAP origin therefore go out through Playwright's own HTTP stack, which
  // answers the request with "no certificate", and come back to the page.
  // Redirects are followed on that side too: handing the logon POST's 302 back to
  // the browser left the page waiting on a navigation that never started. The
  // cookies set along the way land in this context either way -- the fetch shares
  // its cookie jar. WebSockets are not routed; the launchpad's notification push
  // fails to connect and nothing in a capture needs it. `"browserTls": true` in the
  // walkthrough turns this off for a system where the browser's own TLS is wanted.
  if (!cfg.browserTls) {
    const origin = new URL(cfg.baseUrl).origin;
    await context.route((u) => u.origin === origin, async (route) => {
      try {
        await route.fulfill({ response: await route.fetch({ timeout: 120000 }) });
      } catch (err) {
        await route.abort().catch(() => {});
      }
    });
  }
  const page = await context.newPage();

  // --- Login ---
  const url = FIORI
    ? `${cfg.baseUrl}/sap/bc/ui2/flp?sap-client=${cfg.client}&sap-language=${cfg.language || 'TR'}` +
      (cfg.intent ? `#${String(cfg.intent).replace(/^#/, '')}` : '')
    : `${cfg.baseUrl}/sap/bc/gui/sap/its/webgui` +
      `?sap-client=${cfg.client}&sap-language=${cfg.language || 'TR'}` +
      (cfg.transaction ? `&~transaction=${encodeURIComponent(cfg.transaction)}` : '');
  if (FIORI && !cfg.intent) {
    console.error('A Fiori walkthrough needs "intent" (the launchpad hash, e.g. "SalesOrder-manage").');
    process.exit(1);
  }
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
  // networkidle is the WebGUI signal. The launchpad never goes idle (it retries a
  // notification WebSocket), so a Fiori run waits for UI5 itself below instead of
  // sitting out the full 60 s here.
  if (!FIORI) {
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(3000); // let the dynpro paint
  } else {
    await page.waitForLoadState('domcontentloaded', { timeout: 60000 }).catch(() => {});
  }

  // Never replay steps against a logon page: the "type" steps would spray input into it and
  // each stray submit counts toward SAP's failed-logon lockout counter.
  if (await userField.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.screenshot({ path: path.join(outDir, 'FAILED-logon.png') }).catch(() => {});
    console.error('Still on the logon page after submitting — aborting without retrying (lockout safety).');
    await browser.close();
    process.exit(3);
  }

  if (FIORI) {
    // The logon form posts back to the launchpad; some systems drop the '#intent'
    // on the way. The session cookie is set by now, so asking again costs no logon.
    const want = '#' + String(cfg.intent).replace(/^#/, '');
    if (!decodeURIComponent(new URL(page.url()).hash).startsWith(want)) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    }
    try {
      await waitUI5(page, cfg.ui5TimeoutMs || 90000, true);
    } catch (err) {
      await page.screenshot({ path: path.join(outDir, 'FAILED-app-start.png') }).catch(() => {});
      console.error(`The app did not start: ${err.message}`);
      await browser.close();
      process.exit(2);
    }
    // Which system this really is, from the launchpad itself -- the production
    // check in SKILL.md reads this line rather than trusting the URL.
    const info = await describeFiori(page).catch(() => null);
    const sys = info && info.system;
    verifications.push({ step: -1, name: 'logon-system', text: sys ? `${sys.sid || '?'} / ${sys.client || '?'}` : null });
    console.log(`Logged on to ${sys ? `${sys.sid || '?'} / client ${sys.client || '?'}` : '(system unknown)'}; ` +
      `app ${(info && info.app && info.app.id) || '(unknown)'}`);
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
          if (FIORI) await waitUI5(page, step.timeoutMs || 60000); // the key may start an OData call
          break;
        case 'type':
          await page.keyboard.type(step.text, { delay: 30 });
          if (FIORI) await waitUI5(page, step.timeoutMs || 60000); // suggestions load while typing
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
        // --- Fiori steps (cfg.ui === 'fiori'); see references/fiori-capture.md ---
        case 'waitUI5':
          await waitUI5(page, step.timeoutMs || 60000);
          break;
        case 'pressControl':
          // A UI5 press event, not a mouse click at a position: it reaches a button
          // hidden in an overflow menu and fails loudly on a disabled one.
          await withRecordReplay(page, 'press', { control: step.control });
          await waitUI5(page, step.timeoutMs || 60000);
          break;
        case 'enterText':
          await withRecordReplay(page, 'enterText', { control: step.control, text: step.text });
          await waitUI5(page, step.timeoutMs || 60000);
          break;
        case 'clickControl': {
          // A real mouse click on the control -- then `type` / `press` act on it
          // exactly as a user's keyboard would. enterText sets the value through
          // UI5; a SmartField with a value list did not keep it (measured
          // 2026-09-25), and the Enter that followed went to whatever had focus.
          const el = await controlElement(page, step.control);
          await el.click({ clickCount: step.double ? 2 : 1 });
          await waitUI5(page, step.timeoutMs || 60000);
          break;
        }
        case 'markControl': {
          const el = await controlElement(page, step.control);
          const box = await el.boundingBox();
          if (!box) throw new Error(`control is not on screen: ${JSON.stringify(step.control)}`);
          (markers[step.shot] ||= []).push({ label: step.label, ...box });
          break;
        }
        case 'describeApp': {
          const info = await describeFiori(page);
          redactSecrets(info.controls);
          fs.writeFileSync(path.join(outDir, `${step.name || 'dom-fiori'}.json`), JSON.stringify(info, null, 2));
          console.log(`  [${i}] describeApp -> ${step.name || 'dom-fiori'}.json (${info.controls.length} controls)`);
          break;
        }
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

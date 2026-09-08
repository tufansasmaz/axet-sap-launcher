#!/usr/bin/env node
/**
 * env.js — Loads SAP WebGUI credentials from the project's EXISTING secret file
 * (`.conn_adt`) into process.env, without ever printing, logging, or otherwise
 * surfacing the values.
 *
 * This skill does not invent its own secrets mechanism: `.conn_adt` is the same
 * file the sap-adt skill and the various work/<task> capture scripts already use
 * (fields SAP_WEBGUI_USER / SAP_WEBGUI_PASS alongside the ADT_SAP_* fields). If it
 * is present, its credentials are used; if not, the caller falls back to whatever
 * is already in the environment. Either way, callers only ever see "present" /
 * "missing" (see scripts/precheck.js) — never the actual value.
 *
 * Rules:
 *  - Never echoes file contents to stdout/stderr.
 *  - Only fills a variable that is not already set (explicit env wins over the file).
 *  - Missing/unreadable `.conn_adt` is not an error here; precheck.js is what reports
 *    the resulting missing SAP_WEBGUI_USER/PASS.
 */

const fs = require('fs');
const path = require('path');

const CREDENTIAL_KEYS = ['SAP_WEBGUI_USER', 'SAP_WEBGUI_PASS'];

function findConnAdt(startDir) {
  let dir = path.resolve(startDir || process.cwd());
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, '.conn_adt');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** Loads SAP_WEBGUI_USER / SAP_WEBGUI_PASS from .conn_adt into process.env.
 *  Returns { loaded: boolean, path: string|null } — path is only for diagnostics
 *  (which file was used), never the file's contents. */
function loadConnAdt() {
  const explicit = process.env.CONN_ADT_PATH;
  const file = (explicit && fs.existsSync(explicit)) ? explicit : findConnAdt();
  if (!file) return { loaded: false, path: null };

  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (_) {
    return { loaded: false, path: file };
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!CREDENTIAL_KEYS.includes(key)) continue; // only credentials; nothing else is needed here
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
  return { loaded: true, path: file };
}

module.exports = { loadConnAdt, findConnAdt };

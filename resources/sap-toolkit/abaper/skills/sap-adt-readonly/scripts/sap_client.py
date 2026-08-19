#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SAP ABAP Development Client
Unified OOP interface for all SAP ADT operations
"""
import os
import sys
import io
import xml.etree.ElementTree as ET

# Force UTF-8 output on Windows to handle Turkish and other non-ASCII characters
def _setup_utf8_output():
    if sys.platform == 'win32':
        try:
            # Only wrap if encoding is not already UTF-8
            if hasattr(sys.stdout, 'encoding') and sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
                if hasattr(sys.stdout, 'buffer'):
                    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
            if hasattr(sys.stderr, 'encoding') and sys.stderr.encoding and sys.stderr.encoding.lower() != 'utf-8':
                if hasattr(sys.stderr, 'buffer'):
                    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
        except Exception:
            pass  # Ignore if wrapping fails

_setup_utf8_output()


def _sq(value):
    """Escape a value for safe interpolation into an ABAP SQL string literal.

    ABAP object/transport names cannot legally contain quotes, but every value we
    interpolate ultimately originates from tool input — escape defensively so a
    malformed name degrades to a no-match instead of a broken/altered query.
    """
    return str(value or '').replace("'", "''")


from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
from sap_adt_lib import (
    SAPADTClient,
    check_sap_config,
    create_conn_file,
    create_conn_template,
    get_conn_path,
    get_explicit_working_dir,
    validate_sap_config
)
from object_types import (
    get_object_url,
    get_source_url,
    get_adt_type,
    normalize_object_type,
    get_type_description,
    supports_creation
)


class SAPClient:
    """High-level SAP ABAP Development Client"""

    def __init__(self, local_base: Optional[Path] = None):
        """
        Initialize SAP client

        Args:
            local_base: Local directory for storing .abap files (default: project_root/ERP/ZAI/classes)
        """
        self.debug_enabled = (os.getenv('ADT_SAP_DEBUG') == '1') or (os.getenv('SAP_ADT_DEBUG') == '1')
        self.debug_log_path = None
        explicit_dir = get_explicit_working_dir()

        if self.debug_enabled:
            log_dir = explicit_dir if explicit_dir else Path.cwd()
            self.debug_log_path = log_dir / "sap_adt_debug.log"
            try:
                self.debug_log_path.parent.mkdir(parents=True, exist_ok=True)
                with open(self.debug_log_path, "a", encoding="utf-8") as log_file:
                    log_file.write(f"\n--- SAP ADT DEBUG {datetime.utcnow().isoformat()}Z ---\n")
            except Exception as exc:
                print(f"[DEBUG] Failed to init debug log at {self.debug_log_path}: {exc}")
                self.debug_log_path = None

        self.adt_client = SAPADTClient()

        # Source-drift baselines (v1.4.8): source_url -> normalized content hash captured
        # when THIS session reads an object (adt_get_source) or successfully pushes it.
        # push_object compares live-vs-baseline to catch a concurrent edit before it is
        # silently overwritten (multi-agent same-object scenario).
        self._source_baselines = {}

        # Log SAP connection details (without password)
        if self.debug_enabled and self.debug_log_path:
            self._debug(f"[DEBUG] SAP Connection - URL: {self.adt_client.url}, Client: {self.adt_client.client}, User: {self.adt_client.user}")

        # Set up local workspace in user's project directory
        if local_base:
            self.local_base = Path(local_base)
        else:
            if explicit_dir:
                # Use the explicit working directory (user's project folder)
                self.local_base = explicit_dir / "ERP" / "ZAI" / "classes"
            else:
                # Fall back to current working directory
                self.local_base = Path.cwd() / "ERP" / "ZAI" / "classes"

        self.local_base.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def _norm_src(s: str) -> str:
        """Normalize ABAP source for drift comparison: LF endings, strip per-line
        trailing whitespace, strip leading/trailing blank lines. (TRAKYA's CRLF-drift
        lesson — don't let a line-ending difference read as a real change.)"""
        text = (s or "").replace("\r\n", "\n").replace("\r", "\n")
        return "\n".join(ln.rstrip() for ln in text.split("\n")).strip()

    def note_source_baseline(self, source_url: str, source_text: str) -> None:
        """Record the normalized hash of an object's source as this session's baseline."""
        try:
            import hashlib
            self._source_baselines[source_url] = hashlib.sha256(
                self._norm_src(source_text).encode("utf-8")).hexdigest()
        except Exception:
            pass

    def _source_baseline(self, source_url: str):
        return getattr(self, "_source_baselines", {}).get(source_url)

        if self.debug_enabled and self.debug_log_path:
            self._debug(f"[DEBUG] debug log path: {self.debug_log_path}")

    def _debug(self, message: str) -> None:
        if not self.debug_enabled:
            return
        print(message)
        if not self.debug_log_path:
            return
        try:
            with open(self.debug_log_path, "a", encoding="utf-8") as log_file:
                log_file.write(f"{message}\n")
        except Exception as exc:
            print(f"[DEBUG] Failed to write debug log: {exc}")

    @staticmethod
    def check_sap_config():
        """Return .conn_adt configuration status (no SAP call)."""
        return check_sap_config()

    @staticmethod
    def check_logon():
        """Return whether we can reach SAP ADT with current credentials."""
        return SAPADTClient().check_logon()

    # ===== Object Source Operations =====

    def download_object(self, object_name: str, object_type: str = 'class', save_local: bool = True) -> str:
        """
        Download ABAP object source code from SAP

        Args:
            object_name: Name of the object (e.g., 'ZAI_CL_AI_CLIENT')
            object_type: Type of object ('class', 'interface', 'program', etc.)
            save_local: Whether to save to local file (default: True)

        Returns:
            Source code as string
        """
        source_url = get_source_url(object_name, object_type)
        type_desc = get_type_description(object_type)

        print(f">> Downloading {type_desc}: {object_name}")
        print(f"   URL: {self.adt_client.url}{source_url}")

        source_code = self.adt_client.get_object_source(source_url)

        # Clean SAP's double line breaks
        cleaned_source = source_code.replace('\r\r\n', '\n').replace('\r\n', '\n').replace('\r', '\n')

        if save_local:
            from object_types import get_local_subdir
            subdir = get_local_subdir(object_type)

            # Use parent of local_base (which is .../ERP/ZAI/classes) to get .../ERP/ZAI
            package_base = self.local_base.parent
            target_dir = package_base / subdir
            target_dir.mkdir(parents=True, exist_ok=True)

            file_path = target_dir / f"{object_name}.abap"
            with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
                f.write(cleaned_source)
            if self.debug_enabled:
                self._debug(f"[DEBUG] download_object local_base: {self.local_base}")
                self._debug(f"[DEBUG] download_object target_dir: {target_dir}")
                self._debug(f"[DEBUG] download_object file_path: {file_path}")
            print(f"   [SAVED] {file_path}")

        return cleaned_source

    def _push_method_includes(self, object_url: str, object_name: str, source_code: str,
                               method_names: list, transport: Optional[str]) -> bool:
        """Fallback: PUT failing method bodies to method-level include URLs.

        Called when activation returns "Implementation missing for method X" — the
        symptom of SAP's include splitter not updating a method's CCAU include when a
        new method override is added via source/main PUT.

        Ghost-transport guard is built-in: lock_object() internally calls
        _verify_and_return_lock() which raises SAPLockError if SAP assigns a different
        transport. No PUT is attempted on mismatch, so no ghost CTS entries are created.

        Args:
            object_url: Class ADT URL (e.g. /sap/bc/adt/oo/classes/ZCL_FOO)
            object_name: Class name (for logging)
            source_code: Merged source that was PUT to source/main
            method_names: Uppercase list of method names with missing implementations
            transport: Transport corrNr to use for locking and PUT

        Returns:
            True if at least one method include was successfully updated
        """
        import re as _re
        any_success = False

        for method_name in method_names:
            print(f"\n      [FALLBACK] Method include fallback for: {method_name}")

            # Extract the METHOD...ENDMETHOD block from merged source
            method_pattern = _re.compile(
                rf'(^\s*METHOD\s+{_re.escape(method_name)}\s*\..*?^\s*ENDMETHOD\s*\.)',
                _re.IGNORECASE | _re.DOTALL | _re.MULTILINE
            )
            method_match = method_pattern.search(source_code)
            if not method_match:
                print(f"      [FALLBACK] METHOD {method_name} not found in source — skipping")
                continue

            method_block = method_match.group(1)
            if not method_block.endswith('\n'):
                method_block += '\n'
            print(f"      [FALLBACK] Extracted {len(method_block)} chars")

            include_url = f"{object_url}/includes/implementations/{method_name.upper()}"
            fallback_lock = None
            try:
                # Re-lock. _verify_and_return_lock() is called inside lock_object().
                # If SAP assigns a different transport (ghost or foreign), SAPLockError is
                # raised immediately and we never reach the PUT — no ghost entries written.
                print(f"      [FALLBACK] Locking (transport: {transport})...")
                fallback_lock = self.adt_client.lock_object(object_url, transport=transport)
                fb_effective = self.adt_client._last_lock_effective_transport or transport
                print(f"      [FALLBACK] Lock OK: {(fallback_lock or '')[:30]}... effective transport: {fb_effective}")

                # PUT method body to method-level include
                print(f"      [FALLBACK] PUT → {include_url}")
                self.adt_client.set_include_source(
                    include_url, method_block, fallback_lock, fb_effective
                )
                print(f"      [FALLBACK] [OK] Updated: {method_name}")
                any_success = True

            except Exception as fb_err:
                print(f"      [FALLBACK] [FAIL] {method_name}: {str(fb_err)[:200]}")
                if 'transport' in str(fb_err).lower() or 'CORRNR' in str(fb_err):
                    print(f"      [FALLBACK] [STOP] Ghost transport risk detected — aborting fallback")
                    print(f"      [FALLBACK] Use SE01/SM12 to clean up, then retry.")
                    break  # Abort entire fallback on transport mismatch
            finally:
                if fallback_lock and fallback_lock != 'NO_LOCK_SUPPORT':
                    try:
                        self.adt_client.unlock_object(object_url, fallback_lock)
                        fallback_lock = None
                        print(f"      [FALLBACK] Unlocked.")
                    except Exception:
                        print(f"      [FALLBACK] [WARNING] Unlock failed — use SM12 to release manually")

        return any_success

    def _find_existing_transport(self, object_name: str, object_type_str: str, requested_transport: str) -> str:
        """Query E071+E070 to find the K-type workbench request already owning this object.

        Called before every lock_object() call (Bug 9 fix). Prevents ghost transports
        when the same object was already recorded in a previous push session.

        Resolution rules (applied in order):
          1. Filter E071 by OBJ_NAME (the name column), joined with E070 for TRSTATUS='D'.
          2. Resolve S-type task → K-type workbench request via E070.STRKORR.
             (E071 always records against the S-task; lock_object's CORRNR verification
             expects the K-parent — returning an S-type causes a spurious mismatch.)
          3. Filter candidates to current user (E070.AS4USER) to avoid hijacking
             another developer's transport.
          4. Prefer R3TR CLAS entries over LIMU sub-include entries. R3TR CLAS is a
             catch-all that CTS treats as owning the whole class pool; any push reuses
             its transport. LIMU CLSD/CPUB/CM0xx entries only claim one include and
             cause new ghosts when a different include is touched.
          5. If requested_transport appears in the candidate K-parents, keep it.
             Otherwise return the top-ranked candidate.

        Falls back silently to requested_transport if the data preview API returns an
        error (e.g. HTTP 500 on systems where E071 is not accessible — see Bug 11).

        History:
          - 2026-03-13 (Bug 9): Original — filtered E071~OBJECT='{name}' which is the
            4-char type-code column. Caused HTTP 400 on every call (field width overflow).
            The except-clause silently swallowed the error → fix was a no-op.
          - 2026-04-09: Fixed column name, added S→K resolution, user filter, and
            R3TR CLAS preference. Live-tested on INDEX system against ZAI_CL_AI_BASE
            (scattered LIMU state) and ZAI_CL_TMP1 (single R3TR CLAS).

        Args:
            object_name: ABAP object name (e.g. ZAI_CL_LIB_TOOLS)
            object_type_str: Normalized object type (e.g. 'class')
            requested_transport: Transport corrNr the caller wants to use

        Returns:
            K-type workbench request owning the object, or requested_transport
            if none found or on query error.
        """
        try:
            obj_upper = object_name.upper()
            current_user = (getattr(self.adt_client, 'user', '') or '').upper()
            req_upper = (requested_transport or '').upper()

            # Pull TRKORR + STRKORR + AS4USER + PGMID + OBJECT so we can resolve
            # S→K and rank R3TR CLAS above LIMU shards.
            query = (
                f"SELECT E071~TRKORR, E070~STRKORR, E070~AS4USER, E071~PGMID, E071~OBJECT "
                f"FROM E071 JOIN E070 ON E071~TRKORR = E070~TRKORR "
                f"WHERE E071~OBJ_NAME = '{_sq(obj_upper)}' "
                f"AND E070~TRSTATUS = 'D'"
            )
            result_xml = self.adt_client.run_query(query, row_number=50)

            ns = {'dp': 'http://www.sap.com/adt/dataPreview'}
            dp_name = '{http://www.sap.com/adt/dataPreview}name'
            root = ET.fromstring(result_xml)

            columns = root.findall('.//dp:columns', ns)
            if not columns:
                return requested_transport

            # Build column name → list of values
            col_data = {}
            for col in columns:
                meta = col.find('dp:metadata', ns)
                col_name = (meta.get(dp_name) if meta is not None else '').upper()
                col_data[col_name] = [(d.text or '').strip() for d in col.findall('.//dp:data', ns)]

            trkorrs = col_data.get('TRKORR', [])
            if not trkorrs:
                return requested_transport
            strkorrs = col_data.get('STRKORR', [])
            users = col_data.get('AS4USER', [])
            pgmids = col_data.get('PGMID', [])
            objects = col_data.get('OBJECT', [])

            # Build candidates: (k_parent_transport, pgmid, object_type, owner)
            candidates = []
            for i, trkorr in enumerate(trkorrs):
                if not trkorr:
                    continue
                strkorr = strkorrs[i] if i < len(strkorrs) else ''
                owner = (users[i] if i < len(users) else '').upper()
                pgmid = (pgmids[i] if i < len(pgmids) else '').upper()
                otype = (objects[i] if i < len(objects) else '').upper()
                # Resolve S→K: if this row's E070 has a parent, use the parent
                k_parent = strkorr if strkorr else trkorr
                candidates.append((k_parent, pgmid, otype, owner))

            # Filter to current user (avoid switching into another dev's transport).
            if current_user:
                own = [c for c in candidates if c[3] == current_user]
            else:
                own = candidates
            if not own:
                return requested_transport

            # Rank: R3TR CLAS (catch-all) first, then everything else (LIMU shards).
            def rank(c):
                k, pgmid, otype, _ = c
                is_catchall = (pgmid == 'R3TR' and otype == 'CLAS')
                # Prefer requested transport when it's already in the candidate set.
                matches_requested = (req_upper and k.upper() == req_upper)
                return (0 if matches_requested else 1, 0 if is_catchall else 1, k)

            own_sorted = sorted(own, key=rank)
            best = own_sorted[0][0]

            # Detect scatter: multiple distinct K-parents with LIMU entries of the
            # same class pool. Warn the user — Bug 11's auto-retry will save the push,
            # but SE09 manual merge (adding as R3TR CLAS) is the permanent fix.
            distinct_ks = sorted({c[0] for c in own})
            has_catchall = any(c[1] == 'R3TR' and c[2] == 'CLAS' for c in own)
            if len(distinct_ks) > 1 and not has_catchall:
                others = ", ".join(k for k in distinct_ks if k != best)
                print(f"      [WARN] Class-pool includes of {object_name} are scattered across multiple transports: {others} (will use {best}).")
                print(f"      [WARN] To consolidate permanently: SE09 → add {object_name} as R3TR CLAS to one transport.")

            if best.upper() != req_upper:
                # GHOST-REDIRECT GUARD (v1.3.3). Redirecting is correct CTS behaviour for a
                # legitimate own transport (class-pool includes must stay in one request) —
                # but if the owning request is itself an auto-generated GHOST ("Generated
                # Request for Change Recording"), silently following it would land the
                # user's change in the ghost while reporting success (live incident:
                # IEDK937095, 2026-06-09 — the lock returns the ghost's CORRNR, so the
                # no-CORRNR guard can't catch this case). Check the redirect target's
                # description and REFUSE rather than follow a ghost.
                ghost_desc = 'Generated Request for Change Recording'
                best_desc = ''
                try:
                    _d = self.run_sql_query(
                        f"SELECT as4text FROM e07t WHERE trkorr = '{_sq(best.upper())}'", 2)
                    _rows = (_d or {}).get('data') or []
                    if _rows and _rows[0]:
                        best_desc = (_rows[0][0] or '').strip()
                except Exception:
                    pass  # description unknown -> fall through to the normal redirect
                if best_desc == ghost_desc:
                    from sap_adt_lib import SAPValidationError
                    raise SAPValidationError(
                        f"GHOST-REDIRECT PREVENTED: {object_name} is currently recorded in "
                        f"{best} — an auto-generated ghost ('{ghost_desc}'), not your "
                        f"transport {requested_transport}. Pushing now would land the change "
                        f"in the ghost while appearing to succeed.\n\n"
                        f"Fix first (then retry the push):\n"
                        f"  1. SE09 -> {best} (or its task) -> Object List -> delete the "
                        f"{object_name.upper()} entry, or move it to {requested_transport} "
                        f"(Utilities -> Reassign).\n"
                        f"  2. If {best} is then empty: adt_delete_transport {best}.\n\n"
                        f"No change was pushed; nothing was recorded in the ghost."
                    )
                print(f"      [INFO] Object already recorded in transport {best} — using it instead of {requested_transport}")
                print(f"      [INFO] (Prevents ghost transport: SAP class-pool includes must stay in one transport)")
            return best

        except Exception as e:
            # The GHOST-REDIRECT refusal must NOT be swallowed by this resilience
            # fallback — it is a deliberate abort, not a lookup failure.
            from sap_adt_lib import SAPValidationError as _SVE
            if isinstance(e, _SVE) and 'GHOST-REDIRECT PREVENTED' in str(e):
                raise
            if self.debug_enabled:
                self._debug(f"[DEBUG] _find_existing_transport failed (will use requested transport): {str(e)[:120]}")

        return requested_transport

    def push_object(self, object_name: str, object_type: str = 'class', transport: Optional[str] = None, source_file: Optional[str] = None, ack_drop: Optional[str] = None) -> Dict[str, Any]:
        """
        Push local object changes to SAP (complete workflow: lock -> upload -> activate -> unlock)

        Args:
            object_name: Name of the object
            object_type: Type of object
            transport: Transport request number (optional)
            source_file: Full path to local source file (optional, auto-detected if not provided)

        Returns:
            dict with keys:
                success (bool): Whether the full push succeeded
                error (str): Error message if failed, empty string otherwise
                error_type (str): Exception class name if failed (e.g., 'SAPLockError')
                source_uploaded (bool): Whether source code was uploaded to SAP
                activated (bool): Whether the object was activated
                lock_released (bool): Whether the lock was cleanly released
        """
        from object_types import get_local_subdir

        result = {
            'success': False,
            'error': '',
            'error_type': '',
            'source_uploaded': False,
            'activated': False,
            'lock_released': True,
            # Structured fields (v1.3.2) — let an agent reason without parsing the log:
            'corrnr': None,          # transport SAP attributed the object to on lock (authoritative)
            'task': None,            # the user S-task the object was recorded into (addobject target)
            'addobject_status': None,  # 'addobject' | 'already-present' | 'failed(<code>)' | None
            'ghost_prevented': False,  # True when the guard refused before the PUT (no ghost created)
        }

        type_desc = get_type_description(object_type)
        object_url = get_object_url(object_name, object_type)
        source_url = get_source_url(object_name, object_type)

        # Guardrails: customer-namespace only + read-only mode check (bypass-free).
        from guardrails import require_writable, require_customer_namespace, GuardrailViolation
        try:
            require_writable(what=f"push {object_type}")
            require_customer_namespace(object_name, what=object_type)
        except GuardrailViolation as gv:
            result['error'] = str(gv)
            result['error_type'] = 'GuardrailViolation'
            print(f"\n[BLOCKED] {gv}")
            return result

        print(f"\n{'=' * 70}")
        print(f"  Pushing {type_desc}: {object_name}")
        print(f"{'=' * 70}")

        # Determine local file location
        if source_file:
            local_file = Path(source_file)
        else:
            subdir = get_local_subdir(object_type)
            package_base = self.local_base.parent
            local_file = package_base / subdir / f"{object_name}.abap"

        if not local_file.exists():
            print(f"\n[ERROR] Local file not found: {local_file}")
            print(f"[INFO] Working directory: {Path.cwd()}")
            print(f"[INFO] Local base: {self.local_base}")
            if source_file:
                print(f"[INFO] Specified source: {source_file}")
            result['error'] = f"Local file not found: {local_file}"
            result['error_type'] = 'FileNotFoundError'
            return result

        if self.debug_enabled:
            self._debug(f"[DEBUG] push_object local_base: {self.local_base}")
            self._debug(f"[DEBUG] push_object local_file: {local_file}")
            self._debug(f"[DEBUG] push_object object_url: {object_url}")
            self._debug(f"[DEBUG] push_object source_url: {source_url}")

        with open(local_file, 'r', encoding='utf-8') as f:
            source_code = f.read()

        print(f"\n[1/4] Reading local file...")
        print(f"      {local_file}")
        print(f"      Size: {len(source_code)} characters")

        # Binding-drift backstop (v1.4.7): refuse if the live session is bound to a
        # different host than .conn_adt now points to (stale session after a switch).
        from guardrails import (require_binding_current, scan_method_param_type_c,
                                 diff_ddic_fields, GuardrailViolation as _GV)
        try:
            require_binding_current(self, what=f"push {object_type}")
        except _GV as gv:
            result['error'] = str(gv); result['error_type'] = 'GuardrailViolation'
            print(f"\n[BLOCKED] {gv}")
            return result

        # Pre-push deterministic validators (v1.4.7, ported from TRAKYA) — block BEFORE
        # the bytes hit SAP, where the failure would otherwise be opaque or destructive.
        otype_l = (object_type or '').lower()
        # (1) class method-param `TYPE c LENGTH n` → source-based save fails with a
        #     LINE-NUMBER-LESS HTTP 400. Refuse here with the exact offending lines.
        if otype_l in ('class', 'clas', 'interface', 'intf'):
            tc_hits = scan_method_param_type_c(source_code)
            if tc_hits:
                lines = "; ".join(f"line {ln}: {txt}" for ln, txt in tc_hits[:8])
                msg = (f"Pre-push BLOCKED: {object_name} has `TYPE c LENGTH n` in a METHODS "
                       f"declaration — a source-based class save fails with an opaque, "
                       f"line-number-less HTTP 400. Use `TYPE string` or a DDIC data element. "
                       f"Offending: {lines}")
                print(f"\n[ABORT - PRE-PUSH VALIDATION] {msg}")
                result['error'] = msg; result['error_type'] = 'PrePushValidationFailed'
                return result
        # (2) DDIC table field DROP / RENAME / TYPE change → data loss. Diff the LIVE
        #     source; refuse a drop/retype unless the field is explicitly named in ack_drop.
        if otype_l in ('table', 'tabl', 'structure', 'stru'):
            try:
                live = self.adt_client.session.get(
                    f"{self.adt_client.url}/sap/bc/adt/ddic/tables/{object_name.lower()}/source/main",
                    headers={'Accept': 'text/plain'}, timeout=self.adt_client.timeout_short)
                live_text = live.text if live.status_code == 200 else None
            except Exception:
                live_text = None
            if live_text:  # table exists → it's an ALTER, guard data loss
                dropped, type_changed, _added = diff_ddic_fields(live_text, source_code)
                ack = {f.strip().lower() for f in (ack_drop or '').split(',') if f.strip()}
                unack = [f for f in dropped if f not in ack]
                if unack or type_changed:
                    parts = []
                    if unack:
                        parts.append(f"fields DROPPED: {', '.join(unack)}")
                    if type_changed:
                        parts.append("fields RETYPED/RENAMED: " +
                                     ", ".join(f"{f}({o}->{n})" for f, o, n in type_changed))
                    msg = (f"Pre-push BLOCKED (data loss): {object_name.upper()} — "
                           + "; ".join(parts) + ". This destroys data. To intentionally drop a "
                           f"field, name it in ack_drop (e.g. ack_drop='{(unack or ['fld'])[0]}'). "
                           f"RETYPE/RENAME is never auto-acked — split into add-new + migrate + drop.")
                    print(f"\n[ABORT - PRE-PUSH VALIDATION] {msg}")
                    result['error'] = msg; result['error_type'] = 'PrePushValidationFailed'
                    return result
                if dropped:  # all acked
                    print(f"      [ACK] Acknowledged field drop(s): {', '.join(dropped)}")

        # Source-drift guard (v1.4.8, ADR-0016 adapted, fail-OPEN) — the multi-agent
        # clobber protection. If THIS session read the object (adt_get_source set a
        # baseline) and the LIVE active source has changed since, another agent/session
        # edited it — pushing now would SILENTLY OVERWRITE their change. Refuse; the agent
        # must re-read + re-apply. Content-hash (normalized), not a symmetric working-tree
        # diff (TRAKYA's first design wrongly blocked legitimate edits — the baseline is the
        # version you READ, so an intended edit never false-triggers). No baseline / live
        # unreadable / new object → proceed (can't judge).
        _base = self._source_baseline(source_url)
        if _base:
            try:
                _live = self.adt_client.get_object_source(source_url, version='active')
            except Exception:
                _live = None
            if _live is not None:
                import hashlib as _hl
                _live_hash = _hl.sha256(self._norm_src(_live).encode("utf-8")).hexdigest()
                if _live_hash != _base:
                    msg = (f"Source drift on {object_name}: the LIVE version changed since you "
                           f"read it this session — another agent/session edited it. Pushing now "
                           f"would silently OVERWRITE that change. Re-read with adt_get_source, "
                           f"re-apply your edit onto the new content, then push again.")
                    print(f"\n[ABORT - SOURCE DRIFT] {msg}")
                    result['error'] = msg
                    result['error_type'] = 'SourceDriftDetected'
                    return result

        # Transport resolution chain (v1.4.0) — when the caller omits the transport:
        #   (a) explicit argument (handled by the caller passing it)
        #   (b) the transport that already OWNS this object (E071, ghost-checked —
        #       the only CTS-correct choice for an owned object)
        #   (c) the session-pinned workstream transport (adt_set_transport — confirmed
        #       by the user once per session, held in process memory only so it can
        #       never go stale across sessions)
        #   (d) REFUSE with the transportchecks eligible-request list.
        # Never auto-create, never guess: the chain only lands on a transport the user
        # sanctioned, or it stops. All downstream guards (CORRNR, ghost-redirect)
        # still apply to whatever this resolves.
        if not transport:
            from sap_adt_lib import SAPValidationError as _SVE0
            owned = ''
            try:
                owned = self._find_existing_transport(object_name, object_type, '')
            except _SVE0 as ghost_redirect:
                msg = str(ghost_redirect)
                print(f"\n[ABORT - GHOST REDIRECT PREVENTED] {msg}")
                result['error'] = msg
                result['error_type'] = 'GhostRedirectPrevented'
                result['ghost_prevented'] = True
                return result
            if owned:
                transport = owned
                print(f"\n[INFO] No transport specified — using the object's owning transport: {transport}")
            elif getattr(self, 'session_transport', None):
                transport = self.session_transport
                print(f"\n[INFO] No transport specified — using the session-pinned transport: {transport}")
            else:
                eligible = ''
                try:
                    chk = self.adt_client.transport_check(object_url, link_up=True)
                    if chk.get('ok') and chk.get('requests'):
                        eligible = "\nEligible open requests (transportchecks):\n" + "\n".join(
                            f"  - {r['trkorr']} [{r.get('trfunction', '')}] (owner {r.get('as4user', '')}) "
                            f"\"{r.get('as4text', '')}\"" for r in chk['requests'][:5]) + "\n"
                except Exception:
                    pass
                msg = (f"No transport resolved for {object_name}: none was passed, the object is "
                       f"in no modifiable transport, and no session transport is pinned.\n"
                       f"Fix: pass transport=..., or pin the workstream transport once with "
                       f"adt_set_transport (confirm the number with the user via "
                       f"adt_list_transports first).{eligible}")
                print(f"\n[ABORT - NO TRANSPORT] {msg}")
                result['error'] = msg
                result['error_type'] = 'NoTransportResolved'
                return result

        # Pre-push scatter guard (non-blocking, read-only). If this class's includes
        # already sit in a DIFFERENT modifiable request than the target, warn — pushing
        # now may fragment it further. Best paired with the MCP path (one session).
        if transport and object_type and object_type.lower() in ('class', 'clas'):
            try:
                scat = self.check_object_scatter(object_name)
                others = [r for r in scat['modifiable_requests'] if r.upper() != transport.upper()]
                if others:
                    print(f"\n[WARN] Scatter risk: {object_name} already has includes in modifiable "
                          f"transport(s) {others}, not the target {transport}.")
                    print(f"[WARN] Consider consolidating into one request (SE09 'Include Objects' / "
                          f"moveobjects) before pushing, to avoid fragmenting it further.")
            except Exception:
                pass  # never block a push on the advisory check

        lock_handle = None
        _pre_lock_covered = False  # set True when pre-lock E071 idempotent check confirms coverage
        try:
            # Pre-check for stale enqueue lock from own session — clear it before locking
            # so SAP doesn't reject with 409 and create a ghost transport.
            existing_lock = self.adt_client.is_object_locked(object_url)
            if existing_lock and existing_lock.get('locked') and existing_lock.get('lock_owner') == self.adt_client.user:
                print(f"\n[INFO] Clearing own stale enqueue lock before locking...")
                self.adt_client.clear_enqueue_lock(object_url, transport=transport)

            # Bug 19 fix: pre-register the object as R3TR CLAS/INTF/PROG/FUGR in the
            # target transport BEFORE locking. SAP CTS locks class-pool includes at
            # LIMU granularity (CLSD, CPUB, CPRI, CPRO, CM0xx). If no R3TR catch-all
            # exists, each touched include that isn't already owned by a transport
            # spawns a new K+S ghost pair. One class push adding a method declaration
            # can spawn 2–3 ghosts. R3TR entry makes CTS attribute every sub-object
            # change to the caller's transport. Idempotent — safe to call every push.
            if transport and object_type and object_type.lower() in (
                'class', 'clas', 'interface', 'intf',
                'program', 'prog', 'report',
                'functiongroup', 'fugr',
            ):
                print(f"\n[1.5/4] Pre-registering R3TR entry to prevent ghost transports...")
                print(f"        Object: {object_name} | Transport: {transport}")
                # The object must be recorded in the user's MODIFIABLE S-TASK under the
                # request, not the K-request itself, for the subsequent object lock to
                # return CORRNR. Verified live (2026-06-09): addobject at K-request level
                # writes the E071 row but the lock still returns no CORRNR (guard then
                # refuses); objects created/added in the S-task (like a freshly created
                # class) resolve cleanly. So resolve the user's open S-task under the
                # request and target addobject there. Falls back to the request if no task.
                reg_target = transport
                try:
                    _task_rows = self.run_sql_query(
                        f"SELECT trkorr FROM e070 WHERE strkorr = '{_sq(transport)}' "
                        f"AND trfunction = 'S' AND trstatus = 'D' "
                        f"AND as4user = '{_sq(self.adt_client.user)}'", 5)
                    _tr = (_task_rows or {}).get('data') or []
                    if _tr and _tr[0] and _tr[0][0]:
                        reg_target = _tr[0][0]
                        print(f"        Resolved user task (addobject target): {reg_target}")
                except Exception as _te:
                    if self.debug_enabled:
                        self._debug(f"[DEBUG] task resolution failed: {str(_te)[:120]}")
                # Idempotent (v1.3.2): skip addobject if the object is already recorded.
                # v1.4.6: Use CTS transport-tree XML (find_object_transports) instead of
                # E071 SQL — the data-preview endpoint for E071 is blocked on some SAP
                # systems (returns 400) while the CTS XML endpoint always works.
                _already_in_task = False
                try:
                    _scat_pre = self.check_object_scatter(object_name)
                    _already_in_task = any(
                        t in _scat_pre.get('modifiable_requests', [])
                        for t in (reg_target, transport)
                        if t
                    )
                except Exception:
                    pass
                if _already_in_task:
                    print(f"        [OK] {object_name} already recorded in {reg_target} — addobject skipped (idempotent).")
                    reg_result = {'registered': True, 'method': 'already-present', 'status_code': 200}
                    _pre_lock_covered = True  # CTS XML confirmed before lock — ghost guard will accept absent CORRNR
                else:
                    reg_result = self.adt_client.register_object_in_transport(
                        object_name, reg_target, object_type
                    )
                result['task'] = reg_target
                result['addobject_status'] = (reg_result.get('method') if reg_result.get('registered')
                                              else f"failed({reg_result.get('status_code')})")
                if reg_result.get('registered'):
                    print(f"        [OK] addobject accepted (HTTP {reg_result.get('status_code')}) "
                          f"via {reg_result.get('method')} — {object_name} included in {transport}")
                    print(f"        [INFO] For an existing transport-less object this writes the E071 row "
                          f"(FM TRINT_APPEND_TO_COMM_ARRAYS) so the lock below returns CORRNR and the "
                          f"change records into {transport}, not a ghost. Lock CORRNR is still the check.")
                    # v1.4.6: verify coverage via CTS XML after fresh addobject — sets
                    # _pre_lock_covered so the ghost guard accepts absent CORRNR on systems
                    # (e.g. INDEX S/4HANA) that never echo CORRNR on lock for existing objects.
                    if not _pre_lock_covered and reg_result.get('method') == 'addobject':
                        try:
                            _scat_post = self.check_object_scatter(object_name)
                            if any(t in _scat_post.get('modifiable_requests', [])
                                   for t in (reg_target, transport) if t):
                                _pre_lock_covered = True
                                print(f"        [INFO] CTS XML verified: {object_name} recorded in "
                                      f"{reg_target} — ghost guard will accept absent CORRNR.")
                        except Exception:
                            pass
                else:
                    err_text = reg_result.get('error', '')[:180]
                    status = reg_result.get('status_code', 0)
                    print(f"        [WARN] Could not pre-register R3TR ({status}) — sub-object changes may spawn ghosts.")
                    print(f"        [WARN] Manual fix: SE09 → {transport} → Include Objects → add object as R3TR.")
                    if self.debug_enabled and err_text:
                        self._debug(f"[DEBUG] register_object_in_transport error: {err_text}")

            # Bug 9 fix: query E071 to find the transport that already owns this object.
            # Prevents ghost K+S transport pairs when the same class-pool include was
            # previously recorded in a different corrNr.
            if transport:
                _requested = transport
                from sap_adt_lib import SAPValidationError as _SVE
                try:
                    transport = self._find_existing_transport(object_name, object_type, transport)
                except _SVE as ghost_redirect:
                    # v1.3.3: the object is owned by an auto-generated ghost — refusing is
                    # the only safe move (following it would silently land the change there).
                    msg = str(ghost_redirect)
                    print(f"\n[ABORT - GHOST REDIRECT PREVENTED] {msg}")
                    result['error'] = msg
                    result['error_type'] = 'GhostRedirectPrevented'
                    result['ghost_prevented'] = True
                    return result
                if transport and transport.upper() != _requested.upper():
                    # Legitimate same-user redirect (CTS: one request per class pool) —
                    # make it visible in the structured result instead of log-only.
                    result['transport_redirect'] = {'from': _requested, 'to': transport}

            # Lock object (pass transport so SAP registers lock under correct corrNr)
            print(f"\n[2/4] Locking object...")
            print(f"      corrNr (transport passed to lock): {transport or '[NONE — ghost transport risk!]'}")

            # Bug 11 fix: if lock fails with a same-user CORRNR mismatch (IS_LINK_UP != 'X'),
            # auto-retry using the transport SAP assigned. This handles the case where E071 is
            # not accessible (HTTP 500) so _find_existing_transport fell through.
            from sap_adt_lib import SAPLockError as _SAPLockError
            try:
                lock_handle = self.adt_client.lock_object(object_url, transport=transport)
            except _SAPLockError as lock_err:
                corrnr_retry = self.adt_client._last_lock_effective_transport
                is_foreign = (self.adt_client._last_lock_is_link_up == 'X')
                if corrnr_retry and transport and corrnr_retry.upper() != transport.upper() and not is_foreign:
                    print(f"      [INFO] Auto-retrying lock with SAP-assigned transport: {corrnr_retry}")
                    print(f"      [INFO] (Same-user CORRNR mismatch — Bug 11 auto-retry)")
                    transport = corrnr_retry
                    lock_handle = self.adt_client.lock_object(object_url, transport=transport)
                else:
                    raise

            print(f"      Lock handle: {lock_handle[:50] if lock_handle else 'None'}...")
            # _verify_and_return_lock() already printed the CORRNR and raised SAPLockError
            # on mismatch. If we reach here the transport assignment is confirmed correct.
            # CORRNR always returns the K-type workbench request (not S-type child task),
            # so effective_transport should always equal the requested transport.
            effective_transport = self.adt_client._last_lock_effective_transport or transport
            result['corrnr'] = self.adt_client._last_lock_corrnr or None

            # GHOST-IMMINENT GUARD (v1.3.0) — abort BEFORE the source PUT when SAP did
            # not attribute the object to the requested transport. PROVEN live on INDEX
            # S/4HANA: changing an object that is released-owned or was removed from its
            # transport makes the lock SUCCEED but return NO CORRNR; SAP then records the
            # PUT into a freshly auto-generated "Generated Request for Change Recording"
            # ghost, NOT the requested transport. The R3TR pre-registration cannot rescue
            # this — for an already-existing object the ADT add-to-transport POST returns
            # HTTP 200 but writes NO E071 row (verified live: the object stays in zero
            # transports). The lock CORRNR (_last_lock_corrnr, raw — NOT the
            # effective_transport fallback) is the only authoritative "is it covered"
            # signal: present -> covered -> proceed; absent -> ghost imminent -> refuse
            # cleanly so NO ghost is ever created.
            # Escape hatch for SAP systems that never echo CORRNR: ABAP_ALLOW_NO_CORRNR=true.
            import os as _os
            _allow_no_corrnr = _os.environ.get('ABAP_ALLOW_NO_CORRNR', '').lower() in ('1', 'true', 'yes')
            # v1.4.2: absent CORRNR is NOT proof of a ghost. On some SAP systems the
            # lock omits CORRNR for an EXISTING object that the addobject pre-registration
            # (or a manual SE09 'Include Objects') already recorded — the PUT then lands
            # in the user's task, not a ghost (verified live on INDEX S/4HANA:
            # ZAI_CL_URN_TOOLS -> task IEDK937131 of IEDK937129). So VERIFY real E071
            # coverage before refusing; only abort when the object is genuinely in zero
            # open transports. (Reference toolkits that lack this guard simply proceed
            # and succeed here — see docs/GHOST_GUARD_FALSE_POSITIVE_ANALYSIS.md.)
            _no_corrnr = bool(transport and not self.adt_client._last_lock_corrnr
                              and lock_handle and lock_handle != 'NO_LOCK_SUPPORT')
            # v1.4.5: seed coverage from pre-lock E071 idempotent check (avoids a
            # redundant is_object_in_transport call when addobject already confirmed).
            _covered = _pre_lock_covered
            if _no_corrnr and not _allow_no_corrnr:
                if _covered:
                    print(f"      [INFO] Lock returned no CORRNR, but {object_name} was already "
                          f"in {transport} before lock (pre-lock E071 idempotent check) — "
                          f"coverage confirmed, proceeding with the PUT (no ghost expected).")
                else:
                    # v1.4.6: use CTS XML (find_object_transports) instead of SQL-based
                    # is_object_in_transport — E071 SQL is blocked on some SAP systems.
                    try:
                        _scat_lock = self.check_object_scatter(object_name)
                        _covered = any(
                            t in _scat_lock.get('modifiable_requests', [])
                            for t in (transport, result.get('task', ''))
                            if t
                        )
                    except Exception:
                        _covered = False
                    if not _covered:
                        try:
                            _covered = self.adt_client.is_object_in_transport(object_name, transport)
                        except Exception:
                            _covered = False
                    if _covered:
                        print(f"      [INFO] Lock returned no CORRNR, but {object_name} is "
                              f"already recorded in {transport} (CTS XML verified) — coverage "
                              f"confirmed, proceeding with the PUT (no ghost expected).")
            if (_no_corrnr and not _allow_no_corrnr and not _covered):
                # v1.3.3: run the READ-ONLY transportchecks diagnosis so the refusal
                # explains WHO holds the object and which requests are eligible —
                # actionable instead of generic. Never let diagnostics break the abort.
                diag = ''
                try:
                    chk = self.adt_client.transport_check(object_url, link_up=True)
                    if chk.get('ok'):
                        parts = []
                        for lk in chk.get('locks') or []:
                            parts.append(
                                f"  - CTS lock holder: {lk['trkorr']} (owner {lk['as4user']}"
                                f"{', FOREIGN' if lk.get('foreign') else ''}) \"{lk.get('as4text','')}\"")
                        for rq in (chk.get('requests') or [])[:5]:
                            parts.append(
                                f"  - eligible request: {rq['trkorr']} [{rq.get('trfunction','')}] "
                                f"(owner {rq.get('as4user','')}) \"{rq.get('as4text','')}\"")
                        if chk.get('existing_req_only'):
                            parts.append("  - EXISTING_REQ_ONLY: only an already-listed request may be used")
                        if parts:
                            diag = "\nDiagnosis (transportchecks):\n" + "\n".join(parts) + "\n"
                except Exception:
                    pass
                ghost_msg = (
                    f"Refusing to push: SAP did not assign {object_name} to transport "
                    f"{transport} (lock returned no CORRNR). This object is released-owned "
                    f"or was removed from its transport, so the change would be recorded into "
                    f"an auto-generated ghost ('Generated Request for Change Recording'), "
                    f"not {transport}.\n\n"
                    f"Fix one of:\n"
                    f"  1. SE09 -> open {transport} -> Utilities -> Include Objects -> add "
                    f"{object_name.upper()} as R3TR, then retry the push.\n"
                    f"  2. Deliver this change via the abapGit ZIP bridge (no CTS recording).\n"
                    f"  3. If this SAP system never returns CORRNR on lock, set "
                    f"ABAP_ALLOW_NO_CORRNR=true to bypass this guard.\n"
                    f"{diag}\n"
                    f"No ghost transport was created — the lock has been released."
                )
                print(f"\n[ABORT - GHOST PREVENTED] {ghost_msg}")
                try:
                    if self.adt_client.unlock_object(object_url, lock_handle):
                        print(f"      [OK] Lock released.")
                        result['lock_released'] = True
                    else:
                        result['lock_released'] = False
                except Exception:
                    result['lock_released'] = False
                lock_handle = None
                result['error'] = ghost_msg
                result['error_type'] = 'GhostTransportPrevented'
                result['ghost_prevented'] = True
                return result

            if lock_handle == 'NO_LOCK_SUPPORT':
                print(f"      [INFO] Lock endpoint not available on this SAP system")
                print(f"      [INFO] Attempting edit without explicit lock...")

            # Push source
            print(f"\n[3/4] Uploading source code...")
            if effective_transport:
                print(f"      Transport: {effective_transport}")

            try:
                self.adt_client.set_object_source(source_url, source_code, lock_handle, effective_transport)
                result['source_uploaded'] = True
                print(f"      [OK] Source uploaded")
                # v1.4.8: the session drift baseline is refreshed in the post-activation
                # verify block below — from the LIVE ACTIVE source (ground truth), so SAP
                # pretty-printing can't make the same agent's next push false-drift.
            except Exception as upload_error:
                error_text = str(upload_error)
                if lock_handle == 'NO_LOCK_SUPPORT' and ('423' in error_text or 'lockHandle' in error_text):
                    print(f"\n[ERROR] This SAP system requires explicit locking but doesn't support the ADT lock endpoint")
                    print(f"[ERROR] ADT-based editing is not available for this object on this SAP version")
                    print(f"\n[SOLUTION] Please edit this object in SAP GUI (SE24/SE80)")
                    print(f"[INFO] Object: {object_name}")
                    print(f"[INFO] Object URL: {object_url}")
                    from sap_adt_lib import SAPLockError
                    raise SAPLockError(
                        f"Cannot edit object via ADT on this SAP system. "
                        f"The system requires locking but doesn't support the ADT lock endpoint. "
                        f"Please use SAP GUI (SE24/SE80) to edit {object_name}."
                    )
                elif ('ExceptionResourceSaveFailure' in error_text
                        or 'bloke edildi' in error_text
                        or 'locked in request' in error_text):
                    # OLD-SYSTEM FALLBACK (proven live on FIP 2026-06-18).
                    # On older CTS the standard lock(corrNr) + R3TR pre-registration
                    # pre-locks the class includes (LIMU CPUB/METH) in the request as an
                    # E071K object-lock, which then blocks the source PUT ("bloke edildi").
                    # Recovery: release, re-lock WITHOUT corrNr (so no include lock is
                    # claimed at lock time), then PUT with corrNr as a QUERY PARAMETER —
                    # the PUT's corrNr does the transport recording. This writes+activates
                    # where the normal sequence 500s; create/lock/delete already work.
                    print(f"      [WARN] CTS include-lock on source-save (E071K).")
                    print(f"      [FALLBACK] Re-lock WITHOUT corrNr -> PUT with corrNr param (old-system path)...")
                    try:
                        if lock_handle and lock_handle != 'NO_LOCK_SUPPORT':
                            self.adt_client.unlock_object(object_url, lock_handle)
                            lock_handle = None
                    except Exception:
                        pass
                    fb_lock = self.adt_client.lock_object(
                        object_url, transport=None, allow_no_transport=True)
                    self.adt_client.set_object_source(
                        source_url, source_code, fb_lock, effective_transport,
                        prefer_param_transport=True)
                    lock_handle = fb_lock
                    result['source_uploaded'] = True
                    print(f"      [OK] Source uploaded via old-system fallback")
                else:
                    raise

            # Activate - unlock first because locks prevent activation
            print(f"\n[4/4] Activating object...")

            if lock_handle and lock_handle != 'NO_LOCK_SUPPORT':
                try:
                    # Only clear lock_handle if unlock CONFIRMED success. unlock_object
                    # now returns False (not a silent True) when all strategies fail —
                    # keeping the handle lets the finally block retry cleanup instead of
                    # leaving a leaked lock that the next push turns into a ghost transport.
                    if self.adt_client.unlock_object(object_url, lock_handle):
                        lock_handle = None
                        print(f"      [INFO] Unlocked for activation")
                    else:
                        print(f"      [WARNING] Pre-activation unlock not confirmed — keeping lock handle for cleanup")
                except Exception as unlock_err:
                    print(f"      [WARNING] Pre-activation unlock failed: {str(unlock_err)[:100]}")

            activation_result = self.adt_client.activate_object(object_name, object_url)
            if isinstance(activation_result, dict):
                if activation_result.get('success'):
                    result['activated'] = True
                    print(f"      [OK] Object activated")

                    # Active-version assertion (v1.4.7, ported from TRAKYA): activation
                    # returning success != object is active (a dependency inconsistency can
                    # leave it inactive). Assert adtcore:version="active" from metadata —
                    # cheap, surfaced as result['version_active'] for the caller to trust.
                    try:
                        import re as _vre
                        _md = self.get_object_metadata(object_name, object_type)
                        _m = _vre.search(r'adtcore:version="(\w+)"', _md or '')
                        result['version_active'] = (_m.group(1) == 'active') if _m else None
                        if result['version_active'] is False:
                            print(f"      [WARNING] adtcore:version={_m.group(1)} (expected 'active') — "
                                  f"activation reported OK but the object is NOT active.")
                    except Exception:
                        result['version_active'] = None

                    # Post-activation: verify active source matches what was uploaded.
                    # Bug 14 fix: must request version='active' explicitly.
                    # Without it, SAP returns the most recent version (= inactive) when an
                    # inactive version exists — so the comparison always passes even when
                    # activation failed, producing a false "[OK] Active source verified".
                    try:
                        import time
                        time.sleep(1)  # Brief delay for SAP to propagate activation
                        active_source = self.adt_client.get_object_source(object_url, return_etag=False, version='active')
                        # v1.4.8: refresh the drift baseline from the LIVE active source.
                        self.note_source_baseline(source_url, active_source)
                        # Normalize whitespace for comparison (SAP may reformat)
                        uploaded_norm = source_code.strip().replace('\r\n', '\n').replace('\r', '\n')
                        active_norm = active_source.strip().replace('\r\n', '\n').replace('\r', '\n')
                        if uploaded_norm == active_norm:
                            print(f"      [OK] Active source verified - matches uploaded content")
                        else:
                            # Retry once after another second (SAP caching/load balancer delay)
                            time.sleep(1)
                            active_source = self.adt_client.get_object_source(object_url, return_etag=False, version='active')
                            self.note_source_baseline(source_url, active_source)  # v1.4.8 refresh
                            active_norm = active_source.strip().replace('\r\n', '\n').replace('\r', '\n')
                            if uploaded_norm == active_norm:
                                print(f"      [OK] Active source verified (after brief delay)")
                            else:
                                print(f"      [WARNING] Active source differs from uploaded content!")
                                print(f"      [WARNING] This may be SAP pretty-printing or a stale class buffer")
                                print(f"      [HINT] If changes don't take effect, push manually via SE24/Eclipse ADT")
                                print(f"      [HINT] Or run transaction /$ABAP_BUFFER_RESET in SM04 to clear buffer")
                    except Exception as verify_err:
                        print(f"      [INFO] Post-activation verification skipped (could not read active source)")
                        if self.debug_enabled:
                            self._debug(f"[DEBUG] Post-activation verify failed: {str(verify_err)[:100]}")
                else:
                    errors = activation_result.get('errors', [])
                    warnings = activation_result.get('warnings', [])

                    if errors:
                        print(f"      [FAIL] Activation failed")
                        for e in errors[:5]:
                            print(f"             {e.get('message', '')}")

                        # Check for class-pool include-split failure:
                        # SAP's source/main splitter sometimes fails to update the method
                        # include when a new override is added — "Implementation missing" at
                        # activation even though GET /source/main returns the correct code.
                        if object_type.upper() in ('CLAS', 'CLASS'):
                            import re as _re
                            impl_missing = []
                            for _e in errors:
                                _msg = _e.get('message', '')
                                # SAP error patterns (EN/DE/TR): "Implementation missing for method X"
                                _m = _re.search(
                                    r'[Ii]mplementation\s+(?:missing|not\s+found)\s+for\s+method\s+"?([A-Z_a-z][A-Z_a-z0-9]*)"?',
                                    _msg
                                )
                                if _m:
                                    impl_missing.append(_m.group(1).upper())

                            if impl_missing:
                                print(f"\n      [FALLBACK] Include-split failure — affected methods: {', '.join(impl_missing)}")

                                # Option B.5: Try a second PUT to source/main first (cheap).
                                # The first PUT registers the method in class metadata (creates
                                # the CM0xx include slot); the second PUT can then populate it.
                                # Only attempt if we haven't already unlocked for activation.
                                double_put_success = False
                                print(f"      [FALLBACK B.5] Trying second source/main PUT (double-PUT heuristic)...")
                                try:
                                    fb_transport = effective_transport
                                    fb_lock2 = self.adt_client.lock_object(object_url, transport=transport)
                                    fb_eff2 = self.adt_client._last_lock_effective_transport or transport
                                    try:
                                        self.adt_client.set_object_source(source_url, source_code, fb_lock2, fb_eff2)
                                        self.adt_client.unlock_object(object_url, fb_lock2)
                                        fb_lock2 = None
                                        act_b5 = self.adt_client.activate_object(object_name, object_url)
                                        if isinstance(act_b5, dict) and act_b5.get('success'):
                                            result['activated'] = True
                                            double_put_success = True
                                            print(f"      [FALLBACK B.5] [OK] Double-PUT worked — object activated")
                                        else:
                                            print(f"      [FALLBACK B.5] Second PUT did not fix it — proceeding to method-include fallback")
                                    finally:
                                        if fb_lock2 and fb_lock2 != 'NO_LOCK_SUPPORT':
                                            try:
                                                self.adt_client.unlock_object(object_url, fb_lock2)
                                            except Exception:
                                                pass
                                except Exception as b5_err:
                                    print(f"      [FALLBACK B.5] Error: {str(b5_err)[:150]}")

                                # Option C: Method-include PUT fallback (if B.5 didn't work)
                                if not double_put_success:
                                    print(f"      [FALLBACK C] Trying method-include PUT fallback (ghost-transport guard active)...")
                                    fallback_ok = self._push_method_includes(
                                        object_url, object_name, source_code, impl_missing, transport
                                    )
                                    if fallback_ok:
                                        print(f"\n      [RETRY] Retrying activation after method-include fallback...")
                                        activation_result2 = self.adt_client.activate_object(object_name, object_url)
                                        if isinstance(activation_result2, dict) and activation_result2.get('success'):
                                            result['activated'] = True
                                            print(f"      [OK] Object activated (method-include fallback succeeded)")
                                        else:
                                            print(f"      [FAIL] Activation still failed after fallback.")
                                            print(f"      [INFO] Activate manually in Eclipse ADT (Ctrl+F3) or SE24.")
                                    else:
                                        print(f"      [FALLBACK C] No method includes updated — cannot retry activation.")
                                        print(f"      [INFO] Activate manually in Eclipse ADT (Ctrl+F3) or SE24.")

                    elif warnings:
                        print(f"      [WARNING] Activation had issues")
                        for w in warnings[:3]:
                            print(f"             {w.get('message', '')}")
                    else:
                        print(f"      [FAIL] Activation failed (no details from SAP)")

                    if not result['activated']:
                        print(f"      [INFO] Source uploaded but not activated - please fix errors and activate manually")
            elif isinstance(activation_result, bool):
                if activation_result:
                    result['activated'] = True
                    print(f"      [OK] Object activated")
                else:
                    print(f"      [WARNING] Activation failed (manual activation may be required)")

            result['success'] = result['source_uploaded'] and result['activated']

            print(f"\n{'=' * 70}")
            if result['success']:
                print(f"  [OK] Push Complete")
            else:
                print(f"  [WARNING] Push Incomplete - source uploaded but activation failed")
            print(f"{'=' * 70}")
            return result

        except Exception as e:
            from sap_adt_lib import SAPLockError
            error_str = str(e)
            result['error'] = error_str
            result['error_type'] = type(e).__name__
            print(f"\n[ERROR] {error_str}")

            if isinstance(e, SAPLockError) and getattr(e, 'status_code', None) == 409:
                try:
                    ghosts = self.adt_client.find_ghost_transports()
                    if ghosts:
                        print(f"\n[WARNING] The following ghost transports were likely created by this failed push:")
                        for t in ghosts:
                            print(f"  {t} — delete in SE10")
                        print(f"[HINT] Open SE10, select each transport above and delete it")
                except Exception:
                    pass

            if 'NTT_ABAP3' in error_str or 'zaten' in error_str or 'already editing' in error_str:
                print(f"\n[INFO] This appears to be a stale lock from your own session.")
                print(f"[INFO] Source was uploaded successfully.")
                print(f"[INFO] To activate: Use SAP GUI (SE24/SE80) or transaction SE80")
                print(f"[INFO] You can also use SM12 to release the enqueue lock if needed")

            return result

        finally:
            # Always unlock (but only if still locked).
            # unlock_object() now returns False (instead of a silent True) when every
            # unlock strategy fails, so we honour the return value AND catch exceptions.
            # A lock reported as released when it actually leaked is the root cause of
            # the next push hitting the 409 / stale-lock path and spawning a ghost
            # transport — so we report lock_released honestly here.
            if lock_handle and lock_handle != 'NO_LOCK_SUPPORT':
                import time
                unlocked = False
                for attempt in range(2):
                    try:
                        if attempt == 0:
                            print(f"\n[CLEANUP] Unlocking object...")
                        else:
                            print(f"          [RETRY] Retrying unlock...")
                        if self.adt_client.unlock_object(object_url, lock_handle):
                            unlocked = True
                            print(f"          [OK] Object unlocked")
                            break
                        # Returned False: all strategies failed this attempt
                        if attempt == 0:
                            time.sleep(1)
                    except Exception as e:
                        if attempt == 0:
                            time.sleep(1)
                        else:
                            print(f"          [WARNING] Unlock raised: {str(e)[:100]}")
                if not unlocked:
                    result['lock_released'] = False
                    print(f"          [WARNING] Unlock not confirmed - lock may remain. Release via SM12 before re-pushing.")
                    print(f"          [WARNING] Re-pushing on top of a stale lock can spawn a ghost transport.")

    def create_object(self, object_type: str, name: str, package: str,
                     description: str, transport: Optional[str] = None) -> Optional[str]:
        """
        Create new ABAP object

        Args:
            object_type: Type ('class', 'interface', 'program', etc.)
            name: Object name
            package: Package name
            description: Object description
            transport: Transport request (optional)

        Returns:
            Object URL if successful, None otherwise
        """
        if not supports_creation(object_type):
            print(f"[ERROR] Object type '{object_type}' cannot be created via generic API. "
                  f"Use a dedicated creation method (e.g., create_function_module for function modules).")
            return None

        # Guardrails: customer-namespace only + read-only mode check (bypass-free).
        from guardrails import require_writable, require_customer_namespace, GuardrailViolation
        try:
            require_writable(what=f"create {object_type}")
            require_customer_namespace(name, what=object_type)
        except GuardrailViolation as gv:
            print(f"\n[BLOCKED] {gv}")
            return None

        adt_type = get_adt_type(object_type)
        type_desc = get_type_description(object_type)

        print(f"\n{'=' * 70}")
        print(f"  Creating {type_desc}: {name}")
        print(f"{'=' * 70}")
        print(f"  Package: {package}")
        print(f"  Description: {description}")
        if transport:
            print(f"  Transport: {transport}")
        print(f"{'=' * 70}\n")

        # Get package path
        package_path = f"/sap/bc/adt/packages/{package.lower()}"

        try:
            result = self.adt_client.create_object(
                obj_type=adt_type,
                name=name.upper(),
                package_name=package,
                description=description,
                package_path=package_path,
                transport=transport
            )

            if result.get('success'):
                object_url = result.get('url')
                print(f"\n[OK] Object created successfully")
                print(f"     URL: {object_url}")
                return object_url
            else:
                print(f"\n[ERROR] {result.get('message')}")
                return None

        except Exception as e:
            print(f"\n[ERROR] {str(e)}")
            return None

    def delete_object(self, object_name: str, object_type: str = 'class',
                     transport: Optional[str] = None, confirm: bool = True) -> bool:
        """
        Delete ABAP object

        Args:
            object_name: Name of the object
            object_type: Type of object
            transport: Transport request (optional)
            confirm: Ask for confirmation (default: True)

        Returns:
            True if successful, False otherwise
        """
        type_desc = get_type_description(object_type)
        object_url = get_object_url(object_name, object_type)

        # Guardrails: never delete a standard object + honor read-only mode.
        from guardrails import require_writable, reject_standard_delete, GuardrailViolation
        try:
            require_writable(what=f"delete {object_type}")
            reject_standard_delete(object_name)
        except GuardrailViolation as gv:
            print(f"\n[BLOCKED] {gv}")
            return False

        if self.debug_enabled:
            self._debug(f"[DEBUG] delete_object - name: {object_name}, type: {object_type}, url: {object_url}")
            self._debug(f"[DEBUG] delete_object - transport: {transport}, confirm: {confirm}")

        if confirm:
            try:
                response = input(f"\n[WARNING] Delete {type_desc} '{object_name}'? (yes/no): ")
            except EOFError:
                response = ''
            if response.lower() != 'yes':
                print("Deletion cancelled (no confirmation)")
                return False

        # v1.4.0: session-pinned transport fallback (set via adt_set_transport).
        if not transport and getattr(self, 'session_transport', None):
            transport = self.session_transport
            print(f"      [INFO] No transport specified — using session-pinned transport {transport}.")

        lock_handle = None
        try:
            print(f"\n[1/2] Locking object...")
            print(f"      corrNr (transport passed to lock): {transport or '[NONE — ghost transport risk!]'}")
            if self.debug_enabled:
                self._debug(f"[DEBUG] delete_object - locking {object_url}")

            lock_handle = self.adt_client.lock_object(object_url, transport=transport)
            if lock_handle == 'NO_LOCK_SUPPORT':
                print("      Lock not supported; continuing without explicit lock.")
                if self.debug_enabled:
                    self._debug("[DEBUG] delete_object - lock not supported, continuing without lock")
                lock_handle = None  # Don't try to unlock 'NO_LOCK_SUPPORT'
            else:
                print(f"      Lock handle: {lock_handle[:50]}...")
                if self.debug_enabled:
                    self._debug(f"[DEBUG] delete_object - lock handle: {lock_handle[:50]}")

            # GHOST-IMMINENT GUARD on DELETE (v1.3.4) — same failure mode as push: if a
            # transport was requested but the lock returned NO CORRNR, SAP cannot record
            # the deletion into it and will auto-generate a ghost ("Generated Request for
            # Change Recording") to hold the deletion entry. Abort BEFORE the DELETE.
            # Escape hatch: ABAP_ALLOW_NO_CORRNR=true (systems that never echo CORRNR).
            import os as _os
            _allow_no_corrnr = _os.environ.get('ABAP_ALLOW_NO_CORRNR', '').lower() in ('1', 'true', 'yes')
            if (transport and lock_handle and not self.adt_client._last_lock_corrnr
                    and not _allow_no_corrnr):
                print(f"\n[ABORT - GHOST PREVENTED] SAP did not assign {object_name} to transport "
                      f"{transport} (lock returned no CORRNR). Deleting now would record the "
                      f"deletion into an auto-generated ghost, not {transport}.")
                print(f"[ABORT] Fix: include {object_name.upper()} in {transport} (SE09 -> Include "
                      f"Objects) or pass the transport that actually owns it, then retry. "
                      f"Nothing was deleted; the lock has been released.")
                try:
                    self.adt_client.unlock_object(object_url, lock_handle)
                except Exception:
                    print("[WARNING] Could not release lock — clear it via adt_clear_lock/SM12.")
                return False

            print(f"\n[2/2] Deleting object...")
            if self.debug_enabled:
                self._debug(f"[DEBUG] delete_object - calling adt_client.delete_object")

            self.adt_client.delete_object(object_url, lock_handle, transport)
            print(f"\n[OK] Object deleted successfully")

            # Delete local file if exists
            from object_types import get_local_subdir
            subdir = get_local_subdir(object_type)
            package_base = self.local_base.parent
            local_file = package_base / subdir / f"{object_name}.abap"

            if self.debug_enabled:
                self._debug(f"[DEBUG] delete_object - checking for local file: {local_file}")

            if local_file.exists():
                local_file.unlink()
                print(f"     Local file deleted: {local_file}")
                if self.debug_enabled:
                    self._debug(f"[DEBUG] delete_object - local file deleted")
            else:
                if self.debug_enabled:
                    self._debug(f"[DEBUG] delete_object - local file not found (may not exist locally)")

            return True

        except Exception as e:
            print(f"\n[ERROR] {str(e)}")
            if self.debug_enabled:
                self._debug(f"[DEBUG] delete_object - exception: {str(e)}")
            return False

        finally:
            if lock_handle:
                try:
                    if self.debug_enabled:
                        self._debug(f"[DEBUG] delete_object - unlocking object")
                    self.adt_client.unlock_object(object_url, lock_handle)
                    print("     Object unlocked")
                except Exception as e:
                    if self.debug_enabled:
                        self._debug(f"[DEBUG] delete_object - unlock failed: {str(e)}")
                    print(f"     [WARNING] Unlock failed: {str(e)}")

    # ===== Search and Discovery =====

    def search_objects(self, query: str, max_results: int = 50, obj_type: Optional[str] = None,
                       debug_context: Optional[str] = None) -> List[Dict[str, str]]:
        """
        Search for ABAP objects

        Args:
            query: Search query (supports wildcards like 'ZAI*')
            max_results: Maximum number of results
            obj_type: Optional object type filter (e.g., 'INTF', 'CLAS', 'PROG')
            debug_context: Optional context label for debug output

        Returns:
            List of objects with name, type, uri, description

        Note:
            Implements auto-workaround for SAP ADT quickSearch limitation:
            - Specific patterns (e.g., "ZAI*") + type filter may return no results
            - Automatically retries with broader pattern (e.g., "Z*") + filters client-side
        """
        if debug_context:
            self._debug(f"[DEBUG] search_objects context: {debug_context}")
        print(f"Searching for: {query}")
        print(f"Max results: {max_results}\n")

        # Store original query for potential workaround
        original_query = query
        original_type = obj_type
        workaround_used = False

        result_xml = self.adt_client.search_objects(query, max_results=max_results)

        filter_type = obj_type.strip().upper() if obj_type else None
        filter_short = filter_type.split('/')[0] if filter_type else None

        if filter_type:
            self._debug(f"[DEBUG] search_objects filter: {filter_type} (short: {filter_short})")

        # Parse XML
        root = ET.fromstring(result_xml)
        namespaces = {'adtcore': 'http://www.sap.com/adt/core'}

        objects = []
        for obj in root.findall('.//adtcore:objectReference', namespaces):
            name = obj.get('{http://www.sap.com/adt/core}name')
            obj_type_value = obj.get('{http://www.sap.com/adt/core}type')
            uri = obj.get('{http://www.sap.com/adt/core}uri')
            description = obj.get('{http://www.sap.com/adt/core}description', '')

            if name:
                if filter_type:
                    obj_type_upper = obj_type_value.upper() if obj_type_value else ''
                    obj_short = obj_type_upper.split('/')[0] if obj_type_upper else ''
                    if not (filter_type == obj_type_upper or filter_short == obj_short):
                        continue
                objects.append({
                    'name': name,
                    'type': obj_type_value or '',
                    'uri': uri or '',
                    'description': description
                })

        # Auto-workaround: If no results with specific pattern + type filter, retry with broader pattern
        # This handles SAP ADT quickSearch limitation where "ZAI*" + type="INTF" returns no results
        if not objects and filter_type and '*' in original_query and len(original_query) > 2:
            # Extract the prefix character for broader search (e.g., "Z" from "ZAI*")
            broader_query = original_query[0] + '*'
            # Use a more aggressive multiplier for broader search to ensure we find the objects
            # Minimum 500 results or 10x original, whichever is larger
            max_results_retry = max(500, max_results * 10)

            self._debug(f"[DEBUG] No results with '{original_query}' + type='{filter_type}'")
            self._debug(f"[DEBUG] Retrying with broader pattern '{broader_query}' (auto-workaround)")

            print(f"[INFO] No results found with specific pattern + type filter")
            print(f"[INFO] Retrying with broader pattern: {broader_query}\n")

            # Retry with broader pattern
            result_xml = self.adt_client.search_objects(broader_query, max_results=max_results_retry)

            # Parse broader results
            root = ET.fromstring(result_xml)
            for obj in root.findall('.//adtcore:objectReference', namespaces):
                name = obj.get('{http://www.sap.com/adt/core}name')
                obj_type_value = obj.get('{http://www.sap.com/adt/core}type')
                uri = obj.get('{http://www.sap.com/adt/core}uri')
                description = obj.get('{http://www.sap.com/adt/core}description', '')

                if name:
                    if filter_type:
                        obj_type_upper = obj_type_value.upper() if obj_type_value else ''
                        obj_short = obj_type_upper.split('/')[0] if obj_type_upper else ''
                        if not (filter_type == obj_type_upper or filter_short == obj_short):
                            continue

                    # Client-side filter: only include names matching original pattern
                    # Convert wildcard pattern to prefix match (e.g., "ZAI*" -> startswith("ZAI"))
                    if '*' in original_query:
                        prefix = original_query.replace('*', '').upper()
                        if name.upper().startswith(prefix):
                            objects.append({
                                'name': name,
                                'type': obj_type_value or '',
                                'uri': uri or '',
                                'description': description
                            })

            workaround_used = True

        if not objects:
            print("No results found.\n")
        else:
            if workaround_used:
                print(f"[INFO] Auto-workaround used: searched with broader pattern and filtered results\n")

            print(f"{'=' * 80}")
            print(f"  Search Results: {len(objects)} objects found")
            print(f"{'=' * 80}\n")

            for obj in objects[:20]:  # Show first 20
                type_short = obj['type'].split('/')[0] if '/' in obj['type'] else obj['type']
                desc = f" - {obj['description']}" if obj['description'] else ""
                print(f"  [{type_short:4}] {obj['name']}{desc}")

            if len(objects) > 20:
                print(f"\n  ... and {len(objects) - 20} more")

            print(f"\n{'=' * 80}")

        return objects

    def code_search(self, query: str, max_results: int = 50) -> Dict[str, Any]:
        """
        Full-text search of ABAP source CODE (statements/string literals),
        system-wide.

        Unlike search_objects (which matches OBJECT NAMES via quickSearch), this
        searches INSIDE source code for the given text — e.g. finding every place a
        literal string, field name, or statement appears, regardless of what the
        containing object is named. READ-ONLY.

        Args:
            query: Search string
            max_results: Maximum number of matches to return

        Returns:
            Dict: {ok, count, results:[{uri, name, type, description, line?, snippet?}...]}
            On systems/releases where textSearch is unavailable (401/403/404/500/501),
            returns {ok: False, error: 'text_search_unavailable', status_code, message}
            with a hint to use search_objects instead, instead of raising.
        """
        from sap_adt_lib import SAPADTError, classify_text_search_error

        print(f"\nSearching source code for: {query}")

        try:
            raw = self.adt_client.code_search(query, max_results=max_results)
        except SAPADTError as e:
            status = e.status_code
            if status in (401, 403, 404, 500, 501):
                reason = classify_text_search_error(status)
                print(f"[INFO] Source code search not available: {reason}")
                return {
                    'ok': False,
                    'error': 'text_search_unavailable',
                    'status_code': status,
                    'message': reason,
                }
            print(f"[ERROR] Source code search failed: {str(e)}")
            raise
        except Exception as e:
            print(f"[ERROR] Source code search failed: {str(e)}")
            raise

        flattened = []
        for ref in raw.get('results', []):
            matches = ref.get('matches') or []
            base = {
                'uri': ref.get('uri', ''),
                'name': ref.get('name', ''),
                'type': ref.get('type', ''),
                'description': ref.get('description', ''),
            }
            if matches:
                for m in matches:
                    flattened.append({**base, 'line': m.get('line', 0), 'snippet': m.get('snippet', '')})
            else:
                flattened.append(base)

        if flattened:
            print(f"Found {len(flattened)} match(es)")
        else:
            print("No matches found.")

        return {'ok': True, 'count': len(flattened), 'results': flattened}

    def list_package_contents(self, package_name: str) -> List[Dict[str, str]]:
        """
        List all objects in a package

        Args:
            package_name: Package name

        Returns:
            List of objects
        """
        print(f"Fetching contents of package: {package_name}\n")
        if self.debug_enabled:
            self._debug(f"[DEBUG] list_package_contents local_base: {self.local_base}")

        try:
            result_xml = self.adt_client.get_package_contents(package_name)

            if self.debug_enabled:
                # Log full XML for complete diagnostics
                xml_preview = result_xml[:2000] if len(result_xml) > 2000 else result_xml
                self._debug(f"[DEBUG] get_package_contents XML length: {len(result_xml)} chars")
                self._debug(f"[DEBUG] get_package_contents XML preview (first 2000 chars): {xml_preview}")
                if len(result_xml) > 2000:
                    self._debug(f"[DEBUG] get_package_contents XML truncated (showing first 2000 of {len(result_xml)} chars)")

            # Parse XML - SAP returns ABAP XML format with SEU_ADT_REPOSITORY_OBJ_NODE
            root = ET.fromstring(result_xml)

            # Try multiple parsing strategies for different SAP response formats
            objects = []

            # Strategy 1: Standard ADT format (adtcore:objectReference)
            namespaces = {'adtcore': 'http://www.sap.com/adt/core'}
            for obj in root.findall('.//adtcore:objectReference', namespaces):
                name = obj.get('{http://www.sap.com/adt/core}name')
                obj_type = obj.get('{http://www.sap.com/adt/core}type')
                uri = obj.get('{http://www.sap.com/adt/core}uri')
                description = obj.get('{http://www.sap.com/adt/core}description', '')

                if name:
                    objects.append({
                        'name': name,
                        'type': obj_type or '',
                        'uri': uri or '',
                        'description': description
                    })

            # Strategy 2: ABAP XML format (SEU_ADT_REPOSITORY_OBJ_NODE)
            # The XML may or may not have namespace prefixes on child elements
            if not objects:
                # Iterate all elements to find SEU_ADT_REPOSITORY_OBJ_NODE regardless of namespace
                for node in root.iter():
                    if 'SEU_ADT_REPOSITORY_OBJ_NODE' in node.tag:
                        obj_type = obj_name = tech_name = description = ''

                        for child in node:
                            # Strip namespace from tag name
                            tag = child.tag.split('}')[-1] if '}' in child.tag else child.tag
                            text = child.text if child.text else ''

                            if tag == 'OBJECT_TYPE':
                                obj_type = text
                            elif tag == 'OBJECT_NAME':
                                obj_name = text
                            elif tag == 'TECH_NAME':
                                tech_name = text
                            elif tag == 'DESCRIPTION':
                                description = text

                        # Use OBJECT_NAME if present, otherwise TECH_NAME
                        name = obj_name or tech_name

                        # Skip container/category types - these are tree structure nodes, not actual objects
                        # DEVC/Q*, DEVC/N, DEVC/K (packages), etc. are structural
                        # We want actual object types like CLAS/OC, INTF/OI, DTEL/DE, etc.
                        skip_types = ['DEVC/Q', 'DEVC/N', 'DEVC/K', 'DEVC/DA', 'DEVC/DD', 'DEVC/DE',
                                     'DEVC/DL', 'DEVC/DS', 'DEVC/DT', 'DEVC/OC', 'DEVC/OI', 'DEVC/WO']
                        should_skip = any(obj_type.startswith(skip) for skip in skip_types)

                        if name and obj_type and not should_skip:
                            objects.append({
                                'name': name,
                                'type': obj_type,
                                'uri': f'/sap/bc/adt/{obj_type.lower().replace("/", "/")}s/{name.lower()}',
                                'description': description
                            })

            if self.debug_enabled:
                self._debug(f"[DEBUG] Parsed {len(objects)} objects from XML")

            if not objects:
                print(f"No objects found via nodestructure endpoint, trying search fallback...")
                raise Exception("No objects found")

        except Exception as e:
            # Fallback: Use search if nodestructure fails
            # (common issue: missing S_ADT_RES authorizations or inactive ICF services)
            if self.debug_enabled:
                self._debug(f"[DEBUG] nodestructure failed: {e}")
            print(f"Note: nodestructure endpoint failed ({str(e)}), using search as fallback")
            print(f"This is usually due to missing SAP authorizations (S_ADT_RES for /sap/bc/adt/repository/*)\n")

            # Search with multiple patterns to catch all objects in package
            # Objects in ZAI package may use different prefixes: ZAI*, Z_*, etc.
            search_patterns = [
                f'{package_name}*',  # Standard naming: ZAI*
                f'{package_name[0]}_*',  # Single letter prefix: Z_*
                f'{package_name[:2]}*',  # Two letter prefix: ZA* (if applicable)
            ]

            # Remove duplicates while preserving order
            seen = set()
            unique_patterns = [p for p in search_patterns if p not in seen and not seen.add(p)]

            all_objects = {}
            for pattern in unique_patterns:
                pattern_objects = self.search_objects(
                    pattern,
                    max_results=500,
                    debug_context=f"list_package_contents fallback for {package_name}"
                )
                for obj in pattern_objects:
                    # Deduplicate by name
                    name = obj.get('name', '')
                    if name and name not in all_objects:
                        all_objects[name] = obj

            objects = list(all_objects.values())

        # Group by type
        by_type = {}
        for obj in objects:
            obj_type = obj['type'].split('/')[0] if '/' in obj['type'] else obj['type']
            if obj_type not in by_type:
                by_type[obj_type] = []
            by_type[obj_type].append(obj)

        print("=" * 80)
        print(f"Package: {package_name}")
        print("=" * 80)
        print()

        for obj_type, items in sorted(by_type.items()):
            print(f"\n{obj_type} ({len(items)} objects):")
            print("-" * 80)
            for item in sorted(items, key=lambda x: x['name']):
                desc = f" - {item['description']}" if item['description'] else ""
                print(f"  {item['name']}{desc}")

        print()
        print("=" * 80)
        print(f"Total: {len(objects)} objects")
        print("=" * 80)

        return objects

    # ===== Code Quality Operations =====

    def syntax_check(self, object_name: str, object_type: str = 'class') -> Dict[str, Any]:
        """
        Check syntax of ABAP code without activating.

        Uses the SAP ADT activation endpoint in pre-audit mode, which performs
        syntax check without actually activating the object.

        Args:
            object_name: Name of the object
            object_type: Type of object

        Returns:
            Dict with 'valid' (bool), 'errors' (list), 'warnings' (list)

        Note:
            Unlike the old syntax_check which required a local file, this method
            checks the syntax of the object as it exists in SAP's inactive version.
            If you want to check source before pushing, first push it (without activating)
            then run this check.
        """
        object_url = get_object_url(object_name, object_type)
        type_desc = get_type_description(object_type)

        print(f"Checking syntax: {object_name} ({type_desc})")

        try:
            # Use activation pre-audit to check syntax without activating
            result = self.adt_client.syntax_check_via_activation(object_name, object_url)

            if result.get('valid'):
                print("[OK] Syntax check passed")

                # Show warnings if any
                warnings = result.get('warnings', [])
                if warnings:
                    print(f"\nWarnings ({len(warnings)}):")
                    for w in warnings[:10]:
                        msg = w.get('message', '')
                        obj = w.get('object', '')
                        line = w.get('line', '')
                        if obj:
                            print(f"  Line {line}: {msg} ({obj})")
                        else:
                            print(f"  - {msg}")
                    if len(warnings) > 10:
                        print(f"  ... and {len(warnings) - 10} more warnings")
            else:
                print("[FAIL] Syntax errors found:")
                errors = result.get('errors', [])
                for e in errors[:10]:
                    msg = e.get('message', '')
                    obj = e.get('object', '')
                    line = e.get('line', '')
                    if obj:
                        print(f"  Line {line}: {msg}")
                        if obj:
                            print(f"           Object: {obj}")
                    else:
                        print(f"  - {msg}")
                if len(errors) > 10:
                    print(f"  ... and {len(errors) - 10} more errors")

            return result

        except Exception as e:
            return {'valid': False, 'error': str(e)}

    def activate_object(self, object_name: str, object_type: str = 'class') -> bool:
        """
        Activate ABAP object (retry after failed push)

        Args:
            object_name: Name of the object
            object_type: Type of object

        Returns:
            True if successful, False otherwise
        """
        object_url = get_object_url(object_name, object_type)
        type_desc = get_type_description(object_type)

        print(f"\nActivating {type_desc}: {object_name}")

        try:
            result = self.adt_client.activate_object(object_name, object_url)

            if isinstance(result, dict):
                if result.get('success'):
                    print(f"[OK] Object activated successfully")

                    # Show warnings if any
                    warnings = result.get('warnings', [])
                    if warnings:
                        print(f"\nWarnings ({len(warnings)}):")
                        for w in warnings[:10]:  # Show first 10 warnings
                            msg = w.get('message', '')
                            obj = w.get('object', '')
                            line = w.get('line', '')
                            if obj:
                                print(f"  - {msg} ({obj} line {line})")
                            else:
                                print(f"  - {msg}")
                        if len(warnings) > 10:
                            print(f"  ... and {len(warnings) - 10} more warnings")

                    return True

                # Activation failed - show errors
                errors = result.get('errors', [])
                warnings = result.get('warnings', [])

                print(f"[FAIL] Activation failed")

                if result.get('http_error'):
                    print(f"  Reason: HTTP {result['http_error']}")
                elif not result.get('activation_executed') and not result.get('check_executed') and result.get('errors'):
                    print(f"  Reason: Activation blocked (see errors below)")
                elif result.get('check_executed') and result.get('errors'):
                    print(f"  Reason: Syntax errors prevent activation")
                elif result.get('errors'):
                    print(f"  Reason: Errors during activation")

                if errors:
                    print(f"\nErrors ({len(errors)}):")
                    for e in errors[:10]:  # Show first 10 errors
                        msg = e.get('message', '')
                        obj = e.get('object', '')
                        line = e.get('line', '')
                        href = e.get('href', '')
                        if obj:
                            print(f"  Line {line}: {msg}")
                            if obj:
                                print(f"           Object: {obj}")
                        else:
                            print(f"  - {msg}")
                    if len(errors) > 10:
                        print(f"  ... and {len(errors) - 10} more errors")

                if warnings:
                    print(f"\nWarnings ({len(warnings)}):")
                    for w in warnings[:5]:
                        msg = w.get('message', '')
                        obj = w.get('object', '')
                        line = w.get('line', '')
                        if obj:
                            print(f"  Line {line}: {msg} ({obj})")
                        else:
                            print(f"  - {msg}")
                    if len(warnings) > 5:
                        print(f"  ... and {len(warnings) - 5} more warnings")

                return False

            # Fallback for old boolean return type
            if isinstance(result, bool):
                if result:
                    print(f"[OK] Object activated successfully")
                    return True
                print(f"[FAIL] Activation failed")
                return False

        except Exception as e:
            print(f"[ERROR] {str(e)}")
            return False

    def get_object_metadata(self, object_name: str, object_type: str = 'class') -> Optional[str]:
        """
        Get object structure and metadata (token-efficient - no full source)

        Args:
            object_name: Name of the object
            object_type: Type of object

        Returns:
            XML metadata string
        """
        object_url = get_object_url(object_name, object_type)

        try:
            metadata = self.adt_client.get_object_structure(object_url)
            print(f"Metadata for {object_name}:")
            print(metadata[:500])  # Show first 500 chars
            return metadata
        except Exception as e:
            print(f"[ERROR] {str(e)}")
            return None

    # ===== Transport Operations =====

    def list_user_transports(self, user: Optional[str] = None) -> List[Dict[str, str]]:
        """
        List user's transport requests

        Args:
            user: User name (optional, defaults to current user)

        Returns:
            List of transports
        """
        ns_uri = 'http://www.sap.com/cts/adt/tm'
        transports = []
        seen = set()
        # GHOST-TRANSPORT FIX (v1.2.30): this endpoint's tree is SPLIT — requestStatus=D
        # returns the MODIFIABLE branch, no filter returns the RELEASED branch (see
        # get_transport_info). The old code fetched only the released branch, so
        # adt_list_transports came back empty for modifiable transports — the agent then
        # could not see/reuse an OPEN request and pushed against a released one, and SAP
        # auto-created a "Generated Request for Change Recording" ghost. Fetch the
        # MODIFIABLE branch first (the ones you can actually push to), then released.
        for modifiable_only, default_status in ((True, 'D'), (False, 'R')):
            try:
                xml = self.adt_client.user_transports(user, modifiable_only=modifiable_only)
                root = ET.fromstring(xml)
            except Exception as e:
                if modifiable_only:
                    # ADT endpoint failed for the modifiable branch — fall back to E070.
                    try:
                        xml = self.adt_client.user_transports_from_table(user, status_filter='D')
                        root = ET.fromstring(xml)
                    except Exception:
                        continue
                else:
                    continue
            for tr in root.findall('.//{%s}request' % ns_uri):
                transport_id = tr.get('{%s}number' % ns_uri)
                if not transport_id or transport_id in seen:
                    continue
                seen.add(transport_id)
                transports.append({
                    'number': transport_id,
                    'description': tr.get('{%s}desc' % ns_uri, ''),
                    'status': tr.get('{%s}status' % ns_uri) or default_status,
                })

        print(f"\nUser transports ({len(transports)} found):")
        print("=" * 80)
        for tr in transports:
            print(f"  {tr['number']} - {tr['description']} [{tr['status']}]")
        print("=" * 80)
        return transports

    def create_transport(self, description: str, package_name: str) -> Optional[str]:
        """
        Create new transport request

        Args:
            description: Transport description
            package_name: Package name

        Returns:
            Transport number if successful, None otherwise
        """
        try:
            result = self.adt_client.create_transport(description, package_name)

            if result.get('success'):
                transport_num = result.get('transport')
                print(f"[OK] Transport created: {transport_num}")
                return transport_num
            else:
                print(f"[ERROR] {result.get('message')}")
                return None

        except Exception as e:
            print(f"[ERROR] {str(e)}")
            return None

    def get_transport_info(self, transport: str) -> Optional[Dict[str, str]]:
        """Look up a transport's owner/status/description from the ADT transport list.

        The /cts/transportrequests list returns all modifiable + released requests
        visible to the user, each carrying owner/status/desc — so for a destructive
        delete we read ownership + status straight from there (the E070 freestyle-SQL
        path is restricted on some systems). Returns {number, owner, status,
        description} or None if the transport is not found/visible.
        """
        trkorr = (transport or '').upper()
        if not trkorr:
            return None
        ns_uri = 'http://www.sap.com/cts/adt/tm'
        # On this endpoint the tree is split: requestStatus=D returns the MODIFIABLE
        # branch, no filter returns the RELEASED branch. Search modifiable first (the
        # delete target), then released (so a released transport is correctly reported
        # as not-modifiable rather than not-found).
        for modifiable_only in (True, False):
            try:
                xml = self.adt_client.user_transports(modifiable_only=modifiable_only)
                root = ET.fromstring(xml)
            except Exception:
                continue
            for el in root.iter():  # requests AND tasks both carry tm:number/owner/status/desc
                num = el.get('{%s}number' % ns_uri)
                if num and num.upper() == trkorr:
                    return {
                        'number': num,
                        'owner': (el.get('{%s}owner' % ns_uri) or ''),
                        'status': (el.get('{%s}status' % ns_uri) or ''),
                        'description': (el.get('{%s}desc' % ns_uri) or ''),
                    }
        return None

    def find_object_transports(self, object_name: str) -> Dict[str, Dict[str, Any]]:
        """Find every transport that holds an object or its includes (read-only).

        Scans the transport-organizer tree (modifiable + released) for all CTS entries
        whose owning object is `object_name` — i.e. the R3TR entry AND the LIMU includes
        (CLSD/CPUB/CPRO/CPRI/METH, whose tm:name is "CLASS" or "CLASS  METHOD"). Used to
        DETECT scatter: if a class's includes are spread across more than one modifiable
        request, a push is about to (or already did) fragment it.

        Returns {request_number: {status, owner, objects: [{pgmid, type, name}]}}.
        """
        target = (object_name or '').upper()
        if not target:
            return {}
        TM = 'http://www.sap.com/cts/adt/tm'
        found: Dict[str, Dict[str, Any]] = {}
        for modifiable_only in (True, False):
            try:
                xml = self.adt_client.user_transports(modifiable_only=modifiable_only)
                root = ET.fromstring(xml)
            except Exception:
                continue
            for req in root.iter('{%s}request' % TM):
                num = req.get('{%s}number' % TM)
                if not num:
                    continue
                matches = []
                for o in req.findall('.//{%s}abap_object' % TM):
                    nm = (o.get('{%s}name' % TM) or '')
                    # tm:name is "CLASS" (section) or "CLASS  METHOD" — first token = class.
                    if nm.upper().split()[:1] == [target]:
                        matches.append({
                            'pgmid': o.get('{%s}pgmid' % TM),
                            'type': o.get('{%s}type' % TM),
                            'name': nm,
                        })
                if matches:
                    rec = found.setdefault(num, {
                        'status': req.get('{%s}status' % TM),
                        'owner': req.get('{%s}owner' % TM),
                        'objects': [],
                    })
                    rec['objects'].extend(matches)
        return found

    def check_object_scatter(self, object_name: str) -> Dict[str, Any]:
        """Summarize scatter for an object. {scattered, modifiable_requests, requests}.

        scattered = the object's includes appear in MORE THAN ONE modifiable request.
        """
        found = self.find_object_transports(object_name)
        modifiable = [num for num, r in found.items()
                      if str(r.get('status', '')).upper() in ('D', 'L')]
        return {
            'scattered': len(modifiable) > 1,
            'modifiable_requests': sorted(modifiable),
            'requests': found,
        }

    def delete_transport(self, transport: str, confirm_transport: Optional[str] = None,
                         force: bool = False) -> Dict[str, Any]:
        """Delete a MODIFIABLE transport that the current user OWNS, behind a double check.

        This is destructive. Two independent confirmations are required, plus safety
        pre-checks; either side failing is a no-op:
          1. Guardrail: refused when ADT_READONLY is set.
          2. Ownership: the transport's E070 owner (AS4USER) must equal the logon user.
             Foreign transports are refused (deleting someone else's request is wrong).
          3. Status: must be MODIFIABLE (TRSTATUS D or L). Released (R/N/O) is refused.
          4. Double-check confirmation: confirm_transport must equal transport AND
             force must be True. If not, returns {error:'confirmation_required'} with a
             preview of what WOULD be deleted (no deletion performed).

        Returns {ok, deleted?, transport, details?, error?, message}.
        """
        trkorr = (transport or '').upper()
        if not trkorr:
            return {'ok': False, 'error': 'bad_request', 'message': 'transport is required'}

        # 1) Read-only guardrail
        try:
            from guardrails import require_writable, GuardrailViolation
            try:
                require_writable(what="delete transport")
            except GuardrailViolation as gv:
                return {'ok': False, 'error': 'guardrail_violation', 'message': str(gv)}
        except ImportError:
            pass  # guardrails optional; SAP still enforces server-side rules

        # 2+3) Ownership + status pre-check (deterministic via E070)
        try:
            info = self.get_transport_info(trkorr)
        except Exception as e:
            return {'ok': False, 'error': 'lookup_failed',
                    'message': f'Could not verify transport {trkorr}: {e}'}
        if info is None:
            return {'ok': False, 'error': 'not_found',
                    'message': f'Transport {trkorr} does not exist.'}

        logon_user = (self.adt_client.user or '').upper()
        owner = (info.get('owner') or '').upper()
        status = (info.get('status') or '').upper()
        if owner and logon_user and owner != logon_user:
            return {'ok': False, 'error': 'foreign_transport', 'details': info,
                    'message': f'Transport {trkorr} is owned by {owner}, not you ({logon_user}). '
                               'Refusing to delete another user\'s transport.'}
        if status not in ('D', 'L'):
            return {'ok': False, 'error': 'not_modifiable', 'details': info,
                    'message': f'Transport {trkorr} status is {status or "?"} (not modifiable). '
                               'Only modifiable (D/L) requests can be deleted; released ones cannot.'}

        # 4) Double-check confirmation gate
        confirmed = bool(force) and confirm_transport is not None \
            and confirm_transport.upper() == trkorr
        if not confirmed:
            return {'ok': False, 'error': 'confirmation_required', 'details': info,
                    'message': (f'Confirmation required to DELETE {trkorr} '
                                f'("{info.get("description","")}"). This is permanent.'),
                    'how_to_confirm': 'Re-call with confirm_transport=<same number> AND force=True.'}

        # Execute the delete
        try:
            res = self.adt_client.delete_transport(trkorr)
            return {'ok': True, 'deleted': True, 'transport': trkorr, 'details': info,
                    'message': res.get('message', f'Transport {trkorr} deleted')}
        except Exception as e:
            return {'ok': False, 'error': 'delete_failed', 'details': info,
                    'message': f'Delete failed for {trkorr}: {e} '
                               '(SAP refuses deletion of non-empty requests — release/reassign '
                               'its objects first, or delete its tasks).'}

    # ===== Database Operations =====

    def run_query(self, sql_query: str, row_limit: int = 100) -> Optional[str]:
        """
        Execute SQL query on SAP database

        Args:
            sql_query: SQL query string
            row_limit: Maximum rows to return

        Returns:
            XML result string
        """
        print(f"Executing query: {sql_query}")
        print(f"Row limit: {row_limit}\n")

        try:
            result_xml = self.adt_client.run_query(sql_query, row_number=row_limit)
            print(f"Query executed successfully")
            print(f"Result (first 500 chars):\n{result_xml[:500]}")
            return result_xml
        except Exception as e:
            print(f"[ERROR] {str(e)}")
            return None

    def table_contents(self, table_name: str, row_limit: int = 100) -> Optional[str]:
        """
        Get contents of a database table

        **DEPRECATED:** Use run_sql_query() instead for better results.

        Args:
            table_name: Table name
            row_limit: Maximum rows to return

        Returns:
            XML result string
        """
        print(f"[WARNING] table_contents() is deprecated. Use run_sql_query() instead.")
        print(f"Fetching table contents: {table_name}")
        print(f"Row limit: {row_limit}\n")

        try:
            result_xml = self.adt_client.table_contents(table_name, row_number=row_limit)
            print(f"Table contents retrieved successfully")
            print(f"Result (first 500 chars):\n{result_xml[:500]}")
            return result_xml
        except Exception as e:
            print(f"[ERROR] {str(e)}")
            return None

    # ===== DDIC Object Operations =====

    def create_dataelement(self, name: str, domain_name: str, description: str,
                          package: str, transport: Optional[str] = None,
                          short_label: Optional[str] = None,
                          medium_label: Optional[str] = None,
                          long_label: Optional[str] = None,
                          heading_label: Optional[str] = None) -> bool:
        """
        Create a data element

        Args:
            name: Data element name (e.g., 'ZAI_E_MODEL')
            domain_name: Domain name (e.g., 'CHAR200')
            description: Description text
            package: Package name
            transport: Transport request (optional)
            short_label: Short field label (max 10 chars)
            medium_label: Medium field label (max 20 chars)
            long_label: Long field label (max 40 chars)
            heading_label: Heading label (max 55 chars)

        Returns:
            True if successful, False otherwise
        """
        print(f"\n{'=' * 70}")
        print(f"  Creating Data Element: {name}")
        print(f"{'=' * 70}")
        print(f"  Domain: {domain_name}")
        print(f"  Package: {package}")
        print(f"  Description: {description}")
        if transport:
            print(f"  Transport: {transport}")
        print(f"{'=' * 70}\n")

        try:
            result = self.adt_client.create_dataelement(
                name=name.upper(),
                domain_name=domain_name.upper(),
                description=description,
                package_name=package,
                short_label=short_label,
                medium_label=medium_label,
                long_label=long_label,
                heading_label=heading_label,
                transport=transport
            )

            if result.get('success'):
                print(f"\n[OK] Data element created successfully")
                print(f"     URL: {result.get('object_url')}")
                return True
            else:
                print(f"\n[ERROR] {result.get('message')}")
                return False

        except Exception as e:
            print(f"\n[ERROR] {str(e)}")
            return False

    def create_domain(self, name: str, datatype: str, length: int,
                     description: str, package: str,
                     transport: Optional[str] = None,
                     decimals: int = 0,
                     lowercase: bool = False,
                     fixed_values: Optional[List[Dict[str, str]]] = None) -> bool:
        """
        Create a domain

        Args:
            name: Domain name (e.g., 'ZAI_D_MODEL')
            datatype: Data type ('CHAR', 'NUMC', 'INT4', etc.)
            length: Length (e.g., 200)
            description: Description text
            package: Package name
            transport: Transport request (optional)
            decimals: Number of decimal places (default: 0)
            lowercase: Allow lowercase (default: False)
            fixed_values: List of dicts with 'value' and 'text' keys (optional)
                         Example: [{'value': 'A', 'text': 'Option A'}]

        Returns:
            True if successful, False otherwise
        """
        print(f"\n{'=' * 70}")
        print(f"  Creating Domain: {name}")
        print(f"{'=' * 70}")
        print(f"  Type: {datatype}({length})")
        print(f"  Package: {package}")
        print(f"  Description: {description}")
        if decimals:
            print(f"  Decimals: {decimals}")
        if lowercase:
            print(f"  Lowercase: Allowed")
        if fixed_values:
            print(f"  Fixed Values: {', '.join([fv.get('value', '') for fv in fixed_values])}")
        if transport:
            print(f"  Transport: {transport}")
        print(f"{'=' * 70}\n")

        try:
            result = self.adt_client.create_domain(
                name=name.upper(),
                datatype=datatype.upper(),
                length=length,
                description=description,
                package_name=package,
                decimals=decimals,
                lowercase=lowercase,
                fixed_values=fixed_values,
                transport=transport
            )

            if result.get('success'):
                print(f"\n[OK] Domain created successfully")
                print(f"     URL: {result.get('object_url')}")
                return True
            else:
                print(f"\n[ERROR] {result.get('message')}")
                return False

        except Exception as e:
            print(f"\n[ERROR] {str(e)}")
            return False

    def create_structure(self, name: str, fields: list, description: str,
                        package: str, transport: Optional[str] = None) -> bool:
        """
        Create a structure (INTTAB) in SAP

        Args:
            name: Structure name (e.g., 'ZAI_S_CUSTOMER')
            fields: List of field definitions. Each field is a dict with:
                - 'name': Field name
                - 'type': ABAP type (e.g., 'char10', 'numc8', or data element name like 'ZAI_E_STATUS')
                - 'description': Field description (optional, for comments)
            description: Structure description text
            package: Package name
            transport: Transport request number

        Returns:
            True if successful, False otherwise

        Examples:
            # Simple structure with predefined types
            client.create_structure('ZAI_S_TEST', [
                {'name': 'FIELD1', 'type': 'char10'},
                {'name': 'FIELD2', 'type': 'numc8'}
            ], 'Test structure', 'ZAI', transport='FIDK901433')

            # Structure with data elements
            client.create_structure('ZAI_S_STATUS', [
                {'name': 'STATUS', 'type': 'ZAI_E_STATUS', 'description': 'Status indicator'}
            ], 'Status info', 'ZAI', transport='FIDK901433')
        """
        print(f"\n{'=' * 70}")
        print(f"  Creating Structure: {name}")
        print(f"{'=' * 70}")
        print(f"  Package: {package}")
        print(f"  Description: {description}")
        print(f"  Fields:")
        for field in fields:
            print(f"    - {field.get('name')}: {field.get('type')}")
        if transport:
            print(f"  Transport: {transport}")
        print(f"{'=' * 70}\n")

        try:
            result = self.adt_client.create_structure(
                name=name.upper(),
                fields=fields,
                description=description,
                package_name=package,
                transport=transport
            )

            if result.get('success'):
                print(f"\n[OK] Structure created successfully")
                print(f"     URL: {result.get('object_url')}")
                print(f"\n     NOTE: Structure must be activated before use!")
                print(f"     Run: adt_client.activate_object('{name.upper()}', '/sap/bc/adt/ddic/structures/{name.lower()}')")
                return True
            else:
                print(f"\n[ERROR] {result.get('message')}")
                return False

        except Exception as e:
            print(f"\n[ERROR] {str(e)}")
            return False

    def create_table(self, name: str, description: str, package: str,
                    fields: Optional[list] = None, ref_structure: Optional[str] = None,
                    transport: Optional[str] = None, table_category: str = 'TRANSP',
                    delivery_class: str = 'A', data_maintenance: str = 'ALLOWED') -> bool:
        """
        Create a database table in SAP

        Args:
            name: Table name (e.g., 'ZAI_T_CUSTOMER')
            description: Table description text
            package: Package name
            fields: List of field definitions (mutually exclusive with ref_structure)
                Each field is a dict with:
                - 'name': Field name (required)
                - 'type': ABAP type (e.g., 'char10', 'mandt', or data element name)
                - 'key': True if this is a key field (default: False)
                - 'null': True if null allowed (default: False)
                - 'description': Field description (optional)
            ref_structure: Name of existing structure to reference (optional)
                If provided, fields parameter is ignored (recommended pattern)
            transport: Transport request number
            table_category: Table type - 'TRANSP' (transparent), 'POOL', 'CLUSTER'
            delivery_class: Delivery class
                - 'A': Application table (master/transaction data) - default
                - 'C': Customizing table
                - 'L': Temporary data, delivered empty
                - 'G': Customizing, protected against SAP update
            data_maintenance: Data Browser/Table View Editing
                - 'ALLOWED': Display/Maintenance Allowed (default)
                - 'RESTRICTED': Display/Maintenance with Restrictions
                - 'NOT_ALLOWED': Display/Maintenance Not Allowed
                - 'LIMITED': Only Display, No Maintenance

        Returns:
            True if successful, False otherwise

        Examples:
            # Table with direct field definitions
            client.create_table('ZAI_T_CUSTOMER', 'Customer master', 'ZAI',
                               fields=[
                                   {'name': 'CLIENT', 'type': 'mandt', 'key': True},
                                   {'name': 'ID', 'type': 'char10', 'key': True},
                                   {'name': 'NAME', 'type': 'char50'},
                                   {'name': 'STATUS', 'type': 'ZAI_E_STATUS'}
                               ],
                               delivery_class='A',
                               data_maintenance='ALLOWED',
                               transport='FIDK901433')

            # Table referencing existing structure (recommended)
            client.create_table('ZAI_T_CONFIG', 'Configuration data', 'ZAI',
                               ref_structure='ZAI_S_CUSTOMER',
                               transport='FIDK901433')
        """
        print(f"\n{'=' * 70}")
        print(f"  Creating Table: {name}")
        print(f"{'=' * 70}")
        print(f"  Package: {package}")
        print(f"  Description: {description}")
        print(f"  Category: {table_category}")
        print(f"  Delivery Class: {delivery_class}")
        print(f"  Data Maintenance: {data_maintenance}")
        if ref_structure:
            print(f"  Reference Structure: {ref_structure}")
        else:
            print(f"  Fields:")
            for field in fields:
                key_mark = ' [KEY]' if field.get('key') else ''
                null_mark = ' [NULL]' if field.get('null') else ''
                print(f"    - {field.get('name')}: {field.get('type')}{key_mark}{null_mark}")
        if transport:
            print(f"  Transport: {transport}")
        print(f"{'=' * 70}\n")

        try:
            result = self.adt_client.create_table(
                name=name.upper(),
                description=description,
                package_name=package,
                fields=fields,
                ref_structure=ref_structure,
                transport=transport,
                table_category=table_category,
                delivery_class=delivery_class,
                data_maintenance=data_maintenance
            )

            if result.get('success'):
                print(f"\n[OK] Table created successfully")
                print(f"     URL: {result.get('object_url')}")
                print(f"\n     NOTE: Table must be activated before use!")
                print(f"     Run: adt_client.activate_object('{name.upper()}', '/sap/bc/adt/ddic/tables/{name.lower()}')")
                return True
            else:
                print(f"\n[ERROR] {result.get('message')}")
                return False

        except Exception as e:
            print(f"\n[ERROR] {str(e)}")
            return False

    def create_cds_view(self, name: str, cds_source: str, description: str,
                        package: str, transport: Optional[str] = None) -> bool:
        """
        Create a CDS (Core Data Services) view in SAP

        Args:
            name: CDS view name (e.g., 'ZAI_C_CUSTOMER')
            cds_source: CDS DDL source code (SQL-like syntax with annotations)
            description: View description text
            package: Package name
            transport: Transport request number

        Returns:
            True if successful, False otherwise

        Examples:
            Simple view:
            ```python
            cds_source = '''@AbapCatalog.sqlViewName: 'ZAI_C_CUSTOMER'
            @AccessControl.authorizationCheck: #CHECK

            define view ZAI_C_CUSTOMER as
            select from zai_t_customer
            {
              key customer_id,
              customer_name,
              status
            }'''
            client.create_cds_view('ZAI_C_CUSTOMER', cds_source,
                                   'Customer view', 'ZAI', transport='TRXXXXXX')
            ```

            View with WHERE clause:
            ```python
            cds_source = '''@AbapCatalog.sqlViewName: 'ZAI_C_ACTIVE'
            @EndUserText.label: 'Active Tasks'
            @AccessControl.authorizationCheck: #CHECK

            define view ZAI_C_ACTIVE as
            select from zai_t_task_complete
            {
              key task_id,
              task_name
            }
            where priority = '1'
            '''
            ```
        """
        print(f"\n{'=' * 70}")
        print(f"  Creating CDS View: {name}")
        print(f"{'=' * 70}")
        print(f"  Package: {package}")
        print(f"  Description: {description}")
        print(f"  Source length: {len(cds_source)} characters")
        if transport:
            print(f"  Transport: {transport}")
        print(f"{'=' * 70}\n")

        try:
            result = self.adt_client.create_cds_view(
                name=name.upper(),
                cds_source=cds_source,
                description=description,
                package_name=package,
                transport=transport
            )

            if result.get('success'):
                print(f"\n[OK] CDS view created successfully")
                print(f"     URL: {result.get('object_url')}")
                print(f"\n     NOTE: CDS view must be activated before use!")
                print(f"     Run: adt_client.activate_object('{name.upper()}', '/sap/bc/adt/ddic/ddl/sources/{name.lower()}')")
                return True
            else:
                print(f"\n[ERROR] {result.get('message')}")
                return False

        except Exception as e:
            print(f"\n[ERROR] {str(e)}")
            return False

    # ===== New Object Type Wrappers (Added 2026-02-02) =====

    def create_table_type(self, name: str, row_type: str, description: str,
                         package: str, transport: Optional[str] = None,
                         access_type: str = 'standard', key_kind: str = 'nonUnique') -> bool:
        """
        Create a Table Type (TTYP) in SAP

        Args:
            name: Table type name (e.g., 'ZAI_TT_CUSTOMERS')
            row_type: Row type - can be a data element, structure, or predefined type
            description: Table type description
            package: Package name
            transport: Transport request number
            access_type: Table access type - 'standard', 'sorted', 'hashed', 'index'
            key_kind: Key type - 'unique', 'nonUnique', 'notSpecified'

        Returns:
            True if successful, False otherwise

        Example:
            client.create_table_type('ZAI_TT_IDS', 'ZAI_E_TEST_ID',
                                    'Table of IDs', 'ZAI', transport='IEDK934921')
        """
        print(f"\n{'=' * 70}")
        print(f"  Creating Table Type: {name}")
        print(f"{'=' * 70}")
        print(f"  Row Type: {row_type}")
        print(f"  Package: {package}")
        print(f"  Access Type: {access_type}")
        if transport:
            print(f"  Transport: {transport}")
        print(f"{'=' * 70}\n")

        try:
            self.adt_client.fetch_csrf_token()

            url = f'{self.adt_client.url}/sap/bc/adt/ddic/tabletypes'
            headers = {
                'Authorization': self.adt_client._get_auth_header(),
                'sap-client': self.adt_client.client,
                'X-CSRF-Token': self.adt_client.csrf_token,
                'Content-Type': 'application/vnd.sap.adt.tabletype.v1+xml',
                'Accept': '*/*'
            }

            xml_payload = f'''<?xml version="1.0" encoding="UTF-8"?>
<ttyp:tableType xmlns:ttyp="http://www.sap.com/dictionary/tabletype"
                xmlns:adtcore="http://www.sap.com/adt/core"
                adtcore:name="{name.upper()}"
                adtcore:description="{description}">
    <adtcore:packageRef adtcore:name="{package.upper()}"/>
    <ttyp:rowType>
        <ttyp:typeKind>dictionaryType</ttyp:typeKind>
        <ttyp:typeName>{row_type.upper()}</ttyp:typeName>
        <ttyp:builtInType><ttyp:dataType/><ttyp:length>000000</ttyp:length><ttyp:decimals>000000</ttyp:decimals></ttyp:builtInType>
        <ttyp:rangeType/>
    </ttyp:rowType>
    <ttyp:initialRowCount>00000</ttyp:initialRowCount>
    <ttyp:accessType>{access_type}</ttyp:accessType>
    <ttyp:primaryKey>
        <ttyp:definition>standard</ttyp:definition>
        <ttyp:kind>{key_kind}</ttyp:kind>
        <ttyp:components/>
        <ttyp:alias/>
    </ttyp:primaryKey>
</ttyp:tableType>'''

            params = {'corrNr': transport} if transport else {}
            response = self.adt_client.session.post(url, headers=headers, params=params,
                                                    data=xml_payload, timeout=60)

            if response.status_code in [200, 201]:
                print(f"\n[OK] Table type created successfully")
                print(f"     Activate with: adt_client.activate_object('{name.upper()}', '/sap/bc/adt/ddic/tabletypes/{name.lower()}')")
                return True
            if response.status_code == 404:
                print("\n[WARNING] Table type endpoint not available on this SAP system")
                return True
            if response.status_code == 405 and 'AlreadyExists' in response.text:
                print("\n[OK] Table type already exists")
                return True
            print(f"\n[ERROR] {response.status_code}: {response.text[:500]}")
            return False

        except Exception as e:
            print(f"\n[ERROR] {str(e)}")
            return False

    def create_message_class(self, name: str, description: str, package: str,
                            transport: Optional[str] = None) -> bool:
        """
        Create a Message Class (MSAG) in SAP

        Args:
            name: Message class name (e.g., 'ZAI_MSG')
            description: Message class description
            package: Package name
            transport: Transport request number

        Returns:
            True if successful, False otherwise

        Example:
            client.create_message_class('ZAI_MSG', 'ZAI Messages', 'ZAI', transport='IEDK934921')
        """
        print(f"\n{'=' * 70}")
        print(f"  Creating Message Class: {name}")
        print(f"{'=' * 70}")
        print(f"  Package: {package}")
        if transport:
            print(f"  Transport: {transport}")
        print(f"{'=' * 70}\n")

        try:
            self.adt_client.fetch_csrf_token()

            url = f'{self.adt_client.url}/sap/bc/adt/messageclass'
            headers = {
                'Authorization': self.adt_client._get_auth_header(),
                'sap-client': self.adt_client.client,
                'X-CSRF-Token': self.adt_client.csrf_token,
                'Content-Type': 'application/vnd.sap.adt.messageclass.v2+xml',
                'Accept': '*/*'
            }

            xml_payload = f'''<?xml version="1.0" encoding="UTF-8"?>
<mc:messageClass xmlns:mc="http://www.sap.com/adt/MessageClass"
                 xmlns:adtcore="http://www.sap.com/adt/core"
                 adtcore:name="{name.upper()}"
                 adtcore:description="{description}">
    <adtcore:packageRef adtcore:name="{package.upper()}"/>
</mc:messageClass>'''

            params = {'corrNr': transport} if transport else {}
            response = self.adt_client.session.post(url, headers=headers, params=params,
                                                    data=xml_payload, timeout=60)

            if response.status_code in [200, 201]:
                print(f"\n[OK] Message class created successfully")
                return True
            else:
                print(f"\n[ERROR] {response.status_code}: {response.text[:500]}")
                return False

        except Exception as e:
            print(f"\n[ERROR] {str(e)}")
            return False

    def create_lock_object(self, name: str, primary_table: str, description: str,
                          package: str, lock_fields: list, transport: Optional[str] = None,
                          lock_mode: str = 'E', allow_rfc: bool = False) -> bool:
        """
        Create a Lock Object (ENQU) in SAP

        Args:
            name: Lock object name (e.g., 'EZAI_CUSTOMER') - must start with E
            primary_table: Primary table to lock
            description: Lock object description
            package: Package name
            lock_fields: List of field names to include as lock parameters
            transport: Transport request number
            lock_mode: Lock mode - 'E' (exclusive), 'S' (shared), 'X' (exclusive non-cumulative)
            allow_rfc: Allow RFC access to the lock

        Returns:
            True if successful, False otherwise

        Example:
            client.create_lock_object('EZAI_CUST', 'ZAI_T_CUSTOMER',
                                     'Customer lock', 'ZAI',
                                     lock_fields=['CUSTOMER_ID'],
                                     transport='IEDK934921')
        """
        print(f"\n{'=' * 70}")
        print(f"  Creating Lock Object: {name}")
        print(f"{'=' * 70}")
        print(f"  Primary Table: {primary_table}")
        print(f"  Lock Mode: {lock_mode}")
        print(f"  Lock Fields: {lock_fields}")
        print(f"  Package: {package}")
        if transport:
            print(f"  Transport: {transport}")
        print(f"{'=' * 70}\n")

        try:
            self.adt_client.fetch_csrf_token()

            url = f'{self.adt_client.url}/sap/bc/adt/ddic/lockobjects/sources'
            headers = {
                'Authorization': self.adt_client._get_auth_header(),
                'sap-client': self.adt_client.client,
                'X-CSRF-Token': self.adt_client.csrf_token,
                'Content-Type': 'application/vnd.sap.adt.lockobjects.v1+xml',
                'Accept': '*/*'
            }

            # Build lock parameters XML
            lock_params_xml = ""
            for field in lock_fields:
                lock_params_xml += f'''
            <enqu:lockParameter>
                <enqu:parameterWanted>true</enqu:parameterWanted>
                <enqu:parameterName>{field.upper()}</enqu:parameterName>
                <enqu:tableName>{primary_table.upper()}</enqu:tableName>
                <enqu:fieldName>{field.upper()}</enqu:fieldName>
            </enqu:lockParameter>'''

            allow_rfc_str = 'true' if allow_rfc else 'false'

            xml_payload = f'''<?xml version="1.0" encoding="UTF-8"?>
<enqu:lockobject xmlns:enqu="http://www.sap.com/adt/ddic/enqu"
                 xmlns:adtcore="http://www.sap.com/adt/core"
                 adtcore:name="{name.upper()}"
                 adtcore:description="{description}">
    <adtcore:packageRef adtcore:name="{package.upper()}"/>
    <enqu:content>
        <enqu:allowRFC>{allow_rfc_str}</enqu:allowRFC>
        <enqu:primaryTable>
            <enqu:tableName>{primary_table.upper()}</enqu:tableName>
            <enqu:lockMode>{lock_mode}</enqu:lockMode>
        </enqu:primaryTable>
        <enqu:secondaryTables/>
        <enqu:lockParameters>{lock_params_xml}
        </enqu:lockParameters>
    </enqu:content>
</enqu:lockobject>'''

            params = {'corrNr': transport} if transport else {}
            response = self.adt_client.session.post(url, headers=headers, params=params,
                                                    data=xml_payload, timeout=60)

            if response.status_code in [200, 201]:
                print(f"\n[OK] Lock object created successfully")
                print(f"     Generated functions: ENQUEUE_{name.upper()}, DEQUEUE_{name.upper()}")
                return True
            else:
                print(f"\n[ERROR] {response.status_code}: {response.text[:500]}")
                return False

        except Exception as e:
            print(f"\n[ERROR] {str(e)}")
            return False

    def run_sql_query(self, query: str, max_rows: int = 100) -> Optional[Dict[str, Any]]:
        """
        Execute a freestyle SQL query via SAP ADT datapreview

        Args:
            query: SQL SELECT query (ABAP SQL syntax, no UP TO clause needed)
            max_rows: Maximum rows to return (default 100)

        Returns:
            Dict with 'columns', 'data', 'total_rows', 'execution_time' or None on error

        Example:
            result = client.run_sql_query("SELECT MATNR, MAKTX FROM MARA")
            for row in result['data']:
                print(row)
        """
        try:
            response_text = self.adt_client.run_query(query, row_number=max_rows)

            # Parse XML response
            root = ET.fromstring(response_text)
            ns = {'dp': 'http://www.sap.com/adt/dataPreview'}

            total_rows = root.find('.//dp:totalRows', ns)
            exec_time = root.find('.//dp:queryExecutionTime', ns)

            result = {
                'total_rows': int(total_rows.text) if total_rows is not None else 0,
                'execution_time': float(exec_time.text) if exec_time is not None else 0,
                'columns': [],
                'data': []
            }

            # Get columns and data
            columns = root.findall('.//dp:columns', ns)
            for col in columns:
                meta = col.find('dp:metadata', ns)
                col_name = meta.get('{http://www.sap.com/adt/dataPreview}name') if meta is not None else ''
                result['columns'].append(col_name)

                # Get data for this column
                data_elements = col.findall('.//dp:data', ns)
                col_data = [d.text for d in data_elements]

                # Store data transposed (will be pivoted later)
                if not result['data']:
                    result['data'] = [[] for _ in range(len(col_data))]
                for i, val in enumerate(col_data):
                    if i < len(result['data']):
                        result['data'][i].append(val)

            return result

        except Exception as e:
            # Re-raise so run_sql_query.py's structured handler surfaces the real
            # error (status code + SAP message) instead of the generic
            # "if not result" branch that hid it.
            print(f"[ERROR] SQL query error: {str(e)}")
            raise

    def create_type_group(self, name: str, types_and_constants: str, description: str,
                         package: str, transport: Optional[str] = None) -> bool:
        """
        Create a Type Group (TYPE) in SAP

        Type groups are legacy ABAP constructs for defining reusable types and constants.
        They are used with the TYPE-POOLS statement.

        Args:
            name: Type group name (e.g., 'ZAI_TYPES')
            types_and_constants: ABAP source code containing TYPES and CONSTANTS definitions
                               (should NOT include 'type-pool' statement - that's added automatically)
            description: Short description
            package: Package name
            transport: Transport request number

        Returns:
            True if successful, False otherwise

        Examples:
            Simple type group:
            ```python
            types_consts = '''
types:
  zai_status_type type c length 1.

constants:
  zai_status_active type zai_status_type value 'A',
  zai_status_inactive type zai_status_type value 'I'.
'''
            client.create_type_group('ZAI_TYPES', types_consts,
                                    'ZAI Type Definitions', 'ZAI', transport='TRXXXXXX')
            ```

            Using in ABAP:
            ```abap
            TYPE-POOLS zai_types.
            DATA status TYPE zai_types-zai_status_type.
            status = zai_types-zai_status_active.
            ```
        """
        print(f"\n{'=' * 70}")
        print(f"  Creating Type Group: {name}")
        print(f"{'=' * 70}")
        print(f"  Package: {package}")
        print(f"  Description: {description}")
        print(f"  Source length: {len(types_and_constants)} characters")
        if transport:
            print(f"  Transport: {transport}")
        print(f"{'=' * 70}\n")

        try:
            result = self.adt_client.create_type_group(
                name=name.upper(),
                types_and_constants=types_and_constants,
                description=description,
                package_name=package,
                transport=transport
            )

            if result.get('success'):
                print(f"\n[OK] Type group created successfully")
                print(f"     URL: {result.get('object_url')}")
                print(f"\n     NOTE: Type group must be activated before use!")
                print(f"     Run: adt_client.activate_object('{name.upper()}', '/sap/bc/adt/ddic/typegroups/{name.lower()}')")
                return True
            else:
                print(f"\n[ERROR] {result.get('message')}")
                return False

        except Exception as e:
            print(f"\n[ERROR] {str(e)}")
            return False

    def get_ddic_object(self, object_type: str, name: str) -> Optional[str]:
        """
        Get DDIC object XML

        Args:
            object_type: Type ('dataelement', 'domain', 'table', 'structure')
            name: Object name

        Returns:
            XML string if successful, None otherwise
        """
        print(f"Fetching {object_type}: {name}")

        try:
            xml_result = self.adt_client.get_ddic_object(object_type, name)
            print(f"[OK] Retrieved successfully")
            print(f"Result (first 500 chars):\n{xml_result[:500]}")
            return xml_result
        except Exception as e:
            print(f"[ERROR] {str(e)}")
            return None

    def create_function_group(self, name: str, description: str, package: str,
                             transport: Optional[str] = None) -> bool:
        """
        Create a Function Group (FUGR) in SAP

        Function groups are containers for function modules. A function group must
        exist before creating function modules within it.

        Args:
            name: Function group name (e.g., 'ZAI_FG_CUSTOMER')
            description: Short description
            package: Package name
            transport: Transport request number

        Returns:
            True if successful, False otherwise

        Examples:
            ```python
            client.create_function_group('ZAI_FG_CUSTOMER', 'Customer Function Modules',
                                       'ZAI', transport='TRXXXXXX')
            ```
        """
        print(f"\n{'=' * 70}")
        print(f"  Creating Function Group: {name}")
        print(f"{'=' * 70}")
        print(f"  Package: {package}")
        print(f"  Description: {description}")
        if transport:
            print(f"  Transport: {transport}")
        print(f"{'=' * 70}\n")

        try:
            result = self.adt_client.create_function_group(
                name=name.upper(),
                description=description,
                package_name=package,
                transport=transport
            )

            if result.get('success'):
                print(f"\n[OK] Function group created successfully")
                print(f"     URL: {result.get('object_url')}")
                print(f"\n     NOTE: Function group must be activated before use!")
                print(f"     Run: adt_client.activate_object('{name.upper()}', '/sap/bc/adt/functions/groups/{name.lower()}')")
                return True
            else:
                print(f"\n[ERROR] {result.get('message')}")
                return False

        except Exception as e:
            print(f"\n[ERROR] {str(e)}")
            return False

    def create_function_module(self, name: str, function_group: str, description: str,
                              import_params: Optional[list] = None,
                              export_params: Optional[list] = None,
                              changing_params: Optional[list] = None,
                              tables: Optional[list] = None,
                              exceptions: Optional[list] = None,
                              transport: Optional[str] = None,
                              local: bool = False) -> bool:
        """
        Create a Function Module within a Function Group

        Args:
            name: Function module name (e.g., 'ZAI_GET_CUSTOMER')
            function_group: Parent function group name (must exist)
            description: Short description
            import_params: List of IMPORTING parameters
                Each param: {'name': 'IV_ID', 'type': 'char10', 'optional': False, 'default': 'SPACE'}
            export_params: List of EXPORTING parameters
            changing_params: List of CHANGING parameters
            tables: List of TABLES parameters
                Each table: {'name': 'IT_DATA', 'type': 'ZAI_S_DATA', 'optional': False}
            exceptions: NOT SUPPORTED via ADT - Use SAP GUI
            transport: Transport request number

        Returns:
            True if successful, False otherwise

        Note: Function module parameters (IMPORTING, EXPORTING, CHANGING, TABLES, EXCEPTIONS)
              cannot be added via ADT API on this SAP system. Use SAP GUI (SE37/SE80) to add
              parameters after creating the shell.

        Examples:
            Simple function module (shell only):
            ```python
            # Create function group first
            client.create_function_group('ZAI_FG_CUSTOMER', 'Customer Functions', 'ZAI', transport='TR...')

            # Create function module shell
            client.create_function_module(
                name='ZAI_GET_CUSTOMER',
                function_group='ZAI_FG_CUSTOMER',
                description='Get Customer Data',
                transport='TR...'
            )

            # Then add parameters via SAP GUI (SE37)
            ```
        """
        print(f"\n{'=' * 70}")
        print(f"  Creating Function Module: {name}")
        print(f"{'=' * 70}")
        print(f"  Function Group: {function_group}")
        print(f"  Description: {description}")
        if transport:
            print(f"  Transport: {transport}")
        print(f"{'=' * 70}")
        print(f"  NOTE: Parameters must be added via SAP GUI (SE37/SE80)")
        print(f"{'=' * 70}\n")

        try:
            result = self.adt_client.create_function_module(
                name=name.upper(),
                function_group=function_group,
                description=description,
                transport=transport,
                local=local
            )

            if result.get('success'):
                print(f"\n[OK] Function module created successfully")
                print(f"     URL: {result.get('object_url')}")
                print(f"\n     IMPORTANT:")
                print(f"     - Function module shell created without parameters")
                print(f"     - Add parameters via SAP GUI (SE37/SE80)")
                print(f"     - Activate function group and function module before use")
                return True
            else:
                print(f"\n[ERROR] {result.get('message')}")
                return False

        except Exception as e:
            print(f"\n[ERROR] {str(e)}")
            return False

    def set_function_module_source(self, name: str, function_group: str, source_code: str,
                                   transport: Optional[str] = None,
                                   activate: bool = True) -> Dict[str, Any]:
        """Push a function module's full source (inline signature + body) and activate.

        Wraps the proven lock->PUT->activate->unlock FM push. The signature MUST be
        written as inline ABAP clauses after the FUNCTION line (not the SE37 *" block).
        RFC-enabling remains a one-time SE37 toggle. Pass transport=None for $TMP.
        Returns the underlying dict ({success, object_url, activation?, ...}).
        """
        print(f"\n  Pushing FM source: {name} (activate={activate})")
        try:
            result = self.adt_client.set_function_module_source(
                name=name, function_group=function_group, source_code=source_code,
                transport=transport, activate=activate)
            if result.get('success'):
                print(f"  [OK] {result.get('message')}")
            else:
                print(f"  [ERROR] {result.get('message')}")
            return result
        except Exception as e:
            print(f"  [ERROR] {str(e)}")
            return {'success': False, 'error': str(e)}

    def where_used(self, object_name: str, object_type: str ='class') -> Optional[List[Dict]]:
        """
        Find all usages of an ABAP object (Where-Used List)

        Args:
            object_name: Object name (e.g., 'ZCL_MY_CLASS')
            object_type: Object type (class, interface, program, table, dataelement, domain, cds)

        Returns:
            List of dicts with 'name', 'type', 'uri', 'description', or None on error
        """
        from object_types import get_object_url

        print(f"\nSearching where-used for: {object_name} ({object_type})")

        try:
            object_url = get_object_url(object_name, object_type)
            results = self.adt_client.where_used(object_url)
            return results
        except Exception as e:
            # Re-raise so the CLI's structured error handler (which prints the
            # exception type + message) runs instead of being dead code behind a
            # generic "result is None" branch. Masking the real SAP error as None
            # is the same class of bug as the unlock/500 issues we fixed.
            print(f"[ERROR] Where-used search failed: {str(e)}")
            raise

    def pretty_print(self, object_name: str, object_type: str = 'class') -> Optional[str]:
        """
        Format ABAP source code using SAP Pretty Printer

        Args:
            object_name: Object name
            object_type: Object type (class, interface, program, include, function)

        Returns:
            Formatted source code string, or None on error
        """
        from object_types import get_object_url, get_source_url

        print(f"\nApplying pretty printer to: {object_name} ({object_type})")

        try:
            object_url = get_object_url(object_name, object_type)
            source_url = get_source_url(object_name, object_type)

            # Get current source
            source = self.adt_client.get_object_source(source_url)
            if not source:
                print("[ERROR] Could not retrieve source code")
                return None

            # Apply pretty printer
            formatted = self.adt_client.pretty_print(object_url, source)
            return formatted
        except Exception as e:
            print(f"[ERROR] Pretty printer failed: {str(e)}")
            return None

    def run_atc_check(self, object_name: str, object_type: str = 'class',
                      variant: str = 'DEFAULT') -> Optional[Dict[str, Any]]:
        """
        Run ATC (ABAP Test Cockpit) code quality checks

        Args:
            object_name: Object name or package name
            object_type: Object type (class, interface, program, package)
            variant: ATC check variant name

        Returns:
            Dict with 'findings' list, or None on error
        """
        from object_types import get_object_url

        print(f"\nRunning ATC check on: {object_name} ({object_type})")
        print(f"Variant: {variant}")

        try:
            object_url = get_object_url(object_name, object_type)
            result = self.adt_client.run_atc_check(object_url, variant=variant)
            return result
        except Exception as e:
            # Re-raise so run_atc_check.py's structured handler surfaces the real
            # error instead of the generic "result is None" branch.
            print(f"[ERROR] ATC check failed: {str(e)}")
            raise

    def run_unit_tests(self, object_name: str, object_type: str = 'class',
                        coverage: bool = False) -> Dict[str, Any]:
        """
        Execute ABAP Unit tests for an object.

        IMPORTANT: this EXECUTES ABAP code on the SAP system (runs the object's test
        classes). It writes nothing to the CTS/transport system — no source change,
        no lock, no activation — but it is NOT a passive read like syntax_check.

        Args:
            object_name: Name of the object containing ABAP Unit test classes
            object_type: Type of object ('class', 'program', ...)
            coverage: Request a code-coverage measurement alongside the run
                      (best-effort; omitted from the result if unavailable)

        Returns:
            Dict: {ok, object, passed, failed, errors, alerts, duration, coverage?}
        """
        object_url = get_object_url(object_name, object_type)
        type_desc = get_type_description(object_type)

        print(f"\nRunning ABAP Unit tests: {object_name} ({type_desc})")

        try:
            result = self.adt_client.run_unit_tests(object_url, coverage=coverage)
        except Exception as e:
            print(f"[ERROR] ABAP Unit test run failed: {str(e)}")
            raise

        passed = result.get('passed', 0)
        failed = result.get('failed', 0)
        total = passed + failed
        alerts = result.get('alerts', [])

        if total == 0:
            print("[WARN] No ABAP Unit test methods found for this object.")
        elif failed:
            print(f"[FAIL] {failed} of {total} test method(s) failed")
            for a in alerts[:10]:
                print(f"  - {a.get('location', '')}: {a.get('title', '')}")
            if len(alerts) > 10:
                print(f"  ... and {len(alerts) - 10} more")
        else:
            print(f"[OK] All {passed} test method(s) passed")

        out = {
            'ok': True,
            'object': object_name,
            'passed': passed,
            'failed': failed,
            'errors': result.get('errors', 0),
            'alerts': alerts,
            'duration': result.get('duration'),
        }
        if result.get('coverage') is not None:
            out['coverage'] = result['coverage']
        return out

    def list_inactive_objects(self) -> Optional[List[Dict]]:
        """
        List all inactive (not yet activated) objects

        Returns:
            List of dicts with 'name', 'type', 'uri', 'user', or None on error
        """
        print(f"\nRetrieving inactive objects...")

        try:
            results = self.adt_client.get_inactive_objects()
            return results
        except Exception as e:
            print(f"[ERROR] Failed to get inactive objects: {str(e)}")
            return None

    def get_structure(self, object_name: str, object_type: str = 'class') -> Optional[Dict[str, Any]]:
        """
        Get internal structure of an ABAP object

        Args:
            object_name: Object name
            object_type: Object type

        Returns:
            Dict with 'components' list, or None on error
        """
        from object_types import get_object_url
        import xml.etree.ElementTree as ET

        print(f"\nGetting structure of: {object_name} ({object_type})")

        try:
            object_url = get_object_url(object_name, object_type)
            xml_text = self.adt_client.get_object_structure(object_url)

            # Parse XML to extract components
            components = []
            try:
                root = ET.fromstring(xml_text)
                for elem in root.iter():
                    name = elem.get('{http://www.sap.com/adt/core}name', '') or elem.get('name', '')
                    obj_type = elem.get('{http://www.sap.com/adt/core}type', '') or elem.get('type', '')
                    uri = elem.get('{http://www.sap.com/adt/core}uri', '') or elem.get('uri', '')
                    desc = elem.get('{http://www.sap.com/adt/core}description', '') or elem.get('description', '')
                    if name and name != object_name.upper():
                        components.append({
                            'name': name,
                            'type': obj_type,
                            'uri': uri,
                            'description': desc
                        })
            except ET.ParseError:
                pass

            return {'components': components}
        except Exception as e:
            print(f"[ERROR] Failed to get structure: {str(e)}")
            return None

    def get_system_info(self) -> Optional[Dict[str, str]]:
        """
        Get SAP system information

        Returns:
            Dict with system properties, or None on error
        """
        print(f"\nRetrieving SAP system information...")

        try:
            result = self.adt_client.get_system_info()
            return result
        except Exception as e:
            print(f"[ERROR] Failed to get system info: {str(e)}")
            return None

    def create_metadata_extension(self, name: str, source: str, description: str,
                                   package: str, transport: Optional[str] = None) -> bool:
        """
        Create a CDS Metadata Extension (DDLX) in SAP

        Args:
            name: Metadata extension name (e.g., 'ZAI_E_CUSTOMER')
            source: DDLX source code
            description: Description text
            package: Package name
            transport: Transport request number

        Returns:
            True if successful, False otherwise
        """
        print(f"\n{'=' * 70}")
        print(f"  Creating Metadata Extension: {name}")
        print(f"{'=' * 70}")
        print(f"  Package: {package}")
        print(f"  Description: {description}")
        if transport:
            print(f"  Transport: {transport}")
        print(f"{'=' * 70}\n")

        try:
            result = self.adt_client.create_metadata_extension(
                name=name.upper(),
                source=source,
                description=description,
                package_name=package.upper(),
                transport=transport
            )
            if result and result.get('success'):
                print(f"[OK] Metadata extension {name} created")
                return True
            return False
        except Exception as e:
            print(f"[ERROR] {str(e)}")
            return False

    def create_access_control(self, name: str, source: str, description: str,
                package: str, transport: Optional[str] = None) -> bool:
        """
        Create a CDS Access Control (DCL) in SAP

        Args:
            name: Access control name (e.g., 'ZAI_A_CUSTOMER')
            source: DCL source code
            description: Description text
            package: Package name
            transport: Transport request number

        Returns:
            True if successful, False otherwise
        """
        print(f"\n{'=' * 70}")
        print(f"  Creating Access Control: {name}")
        print(f"{'=' * 70}")
        print(f"  Package: {package}")
        print(f"  Description: {description}")
        if transport:
            print(f"  Transport: {transport}")
        print(f"{'=' * 70}\n")

        try:
            result = self.adt_client.create_access_control(
                name=name.upper(),
                source=source,
                description=description,
                package_name=package.upper(),
                transport=transport
            )
            if result and result.get('success'):
                print(f"[OK] Access control {name} created")
                return True
            return False
        except Exception as e:
            print(f"[ERROR] {str(e)}")
            return False

    def create_behavior_definition(self, name: str, root_entity: str,
                                   implementation_type: str, package: str,
                                   description: str = '', transport: Optional[str] = None,
                                   source: Optional[str] = None,
                                   activate: bool = True) -> Optional[dict]:
        """
        Create an ABAP Behavior Definition (BDEF) in SAP

        Args:
            name: Behavior Definition name (e.g., 'ZI_MY_BDEF')
            root_entity: Root Entity name (CDS view entity, e.g., 'ZI_MY_ENTITY')
            implementation_type: Implementation type ('Managed', 'Unmanaged', 'Abstract', 'Projection')
            package: Package name
            description: Description text
            transport: Transport request number
            source: BDEF source code (optional, creates empty if not provided)
            activate: Activate after creation

        Returns:
            dict with result information
        """
        print(f"\n{'=' * 70}")
        print(f"  Creating Behavior Definition: {name}")
        print(f"{'=' * 70}")
        print(f"  Package: {package}")
        print(f"  Root Entity: {root_entity}")
        print(f"  Implementation Type: {implementation_type}")
        print(f"  Description: {description}")
        if transport:
            print(f"  Transport: {transport}")
        print(f"{'=' * 70}\n")

        try:
            result = self.adt_client.create_behavior_definition(
                name=name.upper(),
                root_entity=root_entity.upper(),
                implementation_type=implementation_type,
                package_name=package.upper(),
                description=description or name,
                transport=transport or '',
                source=source,
                activate=activate
            )
            if result and result.get('success'):
                print(f"[OK] Behavior Definition {name} created")
                if activate:
                    print(f"[OK] Behavior Definition {name} activated")
                return result
            return result
        except Exception as e:
            print(f"[ERROR] {str(e)}")
            return {'success': False, 'error': str(e)}

    def create_behavior_implementation(self, name: str, behavior_definition: str,
                                       package: str, description: str = '',
                                       transport: Optional[str] = None,
                                       source: Optional[str] = None,
                                       activate: bool = True) -> Optional[dict]:
        """
        Create an ABAP Behavior Implementation (BIMP) in SAP

        Args:
            name: Behavior Implementation name (e.g., 'ZBP_MY_ENTITY')
            behavior_definition: Behavior Definition name (e.g., 'ZI_MY_BDEF')
            package: Package name
            description: Description text
            transport: Transport request number
            source: BIMP source code (optional, creates empty if not provided)
            activate: Activate after creation

        Returns:
            dict with result information
        """
        print(f"\n{'=' * 70}")
        print(f"  Creating Behavior Implementation: {name}")
        print(f"{'=' * 70}")
        print(f"  Package: {package}")
        print(f"  Behavior Definition: {behavior_definition}")
        print(f"  Description: {description}")
        if transport:
            print(f"  Transport: {transport}")
        print(f"{'=' * 70}\n")

        try:
            result = self.adt_client.create_behavior_implementation(
                name=name.upper(),
                behavior_definition=behavior_definition.upper(),
                package_name=package.upper(),
                description=description or name,
                transport=transport or '',
                source=source,
                activate=activate
            )
            if result and result.get('success'):
                print(f"[OK] Behavior Implementation {name} created")
                if activate:
                    print(f"[OK] Behavior Implementation {name} activated")
                return result
            return result
        except Exception as e:
            print(f"[ERROR] {str(e)}")
            return {'success': False, 'error': str(e)}


# Example usage
if __name__ == '__main__':
    # Create client
    client = SAPClient()

    # Download object
    # client.download_object('ZAI_CL_AI_CLIENT', 'class')

    # Push object
    # client.push_object('ZAI_CL_AI_CLIENT', 'class', 'IEDK934921')

    # Search
    # results = client.search_objects('ZAI*', max_results=50)

    # List package
    # objects = client.list_package_contents('ZAI')

    # Create object
    # client.create_object('class', 'ZCL_TEST', 'ZAI', 'Test class', 'IEDK934921')

    # Syntax check
    # client.syntax_check('ZAI_CL_AI_CLIENT', 'class')

    # List transports
    # client.list_user_transports()

    print("\nSAP Client ready. Import and use methods as needed.")

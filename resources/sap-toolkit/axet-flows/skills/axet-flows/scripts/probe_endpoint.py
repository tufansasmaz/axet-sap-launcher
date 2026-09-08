"""Is a published aXet.flows HTTP endpoint actually reachable, and is the LLM answering?

    set AXET_FLOWS_TOKEN=<okta access token>
    py probe_endpoint.py --url https://<host>/flows/cloud/<id>/api/llm-enabler/v2
    py probe_endpoint.py --url ... --probe-only        # reachability only, no model call

"It deploys and nothing happens" has four completely different causes that look
identical from a browser: the version was deployed but never PUBLISHED, the platform
refused the request in its own middleware so no node of yours ever ran, the token
never passed Okta, or it reached the model and the model call failed. This
distinguishes them, and says which one in words.

The second is the one that wastes days, because the flow is blameless and the error
arrives in the platform's envelope rather than yours - see `platform_error()`.

Two stages, cheapest first:

  1. REACHABILITY - POST an empty body. The gateway's own `build messages` Function
     answers 400 bad_request. That 400 is the good outcome: it proves the request got
     through Okta AND the flow executed. It costs no model tokens.
  2. CONSUMPTION  - POST a real message and check an answer comes back.

Stdlib only, so it runs on any Python. No URL and no token live in this file: the
endpoint differs per deployment and the token per person, so both come from the
environment or the command line.
"""
import argparse
import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.request

# The console on a Turkish Windows machine is cp1254. Anything printed that is
# not plain ASCII kills the process there -- including text this file never sees
# in its own source, because a Turkish path or object name arrives through a
# variable. The work is finished by then, so the output lands on disk and the
# consultant still reads a traceback and reports the tool as broken.
# See scripts/test_skill_scripts.py for the three times this was found and
# locally fixed before it was made an invariant.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

TOKEN_ENV = "AXET_FLOWS_TOKEN"
BASE_ENV = "AXET_FLOWS_ENDPOINT"

# exit codes, so this can gate a pipeline
OK_CONSUMING = 0
REACHABLE_NOT_CONSUMING = 1
NOT_REACHABLE = 2
BAD_USAGE = 3
BLOCKED_BEFORE_FLOW = 4


def call(url, token, body, timeout, correlation):
    """POST json, return (status, parsed_or_text, elapsed_ms). Never raises for HTTP."""
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    req.add_header("x-correlation-id", correlation)
    if token:
        req.add_header("Authorization", "Bearer " + token)

    started = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", "replace")
            status = resp.getcode()
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", "replace")
        status = exc.code
    except urllib.error.URLError as exc:
        reason = exc.reason
        if isinstance(reason, ssl.SSLError) or "CERTIFICATE" in str(reason).upper():
            print("ERROR TLS verification failed: %s" % reason)
            print("      On a corporate laptop this is usually the proxy's own CA,")
            print("      not a broken endpoint. Point Python at the company bundle:")
            print("        set SSL_CERT_FILE=<path to the corporate CA .pem>")
            print("      Do not disable verification to get past it.")
        else:
            print("ERROR could not reach %s: %s" % (url, reason))
            print("      Check the host, your VPN, and that the URL came from the")
            print("      deployment panel rather than being composed by hand.")
        sys.exit(NOT_REACHABLE)

    elapsed = int((time.time() - started) * 1000)
    try:
        return status, json.loads(raw), elapsed
    except ValueError:
        return status, raw, elapsed


def error_code(payload):
    if isinstance(payload, dict) and isinstance(payload.get("error"), dict):
        return payload["error"].get("code", "")
    return ""


def platform_error(payload):
    """The PLATFORM's error envelope, which is not the flow's.

    Your flow answers {"error": {"code": "...", "message": ..., "traceId": ...}}.
    The platform answers {"error": true, "code": <int>, "httpStatus": <int>,
    "message": "..."} - and when it does, the request died in the gateway's own
    middleware and NOT ONE NODE OF YOUR FLOW RAN. Telling the two apart is the
    whole difference between "my flow has a bug" and "my flow was never called".
    """
    if isinstance(payload, dict) and payload.get("error") is True \
            and "httpStatus" in payload:
        return str(payload.get("message") or "")
    return None


def verdict(status, payload):
    """(state, headline, explanation). state: flow | blocked | none.

    'flow'    - the request reached your nodes; the answer is yours.
    'blocked' - the route exists but the platform refused before your flow ran.
    'none'    - nothing of yours was involved at all.
    """
    code = error_code(payload)

    blocked = platform_error(payload)
    if blocked is not None:
        why = ("The route IS registered - a path that does not exist answers 404 from "
               "the runtime, and this did not. But the platform refused the request in "
               "its own middleware, so NO NODE OF YOUR FLOW RAN. Fix the platform side; "
               "there is nothing wrong with your wiring to find.")
        low = blocked.lower()
        if "credential" in low and "app node" in low:
            why = ("The app node's auth configuration is INCOMPLETE, and no token will "
                   "help - not even a valid one. Two causes, both fixable in the JSON:\n"
                   "  1. `authConfig` says Okta but `oktaDb` is empty, so it points at "
                   "no auth config node at all;\n"
                   "  2. `oktaDb` points at a `deptapps-app-auth-okta` node that is "
                   "missing `dbEngineType`. It is declared required, and an auth node "
                   "copied from an older export does not have it. Set it to "
                   "\"localStorage\" (or \"noSQL\"), add `autoConfigured: true`, "
                   "redeploy AND republish. Verified live on 2026-09-01: that one "
                   "field turned this 500 into the 400 below, which is the correct "
                   "answer for a call with no token.")
        elif "credential" in low and "mandatory" in low:
            why = ("This is the GOOD failure. The app node is configured correctly and "
                   "the platform is doing its job: the endpoint is `public: false`, you "
                   "sent no bearer token, so Okta refused. Set AXET_FLOWS_TOKEN to an "
                   "access token for THIS app's Okta client and run again. Nothing to "
                   "fix in the flow.")
        return "blocked", "BLOCKED BEFORE THE FLOW - %s" % blocked, why

    if status in (301, 302, 303, 307, 308):
        return "none", "NOT REACHABLE - redirected", (
            "A redirect on an API call means Okta answered, not the flow. Either the "
            "token is missing/rejected, or the app node has no Okta configuration "
            "(oktaDb empty) so there is nothing to validate against.")
    if status == 401 or status == 403:
        return "none", "NOT REACHABLE - rejected by auth", (
            "The token did not satisfy the endpoint's security config. Check it is an "
            "access token for THIS app's Okta client, and that your user holds one of "
            "the roles on the http-in security config.")
    if status == 404:
        return "none", "NOT REACHABLE - no such route", (
            "Deploy does not create a URL; PUBLICATION does. Either this version was "
            "never published, or the base is wrong - read it off the deployment panel "
            "rather than composing it from the app name.")
    if status == 400 and code == "bad_request":
        return "flow", "REACHABLE - your flow ran", (
            "This 400 came from the flow's own validation, which means the request "
            "passed Okta and the flow executed. That is the result we wanted here.")
    if status == 502 or code == "llm_gateway_failed":
        return "flow", "REACHABLE, model call FAILED", (
            "The request reached the model and the call failed. Check slug and "
            "projectid on the enabler-llm node, and that the project's budget and "
            "node activation are in order.")
    if 200 <= status < 300:
        return "flow", "REACHABLE - your flow ran", "The endpoint answered."
    if status >= 500:
        return "flow", "REACHABLE, server error inside the flow", (
            "This 500 did not carry the platform envelope, so it came from inside "
            "the flow. If there is no catch node on the tab, this is what an "
            "unhandled error looks like.")
    return "none", "UNCLEAR (HTTP %d)" % status, (
        "Not a status this endpoint's contract describes. Read the body below.")


def show(label, status, payload, elapsed):
    print("  %-14s HTTP %s in %d ms" % (label, status, elapsed))
    text = json.dumps(payload, indent=2, ensure_ascii=False) \
        if not isinstance(payload, str) else payload
    for line in text.splitlines()[:20]:
        print("    " + line[:160])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default=os.environ.get(BASE_ENV, ""),
                    help="full endpoint URL; or set %s" % BASE_ENV)
    ap.add_argument("--token-env", default=TOKEN_ENV,
                    help="environment variable holding the Okta access token "
                         "(default: %s)" % TOKEN_ENV)
    ap.add_argument("--message", default="Reply with the single word: pong.")
    ap.add_argument("--system", default="You are a terse test harness.")
    ap.add_argument("--probe-only", action="store_true",
                    help="stage 1 only - proves reachability, spends no model tokens")
    ap.add_argument("--timeout", type=int, default=120,
                    help="seconds; a cold model call is slower than you expect")
    args = ap.parse_args()

    if not args.url:
        print("ERROR no endpoint. Pass --url or set %s." % BASE_ENV)
        print("      Take the URL from the deployment panel; both")
        print("      /flows/cloud/<app-name>/... and /flows/cloud/<deptapp-id>/...")
        print("      have been seen, so do not compose it from the app name.")
        sys.exit(BAD_USAGE)

    token = os.environ.get(args.token_env, "")
    if not token:
        print("WARN  %s is empty - calling without an Authorization header." %
              args.token_env)
        print("      Expect a redirect or 401 unless the endpoint is public, which")
        print("      for an LLM gateway it must not be. Running anyway: an")
        print("      unauthenticated call still tells you whether the route exists.")

    run = str(int(time.time()))
    print("endpoint: %s" % args.url)
    print("token:    %s" % ("present (%d chars)" % len(token) if token else "ABSENT"))
    print()

    print("stage 1 - reachability (empty body, no model tokens spent)")
    status, payload, elapsed = call(args.url, token, {}, args.timeout,
                                    "probe-" + run)
    show("probe", status, payload, elapsed)
    state, headline, why = verdict(status, payload)
    print()

    consumed = False
    answer = None
    if state == "flow" and not args.probe_only:
        print("stage 2 - consumption (a real model call)")
        body = {"message": args.message, "system": args.system,
                "context": {"caller": "probe_endpoint.py"}}
        status2, payload2, elapsed2 = call(args.url, token, body, args.timeout,
                                           "smoke-" + run)
        show("call", status2, payload2, elapsed2)
        state, headline2, why2 = verdict(status2, payload2)
        if isinstance(payload2, dict) and payload2.get("answer"):
            consumed = True
            answer = payload2
        else:
            headline, why = headline2, why2
        print()

    print("=" * 68)
    if consumed:
        print("RESULT: PASS - the LLM is consumable from this endpoint")
        print("  answer:    %r" % str(answer.get("answer"))[:120])
        print("  model:     %s" % answer.get("model"))
        print("  traceId:   %s" % answer.get("traceId"))
        print("  latencyMs: %s" % answer.get("latencyMs"))
        code = OK_CONSUMING
    elif state == "flow" and args.probe_only:
        print("RESULT: PASS (reachability only) - %s" % headline)
        print("  %s" % why)
        print("  Re-run without --probe-only to prove the model answers.")
        code = OK_CONSUMING
    elif state == "flow":
        print("RESULT: PARTIAL - endpoint reachable, LLM did not answer")
        print("  %s" % headline)
        print("  %s" % why)
        code = REACHABLE_NOT_CONSUMING
    elif state == "blocked":
        print("RESULT: FAIL - %s" % headline)
        print("  %s" % why)
        print("  The route exists, so deployment and publication are NOT the problem.")
        code = BLOCKED_BEFORE_FLOW
    else:
        print("RESULT: FAIL - %s" % headline)
        print("  %s" % why)
        code = NOT_REACHABLE
    print("=" * 68)
    sys.exit(code)


if __name__ == "__main__":
    main()

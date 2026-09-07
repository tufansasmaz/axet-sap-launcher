// Ana sürecin İngilizce metinleri. `tr.ts` ile anahtar kümesi BİREBİR aynı
// olmalı — `mt()` eksik anahtarda Türkçe'ye düşer, yani bir unutma sessizce
// İngilizce arayüzde Türkçe metin olarak görünür.
export const MAIN_EN = {
  // --- shared ---
  "common.detailSuffix": " Details: {tail}",
  // --- axet-code CLI (shared by several files) ---
  "axetCode.runTimeout": "axet-code run timed out (120s).",
  "axetCode.cliNotFound": 'axet-code CLI not found (not on PATH). Verify that "axet-code -v" works.',
  "axetCode.exitCode": "axet-code exit code: {code}",
  "axetCode.runExitCode": "axet-code run finished with code {code}.",
  "axetCode.testTimeout": "axet-code did not answer within {seconds}s; the test was stopped.",

  // --- dictation.ts ---
  "dictation.whisperExitCode": "whisper exit code {code}",

  // --- manualSystems.ts ---
  "manualSystems.invalidFormat": "Invalid file format: a JSON array was expected.",

  // --- sapLandscape.ts ---
  "sapLandscape.unnamed": "Unnamed",

  // --- updater.ts ---
  "updater.devModeOnly": "Update checks only work in the packaged app (not in dev mode).",

  // --- chatAttachments.ts ---
  "chatAttachments.readFailed": "File contents could not be read.",
  "chatAttachments.tooLarge": "File is too large (20MB limit).",

  // --- agenticConnectors.ts ---
  "agenticConnectors.noToolCalled":
    "The agent reported success but did not call a single connector tool this round — the result could not be verified, so no connection was opened.",

  // --- axetFlowsLiveDiscovery.ts ---
  "flowsLive.windowsOnly": "Automatic discovery is currently supported on Windows only.",
  "flowsLive.appNotRunning": "No running aXet.flows desktop app was found (aXet.flows.exe). Start it first.",
  "flowsLive.portUnverified": "aXet.flows.exe is running but the Designer interface port could not be verified (it may not be fully started yet).",

  // --- axetFlowsLiveSave.ts ---
  "flowsLiveSave.requestTimeout": "The request timed out.",
  "flowsLiveSave.noInstance": "No running aXet.flows Live instance was found.",
  "flowsLiveSave.listFailed": "Existing flows could not be read: {detail}",
  "flowsLiveSave.listFailedHttp": "Existing flows could not be read (HTTP {status}).",
  "flowsLiveSave.saveFailed": "Could not save to Live: {detail}",
  "flowsLiveSave.saveRejected": "The Live host rejected the save (HTTP {status}){detail}.",

  // --- axetChatTui.ts ---
  "chatTui.sessionDbUnreadable": "session database cannot be read: {detail}",
  "chatTui.sessionDbMissing": "there is no axet-code session database for this folder",
  "chatTui.askFallbackQuestion": "I need you to make a choice before I can continue.",
  "chatTui.sessionClosedUnexpectedly": "The axet-code session closed unexpectedly.",
  "chatTui.turnTimedOut": "axet-code has shown no sign of activity for {minutes} minutes.",
  "chatTui.restartStillFailing": "The axet-code session was restarted but the error persists ({failure}).",

  // --- fsExplorer.ts ---
  "fsExplorer.notAFile": "This is a folder, not a file.",
  "fsExplorer.notText": "This file cannot be displayed as text (binary content).",
  "fsExplorer.parentMissing": "The target folder was not found.",
  "fsExplorer.unknownImageType": "Unknown image type.",
  "fsExplorer.imageTooLarge": "The image is too large to preview.",

  // --- sapGuiScriptClient.ts ---
  "guiScriptClient.requestTimeout": "The SAP GUI Scripting bridge request timed out.",
  "guiScriptClient.diagnosticsFailed": "Diagnostics could not be run.",
  "guiScriptClient.screenStateFailed": "The screen state could not be read.",
  "guiScriptClient.screenshotFailed": "The screenshot could not be taken.",
  "guiScriptClient.connectionListFailed": "The connection list could not be retrieved.",
  "guiScriptClient.sessionListFailed": "The session list could not be retrieved.",
  "guiScriptClient.elementReadFailed": "The screen element could not be read.",
  "guiScriptClient.actionFailed": "The action could not be applied.",

  // --- connectivity.ts ---
  "connectivity.reachable": "System reachable",
  "connectivity.timeout": "Timed out — the VPN may not be connected",
  "connectivity.refused": "Could not connect — check the VPN",
  "connectivity.invalidUrl": "Invalid ADT URL",
  "connectivity.reachableViaRouter": "System reachable through SAProuter",
  "connectivity.hostUnresolved": "Host/port information could not be resolved",

  // --- sapGuiScriptManager.ts ---
  "guiScriptManager.pywin32Missing":
    "pywin32 not found — the bundled SAP GUI Scripting runtime (resources/guiscript-runtime) may be broken or incomplete; reinstall the app.",
  "guiScriptManager.windowsOnly": "SAP GUI Scripting only works on Windows.",
  "guiScriptManager.portInUse": "Port {port} is in use by another process.",
  "guiScriptManager.exitedEarly": "the process exited early ({detail}).",
  "guiScriptManager.pythonMissing": "the bundled Python executable was not found — the app installation may be broken.",
  "guiScriptManager.alreadyRunning": "The SAP GUI Scripting bridge is already running.",
  "guiScriptManager.externalOnPort": "A SAP GUI Scripting bridge is already running on this port (started by another process)",
  "guiScriptManager.spawnFailed": "The SAP GUI Scripting bridge process could not be started ({pythonPath}): {detail}",
  "guiScriptManager.didNotStart": "The SAP GUI Scripting bridge did not come up on port {port}. {detail}",
  "guiScriptManager.started": "SAP GUI Scripting bridge started (http://127.0.0.1:{port}).",

  // --- adtReadonlyServerManager.ts ---
  "adtServer.requestsMissing": "`requests` is not installed.",
  "adtServer.mcpMissing": "The `mcp` package is not installed.",
  "adtServer.dotenvMissing": "`python-dotenv` is not installed.",
  "adtServer.someDepMissing": "A Python dependency is not installed.",
  "adtServer.portInUse": "Port {port} is in use by another process.",
  "adtServer.exitedEarly": "the process exited early ({detail}).",
  "adtServer.pythonMissing": "The python executable was not found (is `py` on PATH?).",
  "adtServer.failureWithHint":
    "{hint}{detail} To run it by hand: `pip install -r requirements.txt`, then ADT_CWD=<project folder> py adt_readonly_server.py --port {port}.",
  "adtServer.didNotStart": "The server did not come up on port {port}.{detail}",
  "adtServer.alreadyRunning": "The ADT read-only server is already running; it was not restarted.",
  "adtServer.externalOnPort": "An ADT read-only server was found already running on this port (started by another process).",
  "adtServer.spawnFailed": "The ADT read-only server process could not be started ({pythonPath}): {detail}",
  "adtServer.started": "ADT read-only server started (http://127.0.0.1:{port}).",

  // --- rfcBridgeManager.ts ---
  "rfcBridge.pyrfcMissingEmbedded": "pyrfc not found — the bundled RFC runtime (resources/rfc-runtime) may be broken or incomplete; reinstall the app.",
  "rfcBridge.pyrfcMissing": "pyrfc is not installed and the bundled RFC runtime was not found — reinstall the app.",
  "rfcBridge.sdkLoadFailedEmbedded": "The bundled SAP NW RFC SDK DLLs could not be loaded — the app installation may be broken; reinstall it.",
  "rfcBridge.sdkLoadFailed": "The SAP NW RFC SDK could not be loaded and the bundled RFC runtime was not found — reinstall the app.",
  "rfcBridge.homeNotSet": "The SAPNWRFC_HOME environment variable is not set.",
  "rfcBridge.dotenvMissing": "python-dotenv is not installed.",
  "rfcBridge.logonError": "This may be an RFC logon error — check the username, password and route.",
  "rfcBridge.exitedEarly": "the process exited early ({detail}).",
  "rfcBridge.pythonMissingEmbedded": "the bundled Python executable was not found — the app installation may be broken.",
  "rfcBridge.pythonMissing": "the python executable was not found and there is no bundled RFC runtime — reinstall the app.",
  "rfcBridge.alreadyRunning": "The RFC bridge is already running; it was not restarted.",
  "rfcBridge.spawnFailed": "The RFC bridge process could not be started ({pythonPath}): {detail}",
  "rfcBridge.didNotStart": "The RFC bridge did not come up on port {port}. {detail}",
  "rfcBridge.started": "RFC bridge started (http://127.0.0.1:{port}).",

  // --- sapRouter.ts ---
  "sapRouter.unexpectedResponse": "SAProuter did not accept the route (response: {type}).",
  "sapRouter.unexpectedResponseUnknown": "unknown",
  "sapRouter.permissionDenied":
    "SAProuter REJECTED this route ({tag}, return_code={returnCode} — there is no entry for this source/target/port in the " +
    "permission table; depending on the router version this can come back as -94/NIEROUT_PERM_DENIED or as another code such " +
    "as -93, both meaning the same \"permission denied\"). This is not a software fault: the router administrator (the Basis / " +
    "network team) has to add a raw (native) tunnelling permission from this machine's public IP to the target host:port in the " +
    "saprouttab permission table — SAP GUI's DIAG connection (the native SAP NI protocol) may already work under a different " +
    "permission scope, but ADT/HTTPS traffic needs its own P/S saprouttab line. Details: {detail}",
  "sapRouter.rejected": "SAProuter rejected the route (return_code={returnCode}). Details: {detail}",
  "sapRouter.noDetail": "none",
  "sapRouter.routeTooShort": "A router route must contain at least one router hop and a target.",
  "sapRouter.connectTimeout": "The SAProuter connection timed out ({host}:{port})",
  "sapRouter.connectFailed": "Could not connect to SAProuter ({host}:{port}): {detail}",
  "sapRouter.tlsTimeout": "The TLS handshake timed out (through SAProuter).",
  "sapRouter.httpTimeout": "The HTTP request timed out (through SAProuter).",
  "sapRouter.invalidHttpResponse": "Invalid HTTP response (through SAProuter).",

  // --- launcher.ts (RFC bridge outcome notes) ---
  // NOTE: launcher's TOP-LEVEL user-facing messages already live in its own
  // bilingual `connectMsg()` table. These are the `rfcOutcome.detailNote`
  // chain — that text is interpolated into `connectMsg`'s {detail} parameter
  // and shown in the toast, so the table was bilingual while the text going
  // into it stayed Turkish. `discoveryNotes`/`sap-context.md` are NOT in this
  // scope: they are the technical log axet-code reads, never shown to the user
  // (see the comment at the top of launcher.ts).
  "launcher.rfcRouteDeniedHint":
    "SAProuter is rejecting RFC/gateway traffic as well — Basis needs to add a separate RFC permission line (P) for this " +
    "ashost:sysnr to saprouttab. This is not a credential problem.",
  "launcher.rfcTimeoutHint":
    "This is a \"timeout\" — the router did not reject the packet OUTRIGHT (no NI_RTERR/-94/-93), it silently left it " +
    "unanswered. Most likely the router's permission table allows the DIAG/dispatcher port SAP GUI uses (e.g. 3200) but not " +
    "the GATEWAY port the RFC client actually connects to (33xx with the same instance number, e.g. 3300 — a DIFFERENT port " +
    "from DIAG). Point this distinction out to the Basis/network team explicitly: the gateway port, not the dispatcher. " +
    "This is not a credential problem.",
  "launcher.rfcCommFailureHint":
    "The RFC connection itself could not reach the application server/gateway through the router — most likely the RFC " +
    "permission in Basis's saprouttab, or a wrong ashost/sysnr. This is not a credential problem.",
  "launcher.rfcLogonRejectedHint":
    "The RFC logon itself was rejected — check the username/password/client for this system specifically (RFC logon can " +
    "behave differently from the HTTP Basic Auth check).",
  "launcher.rfcScriptMissing":
    "adt_rfc_bridge.py was not found (the SAP toolkit does not appear to be installed) — the RFC bridge could not be started " +
    "automatically, see the manual setup.",
  "launcher.rfcStartFailed": "The RFC bridge could not be started automatically: {detail}",
  "launcher.rfcStartedVerified": "The RFC bridge started automatically ({url}) and the credentials were verified over RFC ✓.",
  "launcher.rfcStartedAuthFailed": "The RFC bridge is running ({url}) but authentication failed: {detail}",
  "launcher.rfcStartedUnverified":
    "The RFC bridge started ({url}) but authentication could not be completed ({detail}) — the bridge is still running, you " +
    "can retry with %sap-adt-readonly.{hint}",

  // --- index.ts ---
  "app.unexpectedErrorTitle": "NTT Studio — Unexpected Error",
  "app.windowNotReady": "The window is not ready",
  "app.clipboardNotAString": "text is not a string",
  "explorer.folderAccessDenied": "You do not have access to this folder.",
  "explorer.fileAccessDenied": "You do not have access to this file.",
  "flows.notDeployed": "The flow has not been deployed (no HTTP server is running).",
  "flows.requestTimeout": "The request timed out.",
  "guiScript.runtimeMissing":
    "The embedded SAP GUI Scripting runtime (resources/guiscript-runtime) was not found — the app installation may be " +
    "incomplete or damaged.",
  "guiScript.bridgeNotRunning": "The bridge is not running — start it first.",

  // --- index.ts: operating-system file dialogs ---
  // The dialog TITLE is app UI; the CONTENT of the exported file
  // (chatExport.ts / chatPrint.ts) is out of scope by user request.
  "dialog.exportManualSystems": "Export Manual Systems",
  "dialog.importManualSystems": "Import Manual Systems",
  "dialog.exportChat": "Export chat",
  "dialog.exportChatFailed": "The chat could not be exported",
  "dialog.saveFlowJson": "Save aXet.flows as JSON",
  "dialog.openFlowJson": "Open aXet.flows JSON file",
  "dialog.exportDebugJson": "Export debug recording as JSON",
  "dialog.saveGuiScriptJson": "Save SAP GUI Scripting recording as JSON",
  "dialog.openGuiScriptJson": "Open SAP GUI Scripting recording"
} as const;

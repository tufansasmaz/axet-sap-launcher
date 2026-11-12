/* fiori-mockup -- the behaviour every mock-up shares. Inlined by scripts/mockup.py.
   A page marks its screens and dialogs up with data-state, calls these helpers from its buttons,
   and keeps its own data and rules.

   <div class="app" data-state="1" data-label="Orders">              a screen (List Report, Object Page, ...)
   <div class="dlg" data-state="2a" data-label="Value help"
        data-base="2" id="dlgVH">                                      a dialog over screen 2

   MOCKUP_PREPARE (optional, set by the page): { "2": () => open(1), "2a": () => openVH() } -- how to
   bring a state up the way a user would. The screenshot run uses it, and so does the screen list.

   Two views of the same markup: MOCKUP.setView('desktop'|'phone'); and the annotation overlay:
   MOCKUP.setAnn(true) shows every data-ann="@UI.lineItem" as a badge on the part it drives. */
(function () {
  const $ = (id) => document.getElementById(id);
  window.$ = window.$ || $;

  function states() {
    return [...document.querySelectorAll("[data-state]")].map((el) => ({
      id: el.dataset.state, label: el.dataset.label || el.dataset.state,
      pop: el.classList.contains("dlg"), base: el.dataset.base || null, el,
    }));
  }

  function nav(current) {
    document.querySelectorAll(".stepnav span[data-go]").forEach((s) =>
      s.classList.toggle("on", s.dataset.go === current));
  }

  function goScreen(id) {
    closeDlg();
    document.querySelectorAll(".app[data-state]").forEach((w) =>
      w.classList.toggle("hidden", w.dataset.state !== id));
    nav(id);
  }

  function openDlg(id) {
    const el = $(id) || document.querySelector(`.dlg[data-state="${id}"]`);
    if (!el) return;
    let veil = $("veil");
    if (!veil) {
      veil = document.createElement("div");
      veil.id = "veil"; veil.className = "veil"; veil.onclick = closeDlg;
      document.body.appendChild(veil);
    }
    veil.style.display = "block";
    el.style.display = "block";
    if (el.dataset.state) nav(el.dataset.state);
  }

  function closeDlg() {
    const veil = $("veil");
    if (veil) veil.style.display = "none";
    document.querySelectorAll(".dlg").forEach((p) => (p.style.display = "none"));
  }

  // The message strip on a screen: type s (success), w (warning), e (error), i (information).
  function msg(id, type, text) {
    const m = $(id);
    if (!m) return;
    m.className = "msg " + type;
    m.textContent = text;
  }

  let toastTimer = null;
  function toast(text) {
    let t = $("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
    t.textContent = text; t.style.display = "block";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.style.display = "none"), 2400);
  }

  // Object Page edit / display: fields marked data-editable are read-only until editing starts.
  function setEdit(id, on) {
    const app = $(id);
    if (!app) return;
    app.classList.toggle("editing", !!on);
    app.querySelectorAll("[data-editable]").forEach((f) => { f.readOnly = !on; if (f.tagName === "SELECT") f.disabled = !on; });
  }

  // Anchor bar: show one section of an Object Page (a long page would not fit a picture).
  function showSection(appId, secId) {
    const app = $(appId);
    if (!app) return;
    app.querySelectorAll(".op-section").forEach((s) => s.classList.toggle("hidden", s.id !== secId && secId !== "all"));
    app.querySelectorAll(".anchor button").forEach((b) => b.classList.toggle("on", b.dataset.sec === secId));
  }

  function selectRow(tr) {
    const tb = tr.closest("tbody");
    tb.querySelectorAll("tr.sel").forEach((r) => r.classList.remove("sel"));
    tr.classList.add("sel");
  }

  function setView(v) {
    document.body.classList.toggle("phone", v === "phone");
    document.querySelectorAll(".mockbar [data-view]").forEach((b) => b.classList.toggle("on", b.dataset.view === v));
  }
  function setAnn(on) {
    document.body.classList.toggle("ann-on", !!on);
    const c = document.querySelector(".mockbar #annToggle");
    if (c) c.checked = !!on;
  }

  function go(id) {
    const st = states().find((s) => s.id === id);
    if (!st) return false;
    const prep = (window.MOCKUP_PREPARE || {})[id];
    if (st.pop) {
      if (st.base) go(st.base);
      if (prep) prep(); else openDlg(st.el.id || id);
    } else {
      goScreen(id);
      if (prep) prep();
      goScreen(id);                      // a prepare may have moved on; come back
    }
    return true;
  }

  // The frame above the mock-up: the view switch, the annotation switch and the screen list. Built
  // from the markup, so it can never name a screen that is not there.
  function buildBar() {
    const bar = document.querySelector(".mockbar");
    if (bar && !bar.children.length) {
      bar.innerHTML = '<span class="seg"><button data-view="desktop" class="on">Desktop</button>' +
        '<button data-view="phone">Phone</button></span>' +
        '<label><input type="checkbox" id="annToggle"> Annotations</label>';
      bar.querySelectorAll("[data-view]").forEach((b) => (b.onclick = () => setView(b.dataset.view)));
      bar.querySelector("#annToggle").onchange = (e) => setAnn(e.target.checked);
    }
    const sn = document.querySelector(".stepnav");
    if (sn && !sn.children.length) {
      states().forEach((s) => {
        const span = document.createElement("span");
        span.dataset.go = s.id;
        span.textContent = `${s.id} · ${s.label}${s.pop ? " (dialog)" : ""}`;
        span.onclick = () => go(s.id);
        sn.appendChild(span);
      });
    }
  }

  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDlg(); });

  document.addEventListener("DOMContentLoaded", () => {
    buildBar();
    const first = states().find((s) => !s.pop);
    if (first) goScreen(first.id);
  });

  window.MOCKUP = { states: () => states().map(({ el, ...s }) => s), go, goScreen, openDlg, closeDlg,
                    msg, toast, setView, setAnn, setEdit, showSection };
  Object.assign(window, { goScreen, openDlg, closeDlg, msg, toast, setEdit, showSection, selectRow });
})();

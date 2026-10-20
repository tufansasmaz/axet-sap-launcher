/* screen-mockup -- the behaviour every mock-up shares. Inlined by
   scripts/mockup.py. A page marks its screens and popups up with data-state,
   calls these helpers from its buttons, and keeps its own data and rules.

   <div class="win" data-state="1" data-label="Seçim ekranı">      a screen
   <div class="pop" data-state="2a" data-label="Onay geçmişi"
        data-base="2" id="popHist">                                 a popup over screen 2

   MOCKUP_PREPARE (optional, set by the page): { "2": () => run(),
   "2a": () => { pickFirst(); openHist(); } } -- how to bring a state up the
   way a user would. The screenshot run uses it, and so does the screen list. */
(function () {
  const $ = (id) => document.getElementById(id);
  window.$ = window.$ || $;

  function states() {
    return [...document.querySelectorAll("[data-state]")].map((el) => ({
      id: el.dataset.state, label: el.dataset.label || el.dataset.state,
      pop: el.classList.contains("pop"), base: el.dataset.base || null, el,
    }));
  }

  function nav(current) {
    document.querySelectorAll(".stepnav span[data-go]").forEach((s) =>
      s.classList.toggle("on", s.dataset.go === current));
  }

  function goScreen(id) {
    closePop();
    document.querySelectorAll(".win[data-state]").forEach((w) =>
      w.classList.toggle("hidden", w.dataset.state !== id));
    nav(id);
  }

  function openPop(id) {
    const el = $(id) || document.querySelector(`.pop[data-state="${id}"]`);
    if (!el) return;
    let veil = $("veil");
    if (!veil) {
      veil = document.createElement("div");
      veil.id = "veil"; veil.className = "veil"; veil.onclick = closePop;
      document.body.appendChild(veil);
    }
    veil.style.display = "block";
    el.style.display = "block";
    if (el.dataset.state) nav(el.dataset.state);
  }

  function closePop() {
    const veil = $("veil");
    if (veil) veil.style.display = "none";
    document.querySelectorAll(".pop").forEach((p) => (p.style.display = "none"));
  }

  function msg(id, type, text) {
    const m = $(id);
    if (!m) return;
    m.className = "msg " + type;
    m.textContent = text;
  }

  function go(id) {
    const st = states().find((s) => s.id === id);
    if (!st) return false;
    const prep = (window.MOCKUP_PREPARE || {})[id];
    if (st.pop) {
      if (st.base) go(st.base);
      if (prep) prep(); else openPop(st.el.id || id);
    } else {
      goScreen(id);
      if (prep) prep();
      goScreen(id);                      // a prepare may have moved on; come back
    }
    return true;
  }

  // The screen list above the mock-up is built from the markup, so it can never
  // name a screen that is not there.
  function buildNav() {
    const bar = document.querySelector(".stepnav");
    if (!bar || bar.children.length) return;
    states().forEach((s) => {
      const span = document.createElement("span");
      span.dataset.go = s.id;
      span.textContent = `${s.id} · ${s.label}${s.pop ? " (popup)" : ""}`;
      span.onclick = () => go(s.id);
      bar.appendChild(span);
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePop();
    const key = { F3: "back", F8: "run" }[e.key];
    if (!key) return;
    const visible = document.querySelector(".win[data-state]:not(.hidden)");
    const btn = visible && visible.querySelector(`[data-key="${key}"]`);
    if (btn) { e.preventDefault(); btn.click(); }
  });

  document.addEventListener("DOMContentLoaded", () => {
    buildNav();
    const first = states().find((s) => !s.pop);
    if (first) goScreen(first.id);
  });

  window.MOCKUP = { states: () => states().map(({ el, ...s }) => s), go, goScreen,
                    openPop, closePop, msg };
  Object.assign(window, { goScreen, openPop, closePop, msg });
})();

// Scalable white box (after Developer-Path's panel), image source numbers, and the Index's current-section mark.
(function () {
  const root = document.documentElement, box = document.getElementById("box"),
    index = document.getElementById("index"), srcs = document.getElementById("srcs"), brief = document.getElementById("brief");
  const narrow = matchMedia("(max-width:900px)");
  // Safari (macOS) and every iPhone/iPad browser get script-placed text layers instead of screen-fixed ones.
  // Add ?nofixed to the address to try that path in any browser.
  const ua = navigator.userAgent;
  const iOS = /iP(hone|ad|od)/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const safari = /AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/.test(ua);
  const NOFIXED_BASE = iOS || safari || /[?&]nofixed/.test(location.search);
  const nofixed = () => NOFIXED_BASE || narrow.matches;   // phones too
  root.classList.toggle("nofixed", nofixed());
  narrow.addEventListener("change", () => root.classList.toggle("nofixed", nofixed()));
  const LAYERED = ".flip, #index a, #srcs a, #index .reset, #index .scale button, #index .scale span, #index .view button, main p, main h1, main h2, main figcaption, main .pending, main .row > div";
  function syncLayers() {   // tell each visible text element where it sits on screen
    if (!nofixed()) return;
    const H = innerHeight;
    for (const el of document.querySelectorAll(LAYERED)) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -50 || r.top > H + 50) continue;
      el.style.setProperty("--ox", r.left + "px"); el.style.setProperty("--oy", r.top + "px");
    }
  }
  addEventListener("scroll", syncLayers, { passive: true }); addEventListener("resize", syncLayers);
  // Which kind of pointer was used last (mouse, pen or touch), and double-tap detection for touch screens.
  var lastPointer = "mouse", lastTap = { t: 0, x: 0, y: 0 };
  addEventListener("pointerdown", e => { lastPointer = e.pointerType; }, true);

  // --- Invert: double-click the white box (double-tap the window on phones) to swap the page and box colours.
  try { if (localStorage.getItem("ns-invert") === "1") root.classList.add("inverted"); } catch (e) {}
  // iPhones report one double-tap twice (a touch double-tap and a dblclick), so a second invert within 600ms is ignored
  let lastInvert = 0;
  function invert() {
    const now = performance.now();
    if (now - lastInvert < 600) return;
    lastInvert = now;
    const on = root.classList.toggle("inverted");
    try { if (on) localStorage.setItem("ns-invert", "1"); else localStorage.removeItem("ns-invert"); } catch (e) {}
  }
  function inWhite(x, y) {   // is this point on the white box?
    const cs = getComputedStyle(root), v = p => parseFloat(cs.getPropertyValue(p)) || 0;
    const bx = v("--x"), by = v("--y");
    return x >= bx && x <= bx + v("--w") && y >= by && y <= by + v("--h");
  }

  // --- White box, fixed to the screen. Stored as fractions of the window so it keeps its place when the window resizes.
  const MIN = 12;
  let fx = 0, fy = 0, fw = 1, fh = 1;   // starts filling the screen, so the site opens on white
  try { const s = JSON.parse(localStorage.getItem("ns-box2") || "null"); if (s && s.fw > 0 && s.fh > 0) ({ fx, fy, fw, fh } = s); } catch (e) {}
  const vw = () => root.clientWidth, vh = () => window.innerHeight;
  function set() {
    if (narrow.matches) {   // phones: the scroll-through window, 72% wide and 30% tall, centred
      const W = vw(), H = vh(), w = Math.round(W * 0.72), h = Math.round(H * 0.3);
      root.style.setProperty("--x", Math.round((W - w) / 2) + "px"); root.style.setProperty("--y", Math.round((H - h) / 2) + "px");
      root.style.setProperty("--w", w + "px"); root.style.setProperty("--h", h + "px");
      box.classList.remove("full", "selected"); syncLayers(); return;
    }
    const W = vw(), H = vh();
    let w = Math.max(MIN, Math.min(W, fw * W)), h = Math.max(MIN, Math.min(H, fh * H));
    let x = Math.max(0, Math.min(W - w, fx * W)), y = Math.max(0, Math.min(H - h, fy * H));
    fx = x / W; fy = y / H; fw = w / W; fh = h / H;
    root.style.setProperty("--x", x + "px"); root.style.setProperty("--y", y + "px");
    root.style.setProperty("--w", w + "px"); root.style.setProperty("--h", h + "px");
    box.classList.toggle("full", fw > 0.97 && fh > 0.97);
    syncLayers();
    queueTabs();
  }
  function save() { try { localStorage.setItem("ns-box2", JSON.stringify({ fx, fy, fw, fh })); } catch (e) {} }
  // Drag an edge to move that side; a corner moves its two sides. The opposite sides stay put, so the box scales from any side.
  function apply(which, x0, y0, w0, h0, dx, dy) {
    const W = vw(), H = vh();
    let l = x0, t = y0, r = x0 + w0, b = y0 + h0;
    if (which.includes("w")) l = Math.max(0, Math.min(r - MIN, x0 + dx));
    if (which.includes("e")) r = Math.min(W, Math.max(l + MIN, x0 + w0 + dx));
    if (which.includes("n")) t = Math.max(0, Math.min(b - MIN, y0 + dy));
    if (which.includes("s")) b = Math.min(H, Math.max(t + MIN, y0 + h0 + dy));
    fx = l / W; fy = t / H; fw = (r - l) / W; fh = (b - t) / H;
    set();
  }
  for (const h of box.querySelectorAll(".h")) {
    h.addEventListener("pointerdown", e => {
      try { h.setPointerCapture(e.pointerId); } catch (err) {}
      const W = vw(), H = vh(), x0 = fx * W, y0 = fy * H, w0 = fw * W, h0 = fh * H, px = e.clientX, py = e.clientY;
      const move = ev => apply(h.dataset.h, x0, y0, w0, h0, ev.clientX - px, ev.clientY - py);
      const up = () => { h.removeEventListener("pointermove", move); h.removeEventListener("pointerup", up); h.removeEventListener("pointercancel", up); save(); };
      h.addEventListener("pointermove", move); h.addEventListener("pointerup", up); h.addEventListener("pointercancel", up);
      e.preventDefault();
    });
    // Keyboard: arrow keys move the focused edge.
    h.addEventListener("keydown", e => {
      const k = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] }[e.key];
      if (!k) return;
      const W = vw(), H = vh();
      apply(h.dataset.h, fx * W, fy * H, fw * W, fh * H, k[0], k[1]);
      e.preventDefault(); save();
    });
  }

  // Select and move. Unselected, the box lets every click through to the page. A click on empty space inside it
  // (not a link) selects it; selected, dragging inside moves it, and a plain click still reaches whatever is underneath.
  const inBox = (x, y) => { const r = box.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };
  const fullScreen = () => fw > 0.97 && fh > 0.97;   // nothing to move while it fills the screen
  const select = on => box.classList.toggle("selected", on);
  document.addEventListener("click", e => {
    if (narrow.matches || box.classList.contains("selected")) return;
    if (!fullScreen() && inBox(e.clientX, e.clientY) && !e.target.closest("a, button, figure, #box .h")) select(true);
  });
  document.addEventListener("pointerdown", e => { if (box.classList.contains("selected") && !inBox(e.clientX, e.clientY)) select(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") select(false); });
  box.addEventListener("pointerdown", e => {
    if (e.target !== box || !box.classList.contains("selected")) return;   // handles do their own thing
    try { box.setPointerCapture(e.pointerId); } catch (err) {}
    const W = vw(), H = vh(), x0 = fx * W, y0 = fy * H, px = e.clientX, py = e.clientY;
    let moved = false;
    const move = ev => {
      const dx = ev.clientX - px, dy = ev.clientY - py;
      if (!moved && Math.hypot(dx, dy) < 3) return;
      moved = true;
      fx = Math.max(0, Math.min(W - fw * W, x0 + dx)) / W;
      fy = Math.max(0, Math.min(H - fh * H, y0 + dy)) / H;
      set();
    };
    const up = ev => {
      box.removeEventListener("pointermove", move); box.removeEventListener("pointerup", up); box.removeEventListener("pointercancel", up);
      if (moved) { save(); return; }
      // a plain click: hand it to whatever sits under the box (so links inside it still work)
      box.style.pointerEvents = "none";
      const under = document.elementFromPoint(ev.clientX, ev.clientY);
      box.style.pointerEvents = "";
      const link = under && under.closest("a");
      if (link) link.click();
    };
    box.addEventListener("pointermove", move); box.addEventListener("pointerup", up); box.addEventListener("pointercancel", up);
    e.preventDefault();
  });

  // --- Scale (bottom of the Index, or Alt + scroll): the projects column zooms smoothly from 100% down to 25%.
  // Remembered between visits; Alt + scroll zooms around the pointer so what's under it stays put.
  const STEPS = [1, 0.75, 0.5, 0.35, 0.25], ZMIN = 0.25, ZMAX = 1;
  let zoom = 1;
  try { const v = +localStorage.getItem("ns-zoom"); if (v >= ZMIN && v <= ZMAX) zoom = v; } catch (e) {}
  const Z = () => zoom;
  const zLabel = index.querySelector(".scale .zv");
  const showZoom = () => { root.style.setProperty("--zoom", zoom); zLabel.textContent = Math.round(zoom * 100) + "%"; };
  function applyZoom(v, anchorY = innerHeight / 2) {
    v = Math.max(ZMIN, Math.min(ZMAX, v));
    if (Math.abs(v - zoom) < 1e-4) return;
    const de = document.documentElement, docY = scrollY + anchorY, h0 = de.scrollHeight;
    zoom = v; showZoom();
    try { if (zoom === 1) localStorage.removeItem("ns-zoom"); else localStorage.setItem("ns-zoom", zoom.toFixed(3)); } catch (e) {}
    layout();
    scrollTo(0, docY * de.scrollHeight / h0 - anchorY);
  }
  // the buttons step to the next level from wherever the zoom is now
  index.querySelector(".scale .zo").addEventListener("click", () => applyZoom(STEPS.find(s => s < zoom - 1e-3) ?? ZMIN));
  index.querySelector(".scale .zi").addEventListener("click", () => applyZoom([...STEPS].reverse().find(s => s > zoom + 1e-3) ?? ZMAX));
  let altZoomed = false;
  addEventListener("wheel", e => {
    if (!e.altKey || narrow.matches) return;
    e.preventDefault();
    altZoomed = true;
    applyZoom(zoom * Math.exp(-e.deltaY * 0.0015), e.clientY);
  }, { passive: false });
  // releasing Alt after zooming shouldn't jump focus to the browser's menu
  addEventListener("keyup", e => { if (e.key === "Alt" && altZoomed) { e.preventDefault(); altZoomed = false; } });
  showZoom();

  // --- Images work like the white box: press to select and drag to move; corner tabs scale from any corner
  // (proportions fixed, the opposite corner stays put). Moved images may overlap; the last one touched comes to the front.
  // Per image we keep k (scale of the automatic size), dx/dy (offset from its place in the column) and z (stacking).
  const figs = [...document.querySelectorAll("figure[data-n]")];
  const probe = Object.assign(document.createElement("div"), { style: "position:absolute;visibility:hidden;height:0;width:var(--field)" });
  document.body.appendChild(probe);
  const fieldPx = () => probe.getBoundingClientRect().width;
  let imgs = {};
  try { imgs = JSON.parse(localStorage.getItem("ns-img") || "{}") || {}; } catch (e) {}
  const saveImgs = () => { try { localStorage.setItem("ns-img", JSON.stringify(imgs)); } catch (e) {} };
  let topZ = Math.max(4, ...Object.values(imgs).map(s => s.z || 0));
  const st = f => (imgs[f.dataset.n] ||= { k: 1, dx: 0, dy: 0, z: 0 });
  function paint(f) {
    const s = imgs[f.dataset.n];
    if (!s) { ["--k", "--dx", "--dy"].forEach(p => f.style.removeProperty(p)); f.style.removeProperty("z-index"); return; }
    f.style.setProperty("--k", s.k.toFixed(3)); f.style.setProperty("--dx", s.dx + "px"); f.style.setProperty("--dy", s.dy + "px");
    if (s.z) f.style.zIndex = s.z;
    syncLayers();
    queueTabs();
  }
  let selFig = null;
  function selectFig(f) {
    if (selFig && selFig !== f) selFig.classList.remove("sel");
    selFig = f;
    if (f) { f.classList.add("sel"); const s = st(f); s.z = ++topZ; f.style.zIndex = s.z; }   // bring to the front
  }
  document.addEventListener("pointerdown", e => { if (selFig && !e.target.closest("figure")) selectFig(null); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") selectFig(null); });
  // Double-click anywhere lets go of whatever is selected (an image or the white box), even when the box fills the page.
  document.addEventListener("dblclick", e => {
    // touch screens handle double-taps in the pointerup handler below; this one is for the mouse
    if (lastPointer !== "touch" && inWhite(e.clientX, e.clientY) && !e.target.closest("figure, a, button, #box .h")) invert();
    selectFig(null); select(false); getSelection && getSelection().removeAllRanges();
  });
  document.addEventListener("pointerup", e => {   // double-tap = let go, like double-click
    if (e.pointerType !== "touch") return;
    const now = performance.now();
    if (now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
      if (inWhite(e.clientX, e.clientY) && !e.target.closest("figure, a, button")) invert();
      selectFig(null); select(false); lastTap.t = 0;
    }
    else lastTap = { t: now, x: e.clientX, y: e.clientY };
  });
  const drag = (el, onMove, onEnd) => el.addEventListener("pointerdown", e => {
    if (e.button > 0 || narrow.matches) return;   // phones: no dragging (the simple version)
    if (e.pointerType === "touch" && el.matches("img, video, .pending") && !el.closest("figure").classList.contains("sel")) return;
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
    const x0 = e.clientX, y0 = e.clientY, ctx = onMove.start ? onMove.start(e) : null;
    const move = ev => onMove(ev.clientX - x0, ev.clientY - y0, ctx);
    const up = () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); onEnd && onEnd(); };
    el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    e.preventDefault(); e.stopPropagation();
  });
  for (const f of figs) {
    paint(f);
    const media = f.querySelector("img, video, .pending");
    if (media.tagName === "IMG") media.draggable = false;
    // move: press on the image selects it, and dragging moves it in the same motion
    const mover = (dx, dy, c) => { const s = st(f); s.dx = c.dx + dx / Z(); s.dy = c.dy + dy / Z(); paint(f); };
    mover.start = () => { selectFig(f); const s = st(f); return { dx: s.dx, dy: s.dy }; };
    drag(media, mover, () => { saveImgs(); layout(); });
    // touch: a tap selects the image (its tabs appear); dragging then moves it
    media.addEventListener("click", () => {
      if (narrow.matches) { if (f.dataset.full) open(f.dataset.full, "_blank", "noopener"); return; }   // phones: tap = full size
      if (lastPointer === "touch") selectFig(f);
    });
    // scale: four corner tabs
    for (const c of ["nw", "ne", "sw", "se"]) {
      const t = document.createElement("div");
      t.className = "t " + c; t.title = "Drag to scale";
      f.appendChild(t);
      const scaler = (dx, dy, k0) => {
        const s = st(f), sign = c.includes("w") ? -1 : 1;
        const w = Math.max(0.25 * k0.auto, Math.min(innerWidth / Z(), k0.w + sign * dx / Z()));   // up to the full screen width
        s.k = w / k0.auto;
        const dw = w - k0.w, dh = dw * k0.h / k0.w;
        s.dx = k0.dx - (c.includes("w") ? dw : 0);   // keep the opposite corner where it was
        s.dy = k0.dy - (c.includes("n") ? dh : 0);
        paint(f);
      };
      scaler.start = () => { selectFig(f); const s = st(f), r = media.getBoundingClientRect(); return { w: r.width / Z(), h: r.height / Z(), auto: r.width / Z() / s.k, dx: s.dx, dy: s.dy }; };
      drag(t, scaler, () => { saveImgs(); layout(); });
    }
  }

  // --- Reset (bottom of the Index): images back in the column at their own size, the white box back to full screen.
  index.querySelector(".reset").addEventListener("click", () => {
    imgs = {}; selectFig(null); figs.forEach(paint);
    fx = 0; fy = 0; fw = 1; fh = 1; box.classList.remove("selected");
    try { localStorage.removeItem("ns-img"); localStorage.removeItem("ns-box2"); } catch (e) {}
    applyZoom(1);
    layout();
  });

  // --- "Phone  Web" next to Index.
  // On a phone: Web shows the full computer version (laid out 1280px wide, zoomed to fit), remembered; Phone goes back.
  // On a computer: Phone opens a phone-sized preview of this page; Web (or ×, Esc, a click outside) closes it.
  const inFrame = window.self !== window.top;
  const phoneDevice = matchMedia("(pointer:coarse)").matches && Math.min(screen.width, screen.height) < 900;
  const vp = document.querySelector('meta[name="viewport"]');
  let stored = null;
  try { stored = localStorage.getItem("ns-view"); } catch (e) {}
  if (phoneDevice && !inFrame && stored === "web") vp.setAttribute("content", "width=1280");
  const viewNow = () => inFrame ? "phone" : phoneDevice ? (stored === "web" ? "web" : "phone") : (narrow.matches ? "phone" : "web");
  const markView = () => index.querySelectorAll(".view button").forEach(b => b.classList.toggle("on", b.dataset.view === viewNow()));
  function phonePreview() {
    if (document.getElementById("phoneview")) return;
    // open at whichever project is on screen right now
    const mid = innerHeight * 0.45;
    const sec = [...document.querySelectorAll("main section[id]")].find(s => { const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; });
    const cur = sec ? { hash: "#" + sec.id } : null;
    const page = location.pathname.split("/").pop() || "index.html";
    const pv = document.createElement("div");
    pv.id = "phoneview";
    pv.innerHTML = '<button type="button" class="x" aria-label="Close the phone preview">×</button><iframe title="Phone version"></iframe>';
    pv.querySelector("iframe").src = page + "?frame" + (cur && cur.hash ? cur.hash : "");
    const close = () => { pv.remove(); removeEventListener("keydown", esc); };
    const esc = e => { if (e.key === "Escape") close(); };
    pv.addEventListener("click", e => { if (e.target === pv || e.target.closest(".x")) close(); });
    addEventListener("keydown", esc);
    addEventListener("message", e => { if (e.data === "ns-close-phone") close(); });
    document.body.appendChild(pv);
  }
  index.querySelectorAll(".view button").forEach(b => b.addEventListener("click", () => {
    const want = b.dataset.view;
    if (inFrame) { if (want === "web") parent.postMessage("ns-close-phone", "*"); return; }
    if (phoneDevice) {
      stored = want === "web" ? "web" : null;
      try { if (stored) localStorage.setItem("ns-view", "web"); else localStorage.removeItem("ns-view"); } catch (e) {}
      vp.setAttribute("content", want === "web" ? "width=1280" : "width=device-width, initial-scale=1");
      setTimeout(() => { layout(); markView(); }, 100);
      return;
    }
    if (want === "phone") phonePreview();
  }));
  narrow.addEventListener("change", markView);
  markView();
  // inside the phone preview, Esc closes it too (keys go to the preview once you've clicked in it)
  if (inFrame) addEventListener("keydown", e => { if (e.key === "Escape") parent.postMessage("ns-close-phone", "*"); });

  // --- Source numbers: one per image, level with its top edge, opening the full-size file.
  function placeSources() {
    srcs.textContent = "";
    const top0 = srcs.getBoundingClientRect().top + scrollY;
    for (const f of figs) {
      const d = document.createElement("div");
      d.style.top = (f.getBoundingClientRect().top + scrollY - top0) + "px";
      if (f.dataset.full) {
        const a = document.createElement("a");
        a.href = f.dataset.full; a.target = "_blank"; a.rel = "noopener"; a.textContent = f.dataset.n;
        a.title = "Open full size"; d.appendChild(a);
      } else d.textContent = f.dataset.n;
      srcs.appendChild(d);
    }
  }

  // --- Index: starts just under the top bar; the section in view stays bright while the others quiet down.
  const indexTop = () => root.style.setProperty("--indexTop", (brief.offsetTop + brief.offsetHeight + 48) + "px");
  const links = [...index.querySelectorAll('.inner > a:not(.lead)')];
  const byId = new Map(links.filter(a => a.hash).map(a => [a.hash.slice(1), a]));
  const sections = [...document.querySelectorAll("main section[id]")];
  function markCurrent() {
    const mid = innerHeight * 0.45;
    let cur = null;
    for (const s of sections) { const r = s.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) cur = s.id; }
    links.forEach(a => a.removeAttribute("aria-current"));
    if (cur && byId.get(cur)) byId.get(cur).setAttribute("aria-current", "true");
    index.classList.toggle("has-current", !!cur);
  }
  addEventListener("scroll", markCurrent, { passive: true });

  const tabsToImage = () => figs.forEach(f => f.style.setProperty("--mh", f.querySelector("img, video, .pending").offsetHeight + "px"));
  // Box corner tabs: hidden wherever they sit over an image, unless the box is selected.
  const corners = [...box.querySelectorAll(".nw, .ne, .sw, .se")];
  const hit = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  function boxTabs() {
    const media = figs.map(f => f.querySelector("img, video, .pending").getBoundingClientRect()).filter(r => r.bottom > 0 && r.top < innerHeight);
    for (const c of corners) c.classList.toggle("under", media.some(r => hit(c.getBoundingClientRect(), r)));
  }
  // (a hoisted function, because images and the box are drawn before this point; the check itself runs a frame later)
  var tabsQueued = false;
  function queueTabs() { if (!tabsQueued) { tabsQueued = true; requestAnimationFrame(() => { tabsQueued = false; boxTabs(); }); } }
  addEventListener("scroll", queueTabs, { passive: true });
  const layout = () => { indexTop(); set(); tabsToImage(); placeSources(); markCurrent(); boxTabs(); syncLayers(); };
  new ResizeObserver(layout).observe(document.querySelector("main"));
  new ResizeObserver(layout).observe(brief);
  addEventListener("resize", layout);
  addEventListener("load", layout);
  narrow.addEventListener("change", layout);
  layout();
})();

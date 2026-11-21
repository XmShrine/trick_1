(() => {
  "use strict";

  const STORAGE_KEY = "quarreywell_canvas_v3";
  const WORLD_W = 1760;
  const WORLD_H = 1120;
  const MARGIN_NOTES = [
    "秋天多囤两颗橡果",
    "贝斯好像该调音了",
    "今天的手帐记得保存",
    "博客又欠了两篇草稿",
    "风很轻，在树洞里坐会儿",
  ];

  const root = document.documentElement;
  const viewport = document.getElementById("canvas-viewport");
  const world = document.getElementById("nest-world");
  const items = Array.from(document.querySelectorAll(".canvas-item"));
  const themeBtn = document.getElementById("theme-toggle");
  const resetBtn = document.getElementById("reset-btn");
  const squirrelBtn = document.getElementById("item-squirrel");
  const whisperEl = document.getElementById("item-whisper");
  const marginNoteEl = document.getElementById("margin-note");
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  let topZ = 10;
  let noteIdx = 0;
  let noteTimer = null;
  let suppressClickUntil = 0;
  let hasPanned = false;
  let rafId = null;
  let lastFrameTime = 0;

  const isDesktop = () => window.innerWidth >= 768;

  function loadTheme() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return "day";
      const parsed = JSON.parse(raw);
      return parsed.theme === "night" ? "night" : "day";
    } catch {
      return "day";
    }
  }

  function saveTheme(mode) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: mode }));
    } catch {
      // Ignore storage errors in restricted browsing contexts.
    }
  }

  /* --- Theme Toggle (Day Paper vs. Night Lamp) --- */
  function applyTheme(mode) {
    const next = mode === "night" ? "night" : "day";
    root.setAttribute("data-theme", next);
    themeBtn.setAttribute("aria-pressed", String(next === "night"));
    themeBtn.textContent = next === "night" ? "日光" : "夜灯";
    saveTheme(next);
  }

  /* --- Squirrel Pencil Whisper --- */
  function cycleWhisper() {
    noteIdx = (noteIdx + 1) % MARGIN_NOTES.length;
    whisperEl.classList.add("is-fading");
    if (noteTimer) clearTimeout(noteTimer);
    noteTimer = setTimeout(() => {
      marginNoteEl.textContent = MARGIN_NOTES[noteIdx];
      whisperEl.classList.remove("is-fading");
    }, 150);
  }

  /* --- World Panning (Desktop Only) --- */
  const pan = { x: 0, y: 0 };

  function getDefaultPan() {
    return {
      x: Math.round((window.innerWidth - WORLD_W) / 2),
      y: Math.round((window.innerHeight - WORLD_H) / 2),
    };
  }

  function clampPan(x, y) {
    const minX = Math.min(window.innerWidth - WORLD_W - 60, -80);
    const maxX = Math.max(60, window.innerWidth - WORLD_W + 60);
    const minY = Math.min(window.innerHeight - WORLD_H - 60, -80);
    const maxY = Math.max(60, window.innerHeight - WORLD_H + 60);
    return {
      x: Math.max(minX, Math.min(x, maxX)),
      y: Math.max(minY, Math.min(y, maxY)),
    };
  }

  function renderWorldPan() {
    if (!isDesktop()) {
      world.style.transform = "";
      return;
    }
    world.style.transform = `translate3d(${pan.x}px, ${pan.y}px, 0)`;
  }

  function centerWorld() {
    const def = getDefaultPan();
    pan.x = def.x;
    pan.y = def.y;
    renderWorldPan();
  }

  /* --- Per-Item Physics State & Smooth Drift-Back --- */
  const itemStates = items.map((el) => {
    const baseRot = parseFloat(el.dataset.rot || "0");
    return {
      el,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      rot: baseRot,
      vrot: 0,
      baseRot,
      dragging: false,
      returnAt: 0,
    };
  });

  function applyItemTransform(state) {
    state.el.style.setProperty("--dx", `${state.x.toFixed(1)}px`);
    state.el.style.setProperty("--dy", `${state.y.toFixed(1)}px`);
    state.el.style.setProperty("--rot", `${state.rot.toFixed(2)}deg`);
  }

  function isItemMoving(s) {
    return (
      Math.hypot(s.x, s.y) >= 0.2 ||
      Math.hypot(s.vx, s.vy) >= 1 ||
      Math.abs(s.rot - s.baseRot) >= 0.05
    );
  }

  function stepPhysics(now) {
    const dt = lastFrameTime ? Math.min(0.05, Math.max(0.001, (now - lastFrameTime) / 1000)) : 0.016;
    lastFrameTime = now;

    const omega = 2.4;
    const zeta = 0.94;
    const omegaR = omega * 1.25;
    const zetaR = 0.92;
    let anyActive = false;

    for (const s of itemStates) {
      if (s.dragging) {
        anyActive = true;
        continue;
      }
      if (!isItemMoving(s)) continue;

      if (motionQuery.matches) {
        s.x = 0;
        s.y = 0;
        s.vx = 0;
        s.vy = 0;
        s.rot = s.baseRot;
        s.vrot = 0;
        applyItemTransform(s);
        continue;
      }

      if (now < s.returnAt) {
        const damp = Math.exp(-8 * dt);
        s.vx *= damp;
        s.vy *= damp;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.rot += (s.baseRot - s.rot) * Math.min(1, 10 * dt);
        anyActive = true;
      } else {
        const ax = -(omega * omega) * s.x - 2 * zeta * omega * s.vx;
        const ay = -(omega * omega) * s.y - 2 * zeta * omega * s.vy;
        s.vx += ax * dt;
        s.vy += ay * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;

        const dr = s.rot - s.baseRot;
        const arot = -(omegaR * omegaR) * dr - 2 * zetaR * omegaR * s.vrot;
        s.vrot += arot * dt;
        s.rot += s.vrot * dt;

        if (!isItemMoving(s)) {
          s.x = 0;
          s.y = 0;
          s.vx = 0;
          s.vy = 0;
          s.rot = s.baseRot;
          s.vrot = 0;
        } else {
          anyActive = true;
        }
      }

      applyItemTransform(s);
    }

    if (!anyActive) {
      for (const s of itemStates) {
        s.el.style.zIndex = "";
      }
      topZ = 10;
      rafId = null;
      lastFrameTime = 0;
      return;
    }

    rafId = requestAnimationFrame(stepPhysics);
  }

  function ensureAnimLoop() {
    if (rafId !== null) return;
    lastFrameTime = 0;
    rafId = requestAnimationFrame(stepPhysics);
  }

  function resetCanvas() {
    world.classList.add("is-resetting");
    hasPanned = false;
    centerWorld();

    const now = performance.now();
    for (const s of itemStates) {
      s.dragging = false;
      s.returnAt = now;
    }
    ensureAnimLoop();

    setTimeout(() => {
      world.classList.remove("is-resetting");
    }, 640);
  }

  /* --- Pointer Dragging (Objects + Background Pan) --- */
  function initDragging() {
    // Prevent native browser link/image ghost-drag that causes pointercancel at (0, 0)
    world.addEventListener("dragstart", (e) => e.preventDefault());

    itemStates.forEach((s) => {
      const { el } = s;
      el.addEventListener("pointerdown", (e) => {
        if (!isDesktop() || e.pointerType === "touch" || e.button !== 0) return;
        e.stopPropagation();

        const grabX = s.x;
        const grabY = s.y;
        const startX = e.clientX;
        const startY = e.clientY;
        let prevX = startX;
        let prevY = startY;
        let prevTime = performance.now();
        let moved = 0;

        topZ += 1;
        el.style.zIndex = String(topZ);
        el.classList.add("is-dragging");
        s.dragging = true;
        s.vx = 0;
        s.vy = 0;
        s.vrot = 0;

        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          // Ignore capture errors on synthetic events.
        }

        const onMove = (ev) => {
          const now = performance.now();
          const dt = Math.max(0.008, (now - prevTime) / 1000);
          const stepX = ev.clientX - prevX;
          const stepY = ev.clientY - prevY;
          prevX = ev.clientX;
          prevY = ev.clientY;
          prevTime = now;

          const instVx = Math.max(-320, Math.min(320, stepX / dt));
          const instVy = Math.max(-320, Math.min(320, stepY / dt));
          s.vx = s.vx * 0.55 + instVx * 0.45;
          s.vy = s.vy * 0.55 + instVy * 0.45;

          s.x = grabX + (ev.clientX - startX);
          s.y = grabY + (ev.clientY - startY);
          moved = Math.hypot(ev.clientX - startX, ev.clientY - startY);

          const tilt = Math.max(-6, Math.min(6, stepX * 0.3));
          s.rot = s.baseRot + tilt;
          applyItemTransform(s);
        };

        const onEnd = () => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerup", onEnd);
          el.removeEventListener("pointercancel", onEnd);
          el.classList.remove("is-dragging");

          if (el.hasPointerCapture?.(e.pointerId)) {
            try {
              el.releasePointerCapture(e.pointerId);
            } catch {
              // Ignore release errors.
            }
          }

          s.dragging = false;
          s.returnAt = performance.now() + 260;

          if (moved >= 6) {
            suppressClickUntil = performance.now() + 260;
          }
          if (isItemMoving(s)) {
            ensureAnimLoop();
          }
        };

        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerup", onEnd);
        el.addEventListener("pointercancel", onEnd);
      });
    });

    // Background Pan
    viewport.addEventListener("pointerdown", (e) => {
      if (!isDesktop() || e.pointerType === "touch" || e.button !== 0) return;
      if (e.target.closest(".canvas-item, .corner-links, .corner-actions")) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const basePanX = pan.x;
      const basePanY = pan.y;

      viewport.classList.add("is-panning");
      try {
        viewport.setPointerCapture(e.pointerId);
      } catch {
        // Ignore capture errors.
      }

      const onMove = (ev) => {
        hasPanned = true;
        const next = clampPan(basePanX + (ev.clientX - startX), basePanY + (ev.clientY - startY));
        pan.x = next.x;
        pan.y = next.y;
        renderWorldPan();
      };

      const onEnd = () => {
        viewport.removeEventListener("pointermove", onMove);
        viewport.removeEventListener("pointerup", onEnd);
        viewport.removeEventListener("pointercancel", onEnd);
        viewport.classList.remove("is-panning");
      };

      viewport.addEventListener("pointermove", onMove);
      viewport.addEventListener("pointerup", onEnd);
      viewport.addEventListener("pointercancel", onEnd);
    });

    // Trackpad / mouse wheel pan on desktop
    viewport.addEventListener(
      "wheel",
      (e) => {
        if (!isDesktop()) return;
        e.preventDefault();
        hasPanned = true;
        const next = clampPan(pan.x - e.deltaX, pan.y - e.deltaY);
        pan.x = next.x;
        pan.y = next.y;
        renderWorldPan();
      },
      { passive: false }
    );

    // Suppress link navigation or squirrel click right after a drag
    world.addEventListener(
      "click",
      (e) => {
        if (performance.now() < suppressClickUntil) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true
    );
  }

  /* --- Corner Links Highlight Sync --- */
  function initCornerSync() {
    document.querySelectorAll(".corner-links a[data-hover-target]").forEach((link) => {
      const target = document.getElementById(link.dataset.hoverTarget);
      if (!target) return;
      const on = () => target.classList.add("is-highlighted");
      const off = () => target.classList.remove("is-highlighted");
      link.addEventListener("pointerenter", on);
      link.addEventListener("pointerleave", off);
      link.addEventListener("focus", on);
      link.addEventListener("blur", off);
    });
  }

  /* --- Initialize --- */
  applyTheme(loadTheme());
  itemStates.forEach(applyItemTransform);
  centerWorld();
  initDragging();
  initCornerSync();

  themeBtn.addEventListener("click", () => {
    const isNight = root.getAttribute("data-theme") === "night";
    applyTheme(isNight ? "day" : "night");
  });

  resetBtn.addEventListener("click", resetCanvas);
  squirrelBtn?.addEventListener("click", cycleWhisper);

  window.addEventListener("resize", () => {
    if (isDesktop()) {
      if (!hasPanned) {
        centerWorld();
        return;
      }
      const clamped = clampPan(pan.x, pan.y);
      pan.x = clamped.x;
      pan.y = clamped.y;
    }
    renderWorldPan();
  });

  document.addEventListener("keydown", (e) => {
    if ((e.key === "r" || e.key === "R") && !e.metaKey && !e.ctrlKey && !e.altKey) {
      resetCanvas();
    }
  });
})();

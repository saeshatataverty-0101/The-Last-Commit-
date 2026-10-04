/** Small, reusable interaction effects. */

const GLYPHS = "!<>-_\\/[]{}—=+*^?#01ABCDEF$%&";

/** Decode-style text scramble: random glyphs resolve left → right into the final text. */
export function scramble(el: HTMLElement, finalText = el.dataset.final ?? el.textContent ?? "", duration = 900) {
  el.dataset.final = finalText;
  const start = performance.now();
  const len = finalText.length;
  const prev = (el as HTMLElement & { _raf?: number })._raf;
  if (prev) cancelAnimationFrame(prev);

  const frame = (now: number) => {
    const p = Math.min((now - start) / duration, 1);
    const revealed = Math.floor(p * len);
    let out = "";
    for (let i = 0; i < len; i++) {
      const ch = finalText[i];
      if (i < revealed || ch === " ") out += ch;
      else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    if (p < 1) (el as HTMLElement & { _raf?: number })._raf = requestAnimationFrame(frame);
  };
  (el as HTMLElement & { _raf?: number })._raf = requestAnimationFrame(frame);
}

/** Nav links scramble when hovered. */
export function initHoverScramble() {
  document.querySelectorAll<HTMLElement>("[data-scramble]").forEach((el) => {
    const text = el.textContent ?? "";
    el.addEventListener("pointerenter", () => scramble(el, text, 450));
  });
}

/**
 * 3D tilt that follows the pointer, with a moving glare highlight.
 * Children using translateZ pop out of the card thanks to preserve-3d.
 */
export function initTilt() {
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!fine) return;

  document.querySelectorAll<HTMLElement>("[data-tilt]").forEach((card) => {
    let raf = 0;
    const max = card.classList.contains("id-card") ? 10 : 7;
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.style.transition = "transform .08s linear";
        card.style.transform = `perspective(900px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg)`;
        card.style.setProperty("--gx", `${px * 100}%`);
        card.style.setProperty("--gy", `${py * 100}%`);
      });
    });
    card.addEventListener("pointerleave", () => {
      cancelAnimationFrame(raf);
      card.style.transition = "transform .7s cubic-bezier(.22,1,.36,1)";
      card.style.transform = "";
    });
  });
}

/** Animated number counter. */
export function countUp(el: HTMLElement, duration = 1600) {
  const target = Number(el.dataset.count ?? 0);
  const prefix = el.dataset.prefix ?? "";
  const suffix = el.dataset.suffix ?? "";
  const start = performance.now();
  const fmt = new Intl.NumberFormat("en-IN");
  const step = (now: number) => {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 4);
    el.textContent = `${prefix}${fmt.format(Math.round(target * eased))}${suffix}`;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Draggable CSS-3D crystals with inertia; they idle-spin when untouched. */
export function initCrystals() {
  document.querySelectorAll<HTMLElement>("[data-drag]").forEach((wrap, idx) => {
    const inner = wrap.querySelector<HTMLElement>(".crystal__inner")!;
    let ry = idx * 40;
    let rx = -12;
    let vy = 0.4;
    let vx = 0;
    let dragging = false;
    let lx = 0;
    let ly = 0;

    wrap.addEventListener("pointerdown", (e) => {
      dragging = true;
      lx = e.clientX;
      ly = e.clientY;
      wrap.setPointerCapture(e.pointerId);
      wrap.style.cursor = "grabbing";
    });
    wrap.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      vy = (e.clientX - lx) * 0.6;
      vx = -(e.clientY - ly) * 0.6;
      lx = e.clientX;
      ly = e.clientY;
    });
    const end = () => {
      dragging = false;
      wrap.style.cursor = "";
    };
    wrap.addEventListener("pointerup", end);
    wrap.addEventListener("pointercancel", end);

    const loop = () => {
      ry += vy;
      rx = Math.max(-60, Math.min(60, rx + vx));
      if (!dragging) {
        vy += (0.4 - vy) * 0.03; // ease back to idle spin
        vx *= 0.92;
        rx += (-12 - rx) * 0.02;
      }
      inner.style.setProperty("--ry", `${ry}deg`);
      inner.style.setProperty("--rx", `${rx}deg`);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}

/** Randomly trigger the RGB-split glitch on .glitch elements. */
export function initGlitchBursts() {
  const els = Array.from(document.querySelectorAll<HTMLElement>(".glitch"));
  const fire = () => {
    const el = els[(Math.random() * els.length) | 0];
    if (el) {
      el.classList.add("is-glitching");
      setTimeout(() => el.classList.remove("is-glitching"), 150 + Math.random() * 150);
    }
    setTimeout(fire, 6000 + Math.random() * 6000);
  };
  setTimeout(fire, 1500);
  els.forEach((el) => {
    el.addEventListener("pointerenter", () => el.classList.add("is-glitching"));
    el.addEventListener("pointerleave", () => el.classList.remove("is-glitching"));
  });
}

/** Split a paragraph's text into word spans (for scroll-scrubbed reveals). */
export function splitWords(el: HTMLElement) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  textNodes.forEach((node) => {
    const frag = document.createDocumentFragment();
    node.textContent!.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
      else {
        const s = document.createElement("span");
        s.className = "word";
        s.textContent = part;
        frag.appendChild(s);
      }
    });
    node.replaceWith(frag);
  });
  return Array.from(el.querySelectorAll<HTMLElement>(".word"));
}

/** Split into per-character spans (used by the hero title intro). */
export function splitChars(el: HTMLElement) {
  const text = el.textContent ?? "";
  el.textContent = "";
  return Array.from(text).map((ch) => {
    const s = document.createElement("span");
    s.className = "char";
    s.textContent = ch === " " ? " " : ch;
    el.appendChild(s);
    return s;
  });
}

let toastTimer = 0;
export function toast(msg: string) {
  const t = document.getElementById("toast")!;
  t.textContent = msg;
  t.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.remove("is-on"), 2600);
}

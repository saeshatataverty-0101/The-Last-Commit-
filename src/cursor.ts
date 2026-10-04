/**
 * Cursor system:
 *  - reticle ring (lags behind) + dot (exact position)
 *  - contextual label from [data-cursor] (e.g. "play", "lock")
 *  - text-caret mode over inputs
 *  - click burst + a neon light-trail drawn on a 2D canvas
 *  - magnetic elements (.magnetic) that pull toward the pointer
 */

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function initCursor(onMove?: (x: number, y: number) => void) {
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!finePointer) return;

  document.body.classList.add("has-cursor");

  const root = document.querySelector<HTMLElement>(".cursor")!;
  const ring = root.querySelector<HTMLElement>(".cursor__ring")!;
  const dot = root.querySelector<HTMLElement>(".cursor__dot")!;
  const label = root.querySelector<HTMLElement>(".cursor__label")!;

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let rx = mx;
  let ry = my;

  window.addEventListener("pointermove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    onMove?.(mx, my);
  });

  window.addEventListener("pointerdown", (e) => {
    root.classList.add("is-down");
    const b = document.createElement("span");
    b.className = "click-burst";
    b.style.left = `${e.clientX}px`;
    b.style.top = `${e.clientY}px`;
    document.body.appendChild(b);
    b.addEventListener("animationend", () => b.remove());
  });
  window.addEventListener("pointerup", () => root.classList.remove("is-down"));

  // hover states via delegation so dynamically added elements work too
  const interactive = "a, button, summary, label, [data-cursor], [data-drag], .chips b";
  document.addEventListener("pointerover", (e) => {
    const target = e.target as HTMLElement;
    if (target.closest("input[type=text], input[type=email], .term__in input")) {
      root.classList.add("is-text");
      root.classList.remove("is-hover");
      return;
    }
    const el = target.closest<HTMLElement>(interactive);
    if (el) {
      root.classList.add("is-hover");
      label.textContent = el.dataset.cursor ?? (el.hasAttribute("data-drag") ? "drag" : "");
    }
  });
  document.addEventListener("pointerout", (e) => {
    const target = e.target as HTMLElement;
    const related = e.relatedTarget as HTMLElement | null;
    if (target.closest("input")) root.classList.remove("is-text");
    const el = target.closest(interactive);
    if (el && (!related || !el.contains(related))) {
      root.classList.remove("is-hover");
      label.textContent = "";
    }
  });

  // ---------- light trail ----------
  const canvas = document.getElementById("trail") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  const dpr = Math.min(window.devicePixelRatio, 2);
  const resize = () => {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);

  const pts: { x: number; y: number; life: number }[] = [];
  const MAX = 26;

  // ---------- magnetic elements ----------
  const magnets = Array.from(document.querySelectorAll<HTMLElement>(".magnetic"));
  magnets.forEach((m) => {
    const inner = (m.firstElementChild as HTMLElement | null) ?? m;
    m.addEventListener("pointermove", (e) => {
      const r = m.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      m.style.transform = `translate(${dx * 0.25}px, ${dy * 0.35}px)`;
      inner.style.transform = `translate(${dx * 0.12}px, ${dy * 0.15}px)`;
    });
    m.addEventListener("pointerleave", () => {
      m.style.transition = "transform .6s cubic-bezier(.22,1,.36,1)";
      inner.style.transition = "transform .6s cubic-bezier(.22,1,.36,1)";
      m.style.transform = "";
      inner.style.transform = "";
      setTimeout(() => {
        m.style.transition = "";
        inner.style.transition = "";
      }, 600);
    });
  });

  const styles = getComputedStyle(document.body);

  function loop() {
    rx = lerp(rx, mx, 0.18);
    ry = lerp(ry, my, 0.18);
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;

    pts.push({ x: mx, y: my, life: 1 });
    if (pts.length > MAX) pts.shift();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cyan = styles.getPropertyValue("--cyan").trim() || "#00f0ff";
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const k = i / pts.length;
      ctx.strokeStyle = cyan;
      ctx.globalAlpha = k * 0.55;
      ctx.lineWidth = k * 3;
      ctx.lineCap = "round";
      ctx.shadowColor = cyan;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

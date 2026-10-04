/** Terminal-style boot sequence shown before the site is revealed. */

const LINES: [string, string?][] = [
  ["> initializing LAST_COMMIT.OS ..."],
  ["> mounting /dev/global-repository", "ok"],
  ["> loading shaders [core, grid, particles]", "ok"],
  ["> syncing 1,204 player profiles", "ok"],
  ["> WARNING: repository freeze scheduled in 48:00:00", "err"],
  ["> decrypting mission briefing", "ok"],
  ["> git checkout -b the-last-commit"],
  ["> all systems nominal. welcome, player.", "ok"],
];

export function runBoot(): Promise<void> {
  const boot = document.getElementById("boot")!;
  const log = document.getElementById("bootLog")!;
  const bar = document.getElementById("bootBar")!;
  const pct = document.getElementById("bootPct")!;
  const start = document.getElementById("bootStart") as HTMLButtonElement;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lineDelay = reduce ? 40 : 230;

  return new Promise((resolve) => {
    let i = 0;
    const total = LINES.length;

    const next = () => {
      if (i < total) {
        const [text, kind] = LINES[i];
        const line = document.createElement("div");
        if (kind) line.className = kind;
        log.appendChild(line);
        typeLine(line, text + (kind === "ok" ? "  [OK]" : ""), reduce ? 0 : 9, () => {
          i++;
          const p = Math.round((i / total) * 100);
          bar.style.width = `${p}%`;
          pct.textContent = `${String(p).padStart(3, "0")}%`;
          setTimeout(next, lineDelay);
        });
      } else {
        start.hidden = false;
        start.focus({ preventScroll: true });
        let done = false;
        const go = () => {
          if (done) return;
          done = true;
          window.removeEventListener("keydown", onKey);
          boot.style.transition = "clip-path .9s cubic-bezier(.76,0,.24,1), opacity .9s";
          boot.style.clipPath = "inset(0 0 100% 0)";
          setTimeout(() => {
            boot.remove();
            resolve();
          }, 700);
        };
        const onKey = (e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") go();
        };
        start.addEventListener("click", go);
        window.addEventListener("keydown", onKey);
        // don't trap people forever – auto-continue
        setTimeout(go, 3500);
      }
    };
    next();
  });
}

function typeLine(el: HTMLElement, text: string, speed: number, done: () => void) {
  if (speed === 0) {
    el.textContent = text;
    done();
    return;
  }
  let n = 0;
  const step = () => {
    n += 2;
    el.textContent = text.slice(0, n);
    if (n < text.length) setTimeout(step, speed);
    else done();
  };
  step();
}

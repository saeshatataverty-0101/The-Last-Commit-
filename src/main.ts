import "@fontsource/chakra-petch/latin-400.css";
import "@fontsource/chakra-petch/latin-500.css";
import "@fontsource/chakra-petch/latin-700.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-600.css";
import "./styles.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

import { createScene, type SceneApi } from "./scene";
import { initCursor } from "./cursor";
import { runBoot } from "./boot";
import { initRegister } from "./register";
import { initTerminal } from "./terminal";
import { initFeed } from "./feed";
import {
  countUp,
  initCrystals,
  initGlitchBursts,
  initHoverScramble,
  initTilt,
  scramble,
  splitChars,
  splitWords,
  toast,
} from "./effects";

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduceMotion) document.body.classList.add("no-motion");

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const $$ = <T extends HTMLElement = HTMLElement>(sel: string) => Array.from(document.querySelectorAll<T>(sel));

// ------------------------------------------------------------------ WebGL
let scene: SceneApi | null = null;
try {
  scene = createScene($<HTMLCanvasElement>("#webgl"));
} catch (err) {
  // No WebGL? The site still works, just without the 3D background.
  console.warn("WebGL unavailable", err);
}

// ------------------------------------------------------------------ smooth scroll
const lenis = new Lenis({ lerp: 0.1, smoothWheel: !reduceMotion });
lenis.stop(); // locked while booting
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// anchor links go through Lenis so they ease instead of jumping
$$<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href")!;
    const target = id.length > 1 ? document.querySelector<HTMLElement>(id) : null;
    if (!target) return;
    e.preventDefault();
    closeMenu();
    lenis.scrollTo(target, { offset: id === "#hero" ? 0 : -40, duration: 1.6 });
  });
});

// ------------------------------------------------------------------ mobile menu
const menuBtn = $("#menuBtn");
const mobileNav = $("#mobileNav");
function closeMenu() {
  mobileNav.classList.remove("is-open");
  menuBtn.setAttribute("aria-expanded", "false");
}
menuBtn.addEventListener("click", () => {
  const open = !mobileNav.classList.contains("is-open");
  mobileNav.classList.toggle("is-open", open);
  menuBtn.setAttribute("aria-expanded", String(open));
});

// ------------------------------------------------------------------ cursor + HUD readouts
const hudX = $("#hudX");
const hudY = $("#hudY");
initCursor((x, y) => {
  hudX.textContent = String(Math.round(x)).padStart(4, "0");
  hudY.textContent = String(Math.round(y)).padStart(4, "0");
});

let lastX = 0;
let lastY = 0;
window.addEventListener("pointermove", (e) => {
  lastX = e.clientX;
  lastY = e.clientY;
});

// cursor label when hovering the 3D core (it lives in the canvas, not the DOM)
if (scene) {
  const cursorRoot = $(".cursor");
  const label = $(".cursor__label");
  let wasOver = false;
  gsap.ticker.add(() => {
    const over = scene!.isPointerOverCore() && !document.elementFromPoint(lastX, lastY)?.closest("a, button, input, label, .tilt, [data-drag]");
    if (over !== wasOver) {
      wasOver = over;
      cursorRoot.classList.toggle("is-hover", over);
      label.textContent = over ? "push" : "";
    }
  });
}

// FPS meter
{
  const el = $("#fps");
  let frames = 0;
  let last = performance.now();
  gsap.ticker.add(() => {
    frames++;
    const now = performance.now();
    if (now - last > 500) {
      el.textContent = String(Math.round((frames * 1000) / (now - last)));
      frames = 0;
      last = now;
    }
  });
}

// ------------------------------------------------------------------ countdown
const EVENT_START = new Date("2026-11-21T10:00:00+05:30").getTime();
const cd = {
  d: $('[data-cd="d"]'),
  h: $('[data-cd="h"]'),
  m: $('[data-cd="m"]'),
  s: $('[data-cd="s"]'),
};
function tickCountdown() {
  const ms = Math.max(0, EVENT_START - Date.now());
  const set = (el: HTMLElement, v: number) => {
    const t = String(v).padStart(2, "0");
    if (el.textContent !== t) {
      el.textContent = t;
      if (!reduceMotion) el.animate([{ transform: "translateY(-30%)", opacity: 0.2 }, { transform: "none", opacity: 1 }], { duration: 300, easing: "ease-out" });
    }
  };
  set(cd.d, Math.floor(ms / 864e5));
  set(cd.h, Math.floor((ms / 36e5) % 24));
  set(cd.m, Math.floor((ms / 6e4) % 60));
  set(cd.s, Math.floor((ms / 1e3) % 60));
}
tickCountdown();
setInterval(tickCountdown, 1000);

// ------------------------------------------------------------------ small interactions
initHoverScramble();
initTilt();
initCrystals();
initGlitchBursts();
initRegister((hex) => scene?.setAccent(hex));
initFeed();
initTerminal({ godMode, pulse: () => scene?.pulse() });

// ------------------------------------------------------------------ scroll-driven animation
function setupScroll() {
  // progress bar + feed the 3D scene
  const fill = $("#progressFill");
  const pLabel = $("#progressLabel");
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      fill.style.transform = `scaleX(${self.progress})`;
      pLabel.textContent = `SYNC ${String(Math.round(self.progress * 100)).padStart(2, "0")}%`;
      scene?.setScroll(self.progress);
    },
  });

  // per-section HUD label, active nav link & scene accent colour
  const ACCENTS: Record<string, string> = {
    HOME: "#00ff66",
    ABOUT: "#00ff66",
    TRACKS: "#39ff14",
    SCHEDULE: "#00e5a0",
    PRIZES: "#a8ff60",
    SPONSORS: "#00ff66",
    FAQ: "#00e5a0",
    REGISTER: "#00ff66",
    FOOTER: "#39ff14",
  };
  const hudSec = $("#hudSec");
  $$("[data-section]").forEach((sec) => {
    const name = sec.dataset.section!;
    ScrollTrigger.create({
      trigger: sec,
      start: "top 55%",
      end: "bottom 55%",
      onToggle: (self) => {
        if (!self.isActive) return;
        hudSec.textContent = name;
        if (!document.body.classList.contains("god")) scene?.setAccent(ACCENTS[name] ?? "#00ff66");
        $$(".hud__nav a").forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${sec.id}`));
      },
    });
  });

  // section titles decode when they scroll into view
  $$("[data-scramble-on-view]").forEach((el) => {
    const text = el.textContent ?? "";
    ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      once: true,
      onEnter: () => scramble(el, text, 1100),
    });
  });

  // mission: words light up as you scroll through the paragraph
  $$(".split-reveal").forEach((p) => {
    const words = splitWords(p);
    gsap.to(words, {
      opacity: 1,
      stagger: 0.05,
      ease: "none",
      scrollTrigger: { trigger: p, start: "top 80%", end: "bottom 45%", scrub: true },
    });
  });

  gsap.from(".mission__panel", {
    y: 40,
    opacity: 0,
    duration: 0.9,
    ease: "power3.out",
    scrollTrigger: { trigger: ".mission__panel", start: "top 85%" },
  });
  gsap.from(".objectives li", {
    x: 30,
    opacity: 0,
    stagger: 0.08,
    duration: 0.6,
    ease: "power2.out",
    scrollTrigger: { trigger: ".objectives", start: "top 85%" },
  });

  // class cards deal in like a hand of cards
  gsap.from(".class-card", {
    y: 50,
    opacity: 0,
    duration: 0.8,
    stagger: 0.08,
    ease: "power3.out",
    scrollTrigger: { trigger: ".class-grid", start: "top 80%" },
    clearProps: "transform",
  });

  // quest log: pinned horizontal scroll on desktop, vertical fill on mobile
  const mm = gsap.matchMedia();
  mm.add("(min-width: 901px)", () => {
    const track = $("#questTrack");
    const getDist = () => track.scrollWidth - window.innerWidth;
    const tween = gsap.to(track, {
      x: () => -getDist(),
      ease: "none",
      scrollTrigger: {
        trigger: ".quests",
        pin: ".quests__pin",
        start: "top top",
        end: () => `+=${getDist()}`,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });
    gsap.to("#questLineFill", {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { trigger: ".quests", start: "top top", end: () => `+=${getDist()}`, scrub: 1 },
    });
    // each quest card pops as it slides into view
    $$(".quest").forEach((q) => {
      gsap.from(q, {
        y: 24,
        opacity: 0.3,
        duration: 0.5,
        scrollTrigger: { trigger: q, containerAnimation: tween, start: "left 90%", toggleActions: "play none none reverse" },
      });
    });
  });
  mm.add("(max-width: 900px)", () => {
    const line = $("#questLineFill");
    ScrollTrigger.create({
      trigger: "#questTrack",
      start: "top 70%",
      end: "bottom 60%",
      onUpdate: (s) => line.style.setProperty("--p", String(s.progress)),
    });
    $$(".quest").forEach((q) => {
      gsap.from(q, { x: 40, opacity: 0, duration: 0.6, scrollTrigger: { trigger: q, start: "top 88%" } });
    });
  });

  // loot: cards rise from below, legendary one last & biggest
  gsap.from(".loot-card", {
    y: 50,
    opacity: 0,
    duration: 0.8,
    stagger: { each: 0.12, from: "edges" },
    ease: "power2.out",
    scrollTrigger: { trigger: ".loot__grid", start: "top 80%" },
  });
  $$(".loot-card__amount").forEach((el) => {
    ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: () => countUp(el, 2000) });
  });
  gsap.from(".side-loot__item", {
    x: -40,
    opacity: 0,
    stagger: 0.08,
    duration: 0.6,
    scrollTrigger: { trigger: ".side-loot", start: "top 90%" },
  });

  // allies: glitchy flicker-in
  gsap.from(".ally", {
    opacity: 0,
    duration: 0.5,
    stagger: 0.05,
    scrollTrigger: { trigger: ".allies", start: "top 85%" },
  });

  gsap.from(".faq__item", {
    y: 30,
    opacity: 0,
    stagger: 0.08,
    duration: 0.6,
    scrollTrigger: { trigger: ".faq", start: "top 85%" },
  });

  gsap.from(".reg, .id-wrap", {
    y: 40,
    opacity: 0,
    stagger: 0.15,
    duration: 1,
    ease: "power3.out",
    scrollTrigger: { trigger: ".join__grid", start: "top 80%" },
  });

  // marquee skews with scroll velocity
  const marquee = $(".marquee__track");
  ScrollTrigger.create({
    onUpdate: (self) => {
      const v = gsap.utils.clamp(-6, 6, self.getVelocity() / 300);
      gsap.to(marquee, { skewX: -v, duration: 0.3, overwrite: true });
    },
  });

  // footer giant text slides in sideways
  gsap.fromTo(".footer__big span", { xPercent: 20 }, { xPercent: -10, ease: "none", scrollTrigger: { trigger: ".footer", start: "top bottom", end: "bottom bottom", scrub: true } });
  gsap.from(".term", { y: 60, opacity: 0, duration: 1, scrollTrigger: { trigger: ".term", start: "top 85%" } });
}

// ------------------------------------------------------------------ hero intro
function heroIntro() {
  const lines = $$(".hero__line");
  const chars = lines.flatMap((l) => splitChars(l));

  // the command line types itself out like a real terminal
  const cmd = $("#heroCmd");
  const cmdText = cmd.textContent ?? "";
  cmd.textContent = "";
  const typeCmd = () => {
    let i = 0;
    const step = () => {
      cmd.textContent = cmdText.slice(0, ++i) + (i < cmdText.length ? "▌" : "");
      if (i < cmdText.length) setTimeout(step, 35);
    };
    step();
  };

  const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
  tl.from(chars, {
    yPercent: 100,
    opacity: 0,
    duration: 0.8,
    stagger: 0.025,
  })
    .fromTo(".reveal-up", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.1 }, "-=0.8")
    .add(() => {
      $$(".hero__stats [data-count]").forEach((el) => countUp(el));
      typeCmd();
      scene?.pulse();
    }, "-=0.6")
    // only wire the scroll-away once the intro is done, so the two tweens never fight
    .add(() => {
      gsap.fromTo(
        ".hero__title, .hero__sub, .countdown, .hero__cta, .hero__stats, .hero__tag, .feed",
        { yPercent: 0, opacity: 1 },
        {
          yPercent: -30,
          opacity: 0,
          ease: "none",
          stagger: 0.02,
          scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom 20%", scrub: true },
        },
      );
    });

  // hero title subtly follows the mouse (parallax depth)
  const title = $(".hero__title");
  window.addEventListener("pointermove", (e) => {
    const x = e.clientX / window.innerWidth - 0.5;
    const y = e.clientY / window.innerHeight - 0.5;
    gsap.to(title, { x: x * -10, y: y * -6, duration: 1.2, ease: "power3.out" });
  });
}

// ------------------------------------------------------------------ easter egg
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
let kIdx = 0;
window.addEventListener("keydown", (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  kIdx = key === KONAMI[kIdx] ? kIdx + 1 : key === KONAMI[0] ? 1 : 0;
  if (kIdx === KONAMI.length) {
    kIdx = 0;
    godMode();
  }
});

function godMode() {
  const on = document.body.classList.toggle("god");
  scene?.setAccent(on ? "#eaffea" : "#00ff66");
  scene?.pulse();
  const gm = $("#godmode");
  gm.querySelector("span")!.textContent = on ? "GOD MODE ENABLED" : "GOD MODE DISABLED";
  gsap.fromTo(gm, { opacity: 0, scale: 1.4 }, { opacity: 1, scale: 1, duration: 0.4, ease: "power4.out", yoyo: true, repeat: 1, repeatDelay: 0.8 });
  toast(on ? "★ Cheat activated: infinite caffeine." : "Cheat disabled.");
}

// ------------------------------------------------------------------ go
runBoot().then(() => {
  document.body.classList.remove("is-loading");
  lenis.start();
  window.scrollTo(0, 0);
  setupScroll();
  heroIntro();
  // fonts can shift layout after load – recompute trigger positions
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
});

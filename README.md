# THE LAST COMMIT — 48H Hackathon

> Year 2099. Every line of code humanity ever wrote lives in one Global Repository.
> At 00:00 on the final night it freezes forever. You have 48 hours to push the last commit.

A gaming / cyberpunk-styled website for the fictional hackathon **"The Last Commit"**: frontend only, with a
real-time 3D background, custom cursor interactions and scroll-driven animation throughout.

**Live demo:** _add your deployed link here_

---

## Features

### 3D & WebGL (Three.js)
- **The Core**: a noise-displaced sphere drawn with a custom GLSL shader (simplex noise in the vertex shader, fresnel glow in the fragment shader) inside a rotating wireframe shell.
- **Orbit rings** with "commit nodes" travelling around the core.
- **Interactive particle field**: particles are pushed away from the mouse in the vertex shader.
- **Endless synthwave grid floor** and a striped retro sun, both drawn with shaders.
- **Bloom post-processing** (`UnrealBloomPass`).
- **Scroll choreography**: the core drifts, recedes and changes colour for each section.
- Click (poke) the core to send out a shockwave.

### Cursor interactions
- A targeting-reticle cursor whose ring trails behind the dot, with **context labels** (`play`, `lock`, `drag`, `poke`…).
- A neon **light trail** drawn on a 2D canvas.
- A **click burst** effect, and a text caret over inputs.
- **Magnetic buttons** that pull toward the pointer.
- **3D tilt cards** with a moving glare highlight (class cards, objectives panel, player ID card).
- **Draggable CSS-3D loot crystals** with inertia.
- The custom cursor is turned off automatically on touch devices.

### Animation
- A terminal **boot sequence** with a "PRESS START" screen.
- The hero title flies in letter by letter on a 3D rotation, with random **RGB-split glitch** bursts.
- A live **countdown** to the event start.
- Section titles **decode/scramble** into place as they scroll into view.
- Mission text **lights up word by word** as you scroll.
- **Pinned horizontal timeline** ("Quest Log") on desktop; it becomes a vertical timeline on mobile.
- Class cards are dealt in like a hand of cards; loot cards rise in with animated prize counters.
- A marquee that **skews with scroll velocity**, a scroll progress bar, and a HUD readout (FPS, cursor X/Y, current section).
- Smooth scrolling via Lenis.

### Sections
Hero → Mission Briefing → Select Your Class (tracks) → Quest Log (schedule) → Loot Table (prizes) →
Allied Factions (sponsors) → Decrypted Intel (FAQ) → Create Player (registration) → Terminal footer.

### Registration (frontend only)
- A three-step "Create Player" wizard: identity → loadout → confirm, with inline validation.
- A **live player ID card** that updates as you type, including a generated identicon avatar and barcode.
- Clicking **LOCK IN** on a class card pre-selects that class in the form.
- Nothing is sent to a server. The completed registration is only saved to `localStorage`.

### Easter eggs
- An interactive **terminal** in the footer: try `help`, `git push`, `whoami`, `sudo`, `core`.
- The **Konami code** (↑↑↓↓←→←→BA) or the `iddqd` command toggles GOD MODE.

### Accessibility & performance
- Respects `prefers-reduced-motion`.
- Responsive from 320px phones up to wide desktops.
- The WebGL pixel ratio is capped, and mobile gets fewer particles. If WebGL isn't available, the site still works without the 3D background.

---

## Tech stack

| What | Why |
| --- | --- |
| [Vite](https://vitejs.dev) + TypeScript | Dev server and bundler |
| [Three.js](https://threejs.org) | 3D scene, custom shaders, bloom |
| [GSAP](https://gsap.com) + ScrollTrigger | Timelines and scroll-driven animation |
| [Lenis](https://lenis.darkroom.engineering) | Smooth scrolling |
| Plain CSS | Layout, glitch effects, CSS-3D crystals |

## Project structure

```
index.html          page markup (all sections)
src/main.ts         entry point: smooth scroll, GSAP/ScrollTrigger choreography, countdown, easter eggs
src/scene.ts        Three.js background (core shader, particles, grid, sun, bloom)
src/cursor.ts       custom cursor, light trail, click burst, magnetic buttons
src/effects.ts      text scramble, 3D tilt, counters, draggable crystals, glitch, text splitting
src/boot.ts         boot / loading sequence
src/register.ts     registration wizard + live ID card
src/terminal.ts     interactive footer terminal
src/styles.css      all styles
```

## Running locally

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build → dist/
npm run preview   # serve the production build
```

## Deployment

`.github/workflows/deploy.yml` builds the site and publishes it to **GitHub Pages** on every push to `main`.
To turn it on, go to **Settings → Pages → Source: GitHub Actions**.
The Vite `base` is set to `./`, so the build also works on Netlify, Vercel or any static host.

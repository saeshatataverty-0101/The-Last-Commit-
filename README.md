# THE LAST COMMIT — 48H Hackathon

> Year 2099. Every line of code humanity ever wrote lives in one Global Repository.
> At 00:00 on the final night it freezes forever. You have 48 hours to push the last commit.

A black-and-green, terminal-inspired website for the fictional hackathon **"The Last Commit"**: frontend only,
with a real-time 3D background, custom cursor interactions and scroll-driven animation throughout.

**Live demo:** _add your deployed link here_

---

## Features

### 3D & WebGL (Three.js)
- **3D git commit graph**: a `main` branch with four feature branches that fork off and merge back in. The branches draw themselves in on load, commit nodes pop in as each line reaches them, and small "push" packets flow along the branches.
- **"The last commit"**: a glowing node at the head of `main` with a pulsing ring.
- **Floating code snippets** (`git push`, `npm run dev`, `200 OK` and so on) drifting in the background.
- **Interactive particle field**: particles are pushed away from the mouse in the vertex shader.
- **Scrolling grid floor** drawn with a shader.
- **Soft bloom post-processing** (`UnrealBloomPass`).
- **Scroll choreography**: the graph drifts, recedes and shifts colour for each section.
- Hovering a commit enlarges it, and clicking the graph pushes along every branch at once.

### Cursor interactions
- A high-contrast cursor (a white dot plus a green ring) with **context labels** (`go`, `select`, `drag`, `push`…).
- A faint **light trail** drawn on a 2D canvas.
- A **click burst** effect, and a text caret over inputs.
- **Magnetic buttons** that pull toward the pointer.
- **3D tilt cards** with a moving glare highlight (class cards, objectives panel, player ID card).
- **Draggable CSS-3D loot crystals** with inertia.
- The custom cursor is turned off automatically on touch devices.

### Animation
- A terminal **boot sequence** with a "PRESS START" screen.
- The hero title slides in letter by letter, the `git push` command types itself out, and a light **glitch** effect plays on hover and every few seconds.
- A **live commit feed** in the hero: simulated commits from teams slide in every few seconds.
- A live **countdown** to the event start.
- Section titles **decode/scramble** into place as they scroll into view.
- Mission text **lights up word by word** as you scroll.
- **Pinned horizontal timeline** ("Quest Log") on desktop; it becomes a vertical timeline on mobile.
- Track cards fade up in sequence, and the prize cards rise in with animated prize counters.
- A marquee that **skews with scroll velocity**, a scroll progress bar, and a HUD readout (FPS, cursor X/Y, current section).
- Smooth scrolling via Lenis.

### Sections
Hero → About → Tracks → Schedule → Prizes → Sponsors → FAQ → Registration → Terminal footer.

### Registration (frontend only)
- A three-step form: details (name, email, college) → track, experience and team size → confirm, with inline validation.
- A **live event pass** that updates as you type, including a generated identicon avatar and barcode.
- Clicking **Choose track** on a track card pre-selects that track in the form.
- Nothing is sent to a server. The completed registration is only saved to `localStorage`.

### Easter eggs
- An interactive **terminal** in the footer: try `help`, `git push`, `whoami`, `sudo`, `push`.
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
| [Fontsource](https://fontsource.org) | Self-hosted Chakra Petch + JetBrains Mono (no external font requests) |

## Project structure

```
index.html          page markup (all sections)
src/main.ts         entry point: smooth scroll, GSAP/ScrollTrigger choreography, countdown, easter eggs
src/scene.ts        Three.js background (commit graph, code snippets, particles, grid, bloom)
src/feed.ts         simulated live commit feed in the hero
src/cursor.ts       custom cursor, light trail, click burst, magnetic buttons
src/effects.ts      text scramble, 3D tilt, counters, draggable crystals, glitch, text splitting
src/boot.ts         boot / loading sequence
src/register.ts     registration wizard + live ID card
src/terminal.ts     interactive footer terminal
src/styles.css      all styles
scripts/build-single.mjs  bundles the build into one offline HTML file
```

## Running locally

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build → dist/
npm run preview   # serve the production build
npm run build:single  # one self-contained file: the-last-commit.html
```

## Deployment

`.github/workflows/deploy.yml` builds the site and publishes it to **GitHub Pages** on every push to `main`.
To turn it on, go to **Settings → Pages → Source: GitHub Actions**.
The Vite `base` is set to `./`, so the build also works on Netlify, Vercel or any static host.

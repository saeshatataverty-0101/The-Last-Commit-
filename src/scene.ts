import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

/**
 * The fixed WebGL background, themed around a hackathon repo:
 *  - a 3D git commit graph: a `main` branch with feature branches that fork off
 *    and merge back in, drawn in on load, with "pushes" travelling along it
 *  - the final "last commit" node at the head of main
 *  - floating code snippets drifting in the background
 *  - a particle field that moves out of the mouse's way
 *  - a scrolling grid floor
 *  - soft bloom post-processing
 */

export interface SceneApi {
  setScroll(progress: number): void;
  setAccent(hex: string): void;
  pulse(): void;
  isPointerOverCore(): boolean;
}

const SNIPPETS = [
  "git push",
  "</>",
  "{ }",
  "=>",
  "npm run dev",
  "git merge",
  "fn()",
  "200 OK",
  "// TODO",
  "#hackathon",
  "deploy",
  "async",
  "&&",
  "[ ]",
  "git commit",
  "0x1F",
  "build ✓",
  "PR #42",
];

export function createScene(canvas: HTMLCanvasElement): SceneApi {
  const isSmall = window.matchMedia("(max-width: 900px)").matches;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isSmall, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmall ? 1.25 : 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x020402, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020402, 0.045);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0.4, 9);

  const accent = new THREE.Color("#00ff66");
  const accentTarget = new THREE.Color("#00ff66");

  // ---------------------------------------------------------------- commit graph
  const graph = new THREE.Group();
  scene.add(graph);
  const tilt = new THREE.Group(); // static diagonal tilt so the graph reads as 3D
  tilt.rotation.set(0.25, -0.35, 0.3);
  graph.add(tilt);

  type Branch = {
    curve: THREE.CatmullRomCurve3;
    tube: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>;
    start: number; // seconds after load when this branch starts drawing
    nodes: { mesh: THREE.Mesh; t: number }[];
    packets: { mesh: THREE.Mesh; offset: number }[];
    isMain: boolean;
  };
  const branches: Branch[] = [];

  const mainMat = new THREE.MeshBasicMaterial({ color: accent });
  const nodeGeo = new THREE.SphereGeometry(0.075, 16, 12);
  const mainNodeGeo = new THREE.SphereGeometry(0.1, 16, 12);
  const packetGeo = new THREE.SphereGeometry(0.035, 8, 6);
  const packetMat = new THREE.MeshBasicMaterial({ color: 0xeaffea });
  const allNodes: THREE.Mesh[] = [];

  const MAIN_LEN = 3.2;
  const mainPoint = (x: number) => new THREE.Vector3(x, Math.sin(x * 0.6) * 0.15, Math.cos(x * 0.5) * 0.2);

  function addBranch(points: THREE.Vector3[], color: THREE.Color | string, start: number, isMain: boolean, nodeCount: number) {
    const curve = new THREE.CatmullRomCurve3(points);
    const mat = isMain ? mainMat : new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, isMain ? 0.022 : 0.014, 6, false), mat);
    tube.geometry.setDrawRange(0, 0);
    tilt.add(tube);

    const nodes: Branch["nodes"] = [];
    for (let i = 0; i < nodeCount; i++) {
      const t = (i + (isMain ? 0 : 1)) / (isMain ? nodeCount - 1 : nodeCount + 1);
      const mesh = new THREE.Mesh(isMain ? mainNodeGeo : nodeGeo, isMain ? mainMat : mat);
      mesh.position.copy(curve.getPointAt(t));
      mesh.scale.setScalar(0);
      tilt.add(mesh);
      nodes.push({ mesh, t });
      allNodes.push(mesh);
    }

    const packets: Branch["packets"] = [];
    const packetCount = isMain ? 3 : 1;
    for (let i = 0; i < packetCount; i++) {
      const mesh = new THREE.Mesh(packetGeo, packetMat);
      mesh.visible = false;
      tilt.add(mesh);
      packets.push({ mesh, offset: i / packetCount + Math.random() * 0.2 });
    }

    branches.push({ curve, tube, start, nodes, packets, isMain });
  }

  // main: a long, gently waving line
  const mainPts: THREE.Vector3[] = [];
  for (let x = -MAIN_LEN; x <= MAIN_LEN + 0.001; x += 0.4) mainPts.push(mainPoint(x));
  addBranch(mainPts, accent, 0, true, 13);

  // feature branches fork off main and merge back in further along
  const featureDefs = [
    { from: -2.8, to: -0.6, y: 1.0, z: 0.6, color: "#39ff14", name: "feat/auth" },
    { from: -2.0, to: 0.8, y: -1.1, z: -0.5, color: "#a8ff60", name: "feat/ui" },
    { from: -0.4, to: 2.2, y: 1.3, z: -0.7, color: "#00e5a0", name: "feat/api" },
    { from: 0.6, to: 2.9, y: -0.9, z: 0.8, color: "#c6ff00", name: "fix/bugs" },
  ];
  featureDefs.forEach((f, i) => {
    const a = mainPoint(f.from);
    const b = mainPoint(f.to);
    const span = f.to - f.from;
    const pts = [
      a,
      new THREE.Vector3(f.from + span * 0.2, a.y + f.y * 0.8, a.z + f.z * 0.8),
      new THREE.Vector3(f.from + span * 0.5, a.y + f.y, a.z + f.z),
      new THREE.Vector3(f.from + span * 0.8, b.y + f.y * 0.8, b.z + f.z * 0.8),
      b,
    ];
    addBranch(pts, f.color, 0.6 + i * 0.45, false, 3);
  });

  // the head of main: "the last commit"
  const headMat = new THREE.MeshBasicMaterial({ color: 0xeaffea });
  const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), headMat);
  head.position.copy(mainPoint(MAIN_LEN + 0.45));
  head.scale.setScalar(0);
  tilt.add(head);
  const headRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.01, 6, 64),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.6 }),
  );
  headRing.position.copy(head.position);
  headRing.scale.setScalar(0);
  tilt.add(headRing);
  // connector from main's tip to the head
  const headLink = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.LineCurve3(mainPoint(MAIN_LEN), head.position.clone()), 4, 0.012, 6, false),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.5 }),
  );
  headLink.visible = false;
  tilt.add(headLink);

  // invisible hit-box for hover / click on the graph
  const hitBox = new THREE.Mesh(new THREE.BoxGeometry(7.6, 3.4, 2.2), new THREE.MeshBasicMaterial({ visible: false }));
  tilt.add(hitBox);

  // ---------------------------------------------------------------- floating code snippets
  const snippetGroup = new THREE.Group();
  scene.add(snippetGroup);
  const snippetCount = isSmall ? 8 : SNIPPETS.length;
  const snippets: { sprite: THREE.Sprite; speed: number; baseX: number; phase: number }[] = [];
  for (let i = 0; i < snippetCount; i++) {
    const text = SNIPPETS[i % SNIPPETS.length];
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d")!;
    const fontPx = 48;
    ctx.font = `500 ${fontPx}px "JetBrains Mono", monospace`;
    const w = Math.ceil(ctx.measureText(text).width) + 16;
    c.width = w;
    c.height = fontPx + 16;
    ctx.font = `500 ${fontPx}px "JetBrains Mono", monospace`;
    ctx.fillStyle = "#00ff66";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 8, c.height / 2);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.16 + Math.random() * 0.14, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    const h = 0.32 + Math.random() * 0.25;
    sprite.scale.set((h * c.width) / c.height, h, 1);
    const baseX = (Math.random() - 0.5) * 22;
    sprite.position.set(baseX, (Math.random() - 0.5) * 14, -3 - Math.random() * 12);
    snippetGroup.add(sprite);
    snippets.push({ sprite, speed: 0.08 + Math.random() * 0.12, baseX, phase: Math.random() * Math.PI * 2 });
  }

  // ---------------------------------------------------------------- particles
  const COUNT = isSmall ? 600 : 1300;
  const positions = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 34;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 24 - 4;
    seeds[i] = Math.random();
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pGeo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

  const pUniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector3(999, 999, 0) },
    uScroll: { value: 0 },
    uColor: { value: accent.clone() },
    uPixel: { value: renderer.getPixelRatio() },
  };
  const pMat = new THREE.ShaderMaterial({
    uniforms: pUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uMouse;
      uniform float uScroll;
      uniform float uPixel;
      attribute float aSeed;
      varying float vSeed;
      varying float vPush;
      void main(){
        vec3 p = position;
        // slow drift + scroll parallax (deeper particles move less)
        p.y += sin(uTime * 0.3 + aSeed * 40.0) * 0.25;
        p.y = mod(p.y + uScroll * (6.0 + aSeed * 10.0) + 10.0, 20.0) - 10.0;
        // mouse repulsion in the XY plane
        vec2 d = p.xy - uMouse.xy;
        float dist = length(d);
        float push = smoothstep(2.2, 0.0, dist) * (1.0 - clamp(abs(p.z) / 10.0, 0.0, 1.0));
        p.xy += normalize(d + 0.0001) * push * 0.7;
        vPush = push;
        vSeed = aSeed;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.6 + aSeed * 2.4 + push * 2.0) * uPixel * (8.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vSeed;
      varying float vPush;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d);
        vec3 col = mix(uColor, vec3(0.78, 1.0, 0.0), step(0.9, vSeed));
        col = mix(col, vec3(1.0), vPush * 0.3);
        gl_FragColor = vec4(col, a * (0.2 + vSeed * 0.3 + vPush * 0.4));
      }`,
  });
  scene.add(new THREE.Points(pGeo, pMat));

  // ---------------------------------------------------------------- grid floor
  const gridUniforms = {
    uTime: { value: 0 },
    uSpeed: { value: 1 },
    uColor: { value: new THREE.Color("#00c853") },
  };
  const gridMat = new THREE.ShaderMaterial({
    uniforms: gridUniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uSpeed;
      uniform vec3 uColor;
      varying vec3 vWorld;
      float line(float x, float w){
        float f = abs(fract(x - 0.5) - 0.5);
        return 1.0 - smoothstep(0.0, w * fwidth(x) * 1.5, f);
      }
      void main(){
        vec2 g = vec2(vWorld.x, vWorld.z + uTime * uSpeed) * 0.8;
        float l = max(line(g.x, 1.0), line(g.y, 1.0));
        float fade = smoothstep(-60.0, -4.0, vWorld.z) * smoothstep(10.0, 2.0, vWorld.z);
        float centerGlow = smoothstep(14.0, 0.0, abs(vWorld.x));
        vec3 col = uColor * (0.6 + centerGlow * 0.8);
        gl_FragColor = vec4(col, l * fade * 0.26);
      }`,
  });
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(120, 120, 1, 1), gridMat);
  grid.rotation.x = -Math.PI / 2;
  grid.position.set(0, -3.2, -20);
  scene.add(grid);

  // ---------------------------------------------------------------- post-processing
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), isSmall ? 0.45 : 0.6, 0.4, 0.3);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---------------------------------------------------------------- interaction state
  const mouse = new THREE.Vector2(0, 0); // NDC
  const mouseSmooth = new THREE.Vector2(0, 0);
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const mouseWorld = new THREE.Vector3();
  let overGraph = false;
  let hovered: THREE.Mesh | null = null;
  let hasPointer = false;
  let scroll = 0;
  let scrollSmooth = 0;
  let pulse = 0;

  window.addEventListener("pointermove", (e) => {
    hasPointer = true;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });
  window.addEventListener("pointerleave", () => {
    hasPointer = false;
  });

  // Click on the graph = everything pushes at once. Listen on window because the canvas sits under the page.
  window.addEventListener("pointerdown", () => {
    if (overGraph) api.pulse();
  });

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloom.resolution.set(w, h);
  }
  window.addEventListener("resize", resize);

  // ---------------------------------------------------------------- loop
  const t0 = performance.now();
  let last = t0;
  const tmpVec = new THREE.Vector3();
  const DRAW_TIME = reduceMotion ? 0.01 : 1.6; // seconds for a branch to draw in

  function tick() {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = ((now - t0) / 1000) * (reduceMotion ? 0.3 : 1);
    const life = (now - t0) / 1000;

    mouseSmooth.lerp(mouse, 0.06);
    scrollSmooth += (scroll - scrollSmooth) * 0.08;
    pulse *= Math.pow(0.02, dt); // frame-rate independent decay (~1s)

    accent.lerp(accentTarget, 0.04);
    mainMat.color.copy(accent);
    pUniforms.uColor.value.copy(accent);
    (headRing.material as THREE.MeshBasicMaterial).color.copy(accent);
    (headLink.material as THREE.MeshBasicMaterial).color.copy(accent);

    // mouse world point on z=0 plane for particle repulsion + graph hover test
    raycaster.setFromCamera(mouse, camera);
    if (hasPointer && raycaster.ray.intersectPlane(plane, mouseWorld)) {
      pUniforms.uMouse.value.lerp(mouseWorld, 0.2);
    }
    overGraph = hasPointer && raycaster.intersectObject(hitBox, false).length > 0;
    const nodeHit = overGraph ? raycaster.intersectObjects(allNodes, false)[0] : undefined;
    hovered = (nodeHit?.object as THREE.Mesh | undefined) ?? null;

    // branches draw themselves in, nodes pop in as the line reaches them
    branches.forEach((b) => {
      const p = THREE.MathUtils.clamp((life - b.start) / DRAW_TIME, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const total = b.tube.geometry.index ? b.tube.geometry.index.count : 0;
      b.tube.geometry.setDrawRange(0, Math.floor(total * eased));

      b.nodes.forEach((n) => {
        const target = eased >= n.t ? (n.mesh === hovered ? 2.2 : 1 + pulse * 0.6) : 0;
        const s = n.mesh.scale.x + (target - n.mesh.scale.x) * 0.15;
        n.mesh.scale.setScalar(s);
      });

      // "pushes": small bright packets flowing along finished branches
      b.packets.forEach((pk) => {
        pk.mesh.visible = p >= 1;
        if (!pk.mesh.visible) return;
        const speed = (b.isMain ? 0.07 : 0.12) * (1 + pulse * 4);
        pk.offset = (pk.offset + dt * speed) % 1;
        pk.mesh.position.copy(b.curve.getPointAt(pk.offset));
      });
    });

    const mainDone = life > DRAW_TIME;
    headLink.visible = mainDone;
    const headTarget = mainDone ? 1 + Math.sin(t * 2) * 0.08 + pulse * 0.4 : 0;
    head.scale.setScalar(head.scale.x + (headTarget - head.scale.x) * 0.08);
    head.rotation.y += dt * 0.6;
    head.rotation.x = 0.3;
    headRing.scale.setScalar(head.scale.x * (1 + ((t * 0.6) % 1) * 0.6));
    (headRing.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - ((t * 0.6) % 1));

    // graph sways gently and leans toward the mouse
    graph.rotation.y = Math.sin(t * 0.15) * 0.25 + mouseSmooth.x * 0.15;
    graph.rotation.x = mouseSmooth.y * 0.1;

    // scroll choreography: hero → right side, then drifts back as you scroll
    const s = scrollSmooth;
    const side = isSmall ? 0 : Math.sin(s * Math.PI * 3) * 3.0;
    const baseX = isSmall ? 0 : 3.3;
    graph.position.x = THREE.MathUtils.lerp(baseX, side, Math.min(s * 8, 1));
    // on phones the graph sits low and further back so it never covers the title
    graph.position.y = isSmall ? -1.6 - s * 0.5 : 0.1 - s * 0.6;
    graph.position.z = (isSmall ? -4 : 0) - s * 6;
    graph.scale.setScalar(isSmall ? 0.62 : 0.78);

    snippets.forEach((sn) => {
      sn.sprite.position.y += dt * sn.speed;
      if (sn.sprite.position.y > 8) sn.sprite.position.y = -8;
      sn.sprite.position.x = sn.baseX + Math.sin(t * 0.2 + sn.phase) * 0.4;
    });

    // camera: subtle parallax from mouse
    tmpVec.set(mouseSmooth.x * 0.25, 0.4 + mouseSmooth.y * 0.15 - s * 1.5, 9);
    camera.position.lerp(tmpVec, 0.08);
    camera.lookAt(0, -s * 1.5, 0);

    pUniforms.uTime.value = t;
    pUniforms.uScroll.value = s;
    gridUniforms.uTime.value = t;
    gridUniforms.uSpeed.value = 0.8 + s * 2 + pulse * 2;

    composer.render();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  const api: SceneApi = {
    setScroll(p) {
      scroll = p;
    },
    setAccent(hex) {
      accentTarget.set(hex);
    },
    pulse() {
      pulse = 1;
    },
    isPointerOverCore() {
      return overGraph;
    },
  };
  return api;
}

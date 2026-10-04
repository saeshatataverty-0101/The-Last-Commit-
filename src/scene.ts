import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

/**
 * The fixed WebGL background:
 *  - "The Core": a noise-displaced, fresnel-lit sphere inside a wireframe shell
 *  - orbit rings with "commit" nodes travelling around them
 *  - a particle field that is pushed away by the mouse
 *  - an endless synthwave grid floor
 *  - bloom post-processing
 */

// Compact 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT)
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

export interface SceneApi {
  setScroll(progress: number): void;
  setAccent(hex: string): void;
  pulse(): void;
  isPointerOverCore(): boolean;
}

export function createScene(canvas: HTMLCanvasElement): SceneApi {
  const isSmall = window.matchMedia("(max-width: 900px)").matches;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isSmall, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmall ? 1.25 : 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x05060a, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05060a, 0.045);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0.4, 9);

  const accent = new THREE.Color("#00f0ff");
  const accentTarget = new THREE.Color("#00f0ff");
  const pink = new THREE.Color("#ff2bd6");

  // ---------------------------------------------------------------- core
  const coreGroup = new THREE.Group();
  scene.add(coreGroup);

  const coreUniforms = {
    uTime: { value: 0 },
    uDistort: { value: 0.35 },
    uPulse: { value: 0 },
    uColorA: { value: accent.clone() },
    uColorB: { value: pink.clone() },
  };

  const coreMat = new THREE.ShaderMaterial({
    uniforms: coreUniforms,
    vertexShader: /* glsl */ `
      ${NOISE}
      uniform float uTime;
      uniform float uDistort;
      uniform float uPulse;
      varying vec3 vNormal;
      varying vec3 vView;
      varying float vNoise;
      void main(){
        float n = snoise(normal * 1.6 + uTime * 0.35);
        float n2 = snoise(normal * 4.0 - uTime * 0.6) * 0.25;
        float d = (n + n2) * (uDistort + uPulse * 0.8);
        vNoise = n;
        vec3 pos = position + normal * d;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform float uPulse;
      varying vec3 vNormal;
      varying vec3 vView;
      varying float vNoise;
      void main(){
        float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.2);
        vec3 col = mix(uColorA, uColorB, smoothstep(-0.6, 0.8, vNoise));
        vec3 base = col * 0.06;
        vec3 c = base + col * fres * 1.05 + vec3(1.0) * uPulse * 0.5 * fres;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, isSmall ? 48 : 96), coreMat);
  coreGroup.add(core);

  const shellMat = new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.22 });
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(2.05, 1), shellMat);
  coreGroup.add(shell);

  // rings + orbiting commit nodes
  const rings: THREE.Group[] = [];
  const nodes: { mesh: THREE.Mesh; ring: THREE.Group; r: number; speed: number; phase: number }[] = [];
  const ringMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.45 });
  const nodeGeo = new THREE.OctahedronGeometry(0.09, 0);
  const nodeMatA = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const nodeMatB = new THREE.MeshBasicMaterial({ color: pink });

  [
    { r: 2.7, tilt: [1.2, 0.2, 0], speed: 0.5, count: 5 },
    { r: 3.3, tilt: [1.9, -0.5, 0.3], speed: -0.32, count: 7 },
    { r: 3.9, tilt: [0.4, 0.9, -0.2], speed: 0.22, count: 4 },
  ].forEach((cfg, i) => {
    const g = new THREE.Group();
    g.rotation.set(cfg.tilt[0], cfg.tilt[1], cfg.tilt[2]);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(cfg.r, 0.006, 6, 160), ringMat);
    g.add(ring);
    for (let k = 0; k < cfg.count; k++) {
      const m = new THREE.Mesh(nodeGeo, k % 3 === 0 ? nodeMatB : nodeMatA);
      g.add(m);
      nodes.push({ mesh: m, ring: g, r: cfg.r, speed: cfg.speed * (1 + i * 0.1), phase: (k / cfg.count) * Math.PI * 2 });
    }
    coreGroup.add(g);
    rings.push(g);
  });

  // ---------------------------------------------------------------- particles
  const COUNT = isSmall ? 900 : 2200;
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
        float push = smoothstep(2.6, 0.0, dist) * (1.0 - clamp(abs(p.z) / 10.0, 0.0, 1.0));
        p.xy += normalize(d + 0.0001) * push * 1.4;
        vPush = push;
        vSeed = aSeed;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (2.0 + aSeed * 3.0 + push * 6.0) * uPixel * (8.0 / -mv.z);
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
        vec3 col = mix(uColor, vec3(1.0, 0.17, 0.84), step(0.85, vSeed));
        col = mix(col, vec3(1.0), vPush * 0.6);
        gl_FragColor = vec4(col, a * (0.35 + vSeed * 0.5 + vPush));
      }`,
  });
  const points = new THREE.Points(pGeo, pMat);
  scene.add(points);

  // ---------------------------------------------------------------- grid floor
  const gridUniforms = {
    uTime: { value: 0 },
    uSpeed: { value: 1 },
    uColor: { value: pink.clone() },
  };
  const gridMat = new THREE.ShaderMaterial({
    uniforms: gridUniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld;
      void main(){
        vUv = uv;
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
        gl_FragColor = vec4(col, l * fade * 0.55);
      }`,
  });
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(120, 120, 1, 1), gridMat);
  grid.rotation.x = -Math.PI / 2;
  grid.position.set(0, -3.2, -20);
  scene.add(grid);

  // a big "sun" disc behind everything for that retro-future horizon
  const sunMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      void main(){
        vec2 c = vUv - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        // horizontal stripes cut out of the lower half
        float y = vUv.y;
        float stripes = step(0.5, fract(y * 18.0 - uTime * 0.25));
        float cut = mix(1.0, stripes, smoothstep(0.55, 0.15, y));
        vec3 col = mix(vec3(1.0, 0.17, 0.84), vec3(1.0, 0.72, 0.0), y);
        float edge = smoothstep(0.5, 0.46, d);
        gl_FragColor = vec4(col * 0.75, cut * edge * 0.32);
      }`,
  });
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), sunMat);
  sun.position.set(0, 3, -55);
  scene.add(sun);

  // ---------------------------------------------------------------- post-processing
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), isSmall ? 0.55 : 0.75, 0.5, 0.32);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---------------------------------------------------------------- interaction state
  const mouse = new THREE.Vector2(0, 0); // NDC
  const mouseSmooth = new THREE.Vector2(0, 0);
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const mouseWorld = new THREE.Vector3();
  let overCore = false;
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

  // Click on the core = shockwave. Listen on window because the canvas sits under the page.
  window.addEventListener("pointerdown", () => {
    if (overCore) api.pulse();
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

  function tick() {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = ((now - t0) / 1000) * (reduceMotion ? 0.3 : 1);

    mouseSmooth.lerp(mouse, 0.06);
    scrollSmooth += (scroll - scrollSmooth) * 0.08;
    pulse *= Math.pow(0.02, dt); // frame-rate independent decay (~1s)

    accent.lerp(accentTarget, 0.04);
    coreUniforms.uColorA.value.copy(accent);
    shellMat.color.copy(accent);
    ringMat.color.copy(accent);
    pUniforms.uColor.value.copy(accent);

    // mouse world point on z=0 plane for particle repulsion + core hover test
    raycaster.setFromCamera(mouse, camera);
    if (hasPointer && raycaster.ray.intersectPlane(plane, mouseWorld)) {
      pUniforms.uMouse.value.lerp(mouseWorld, 0.2);
    }
    overCore = hasPointer && raycaster.intersectObject(core, false).length > 0;

    // core: rotates, leans toward the mouse, drifts sideways as you scroll down the page
    coreUniforms.uTime.value = t;
    coreUniforms.uPulse.value = pulse;
    const targetDistort = overCore ? 0.6 : 0.32;
    coreUniforms.uDistort.value += (targetDistort - coreUniforms.uDistort.value) * 0.06;

    core.rotation.y += dt * 0.15;
    shell.rotation.y -= dt * 0.1;
    shell.rotation.x += dt * 0.05;
    coreGroup.rotation.x = mouseSmooth.y * 0.35;
    coreGroup.rotation.y = mouseSmooth.x * 0.5;

    // scroll choreography: hero → centre/right, sections → off to the side & further back
    const s = scrollSmooth;
    const side = isSmall ? 0 : Math.sin(s * Math.PI * 3) * 3.2;
    const baseX = isSmall ? 0 : 3.4;
    coreGroup.position.x = THREE.MathUtils.lerp(baseX, side, Math.min(s * 8, 1));
    coreGroup.position.y = isSmall ? 1.8 - s * 0.5 : 0.2 - s * 0.6;
    coreGroup.position.z = (isSmall ? -3 : 0) - s * 6;
    const sc = (isSmall ? 0.75 : 1) * (1 + pulse * 0.35);
    coreGroup.scale.setScalar(sc);

    nodes.forEach((n) => {
      const a = n.phase + t * n.speed;
      n.mesh.position.set(Math.cos(a) * n.r, Math.sin(a) * n.r, 0);
      n.mesh.rotation.x = t * 2;
      n.mesh.rotation.y = t * 1.5;
    });
    rings.forEach((r, i) => (r.rotation.z += dt * (0.05 + i * 0.03)));

    // camera: subtle parallax from mouse
    tmpVec.set(mouseSmooth.x * 0.6, 0.4 + mouseSmooth.y * 0.4 - s * 1.5, 9);
    camera.position.lerp(tmpVec, 0.08);
    camera.lookAt(0, -s * 1.5, 0);

    pUniforms.uTime.value = t;
    pUniforms.uScroll.value = s;

    gridUniforms.uTime.value = t;
    gridUniforms.uSpeed.value = 1.2 + s * 6 + pulse * 10;
    sunMat.uniforms.uTime.value = t;

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
      return overCore;
    },
  };
  return api;
}

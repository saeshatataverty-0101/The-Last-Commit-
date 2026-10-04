import { scramble, toast } from "./effects";

/**
 * Three-step registration flow (frontend only — nothing is sent to a server).
 * The player ID card on the right updates live as the form is filled in.
 * The finished registration is kept in localStorage so a refresh doesn't lose it.
 */

const CLASS_COLORS: Record<string, string> = {
  Netrunner: "#00f0ff",
  Chainbreaker: "#ff2bd6",
  Ghost: "#b6ff3b",
  Architect: "#ffb800",
  Terraformer: "#4dffb8",
  Wildcard: "#a77bff",
};

const STORAGE_KEY = "tlc-player";

function hash(str: string) {
  // tiny FNV-1a – good enough to make a stable fake "commit hash"
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function initRegister(onClassChange: (hex: string) => void) {
  const form = document.getElementById("regForm") as HTMLFormElement;
  const steps = Array.from(form.querySelectorAll<HTMLFieldSetElement>(".reg__step"));
  const dots = Array.from(form.querySelectorAll<HTMLElement>("[data-step-dot]"));
  const prevBtn = document.getElementById("prevBtn") as HTMLButtonElement;
  const nextBtn = document.getElementById("nextBtn") as HTMLButtonElement;
  const confirmBox = document.getElementById("confirmBox")!;
  const done = document.getElementById("regDone")!;
  const commitHash = document.getElementById("commitHash")!;
  const lvlOut = document.getElementById("lvlOut")!;

  const card = document.getElementById("idCard")!;
  const idName = document.getElementById("idName")!;
  const idTag = document.getElementById("idTag")!;
  const idOrg = document.getElementById("idOrg")!;
  const idClass = document.getElementById("idClass")!;
  const idLvl = document.getElementById("idLvl")!;
  const idSquad = document.getElementById("idSquad")!;
  const idHash = document.getElementById("idHash")!;
  const avatar = document.getElementById("idAvatar")!;
  const barcode = document.getElementById("idBarcode")!;

  let step = 0;

  const val = (name: string) => {
    const el = form.elements.namedItem(name);
    if (el instanceof RadioNodeList) return el.value;
    return (el as HTMLInputElement | null)?.value.trim() ?? "";
  };

  // ---------- live ID card ----------
  function renderAvatar(seed: string) {
    // 5x5 symmetric identicon from the hash
    const h = parseInt(hash(seed || "anon"), 16);
    avatar.innerHTML = "";
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const mx = x < 3 ? x : 4 - x;
        const bit = (h >> (y * 3 + mx)) & 1;
        const i = document.createElement("i");
        if (!bit) i.className = "off";
        avatar.appendChild(i);
      }
    }
  }

  function renderBarcode(seed: string) {
    barcode.innerHTML = "";
    const h = hash(seed + "barcode") + hash(seed);
    for (const ch of h) {
      const n = parseInt(ch, 16);
      const i = document.createElement("i");
      i.style.width = `${1 + (n % 4)}px`;
      i.style.marginRight = `${1 + (n >> 2)}px`;
      barcode.appendChild(i);
    }
  }

  let lastSeed = "";
  function updateCard() {
    const name = val("name") || "UNKNOWN PLAYER";
    const tag = val("tag");
    const cls = val("class") || "Netrunner";
    const color = CLASS_COLORS[cls] ?? "#00f0ff";
    idName.textContent = name.toUpperCase();
    idTag.textContent = `@${tag || "null"}`;
    idOrg.textContent = (val("org") || "NO GUILD").toUpperCase();
    idClass.textContent = cls.toUpperCase();
    idLvl.textContent = val("level").padStart(2, "0");
    lvlOut.textContent = `LVL ${val("level")}`;
    const squad = val("squad");
    idSquad.textContent = squad.startsWith("Solo") ? "SOLO" : `${squad} PAX`;
    card.style.setProperty("--c", color);

    const seed = `${val("name")}|${tag}|${val("email")}`;
    if (seed !== lastSeed) {
      lastSeed = seed;
      idHash.textContent = `#${hash(seed).slice(0, 7)}`;
      renderAvatar(seed);
      renderBarcode(seed);
    }
  }

  form.addEventListener("input", (e) => {
    updateCard();
    const t = e.target as HTMLInputElement;
    if (t.name === "class") onClassChange(CLASS_COLORS[t.value] ?? "#00f0ff");
    const f = t.closest(".field");
    if (f?.classList.contains("has-error")) validateInput(t);
  });

  // ---------- validation ----------
  function message(input: HTMLInputElement) {
    const v = input.validity;
    if (v.valueMissing) return "// field required";
    if (v.typeMismatch) return "// invalid comms address";
    if (v.patternMismatch) return "// 3-16 chars: letters, numbers, _ or -";
    if (v.tooShort) return `// min ${input.minLength} characters`;
    return "";
  }

  function validateInput(input: HTMLInputElement) {
    const field = input.closest(".field");
    const err = field?.querySelector<HTMLElement>(".field__err");
    const msg = message(input);
    if (field && err) {
      field.classList.toggle("has-error", !!msg);
      err.textContent = msg;
    }
    return !msg;
  }

  function validateStep(i: number) {
    const inputs = Array.from(steps[i].querySelectorAll<HTMLInputElement>("input[type=text], input[type=email]"));
    let ok = true;
    inputs.forEach((input) => {
      // re-trigger the shake animation on repeated failures
      input.closest(".field")?.classList.remove("has-error");
      void input.offsetWidth;
      if (!validateInput(input)) ok = false;
    });
    const firstBad = inputs.find((inp) => !inp.validity.valid);
    firstBad?.focus();
    return ok;
  }

  // ---------- step navigation ----------
  function show(i: number) {
    step = i;
    steps.forEach((s, k) => s.classList.toggle("is-active", k === i));
    dots.forEach((d, k) => {
      d.classList.toggle("is-active", k === i);
      d.classList.toggle("is-done", k < i);
    });
    prevBtn.disabled = i === 0;
    nextBtn.querySelector("span")!.textContent = i === steps.length - 1 ? "Push Commit ⏎" : "Next ▶";
    if (i === steps.length - 1) {
      confirmBox.textContent = [
        `$ git commit -m "register ${val("tag")}"`,
        ``,
        `  player : ${val("name")}`,
        `  tag    : @${val("tag")}`,
        `  comms  : ${val("email")}`,
        `  guild  : ${val("org")}`,
        `  class  : ${val("class")}`,
        `  level  : ${val("level")}/5`,
        `  squad  : ${val("squad")}`,
      ].join("\n");
    }
  }

  nextBtn.addEventListener("click", () => {
    if (step === 0 && !validateStep(0)) {
      toast("✖ Fix the highlighted fields, player.");
      return;
    }
    if (step < steps.length - 1) {
      show(step + 1);
      return;
    }
    // final step
    const rules = form.elements.namedItem("rules") as HTMLInputElement;
    const rulesErr = document.getElementById("rulesErr")!;
    if (!rules.checked) {
      rulesErr.textContent = "// you must accept the code of conduct";
      return;
    }
    rulesErr.textContent = "";
    submit();
  });
  prevBtn.addEventListener("click", () => step > 0 && show(step - 1));

  // Enter inside a text field = next step instead of native submit
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    nextBtn.click();
  });

  function submit() {
    nextBtn.disabled = true;
    nextBtn.querySelector("span")!.textContent = "Pushing…";
    const data = Object.fromEntries(new FormData(form).entries());
    // Simulated network latency — there is no backend for this version.
    setTimeout(() => {
      const full = hash(JSON.stringify(data) + Date.now()) + hash(String(Math.random()));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, commit: full }));
      } catch {
        /* storage unavailable – that's fine */
      }
      showDone(full);
      nextBtn.disabled = false;
      toast("✔ Commit pushed. See you on the grid.");
    }, 1100);
  }

  function showDone(full: string) {
    form.classList.add("is-done");
    done.hidden = false;
    scramble(commitHash, `commit ${full} → main`, 1200);
    card.animate(
      [
        { transform: "perspective(900px) rotateY(0deg)" },
        { transform: "perspective(900px) rotateY(360deg)" },
      ],
      { duration: 1200, easing: "cubic-bezier(.22,1,.36,1)" },
    );
  }

  document.getElementById("resetBtn")!.addEventListener("click", () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    form.reset();
    form.classList.remove("is-done");
    done.hidden = true;
    show(0);
    updateCard();
  });

  // lock-in buttons on the class cards pre-select the class and jump here
  document.querySelectorAll<HTMLElement>(".class-card").forEach((c) => {
    c.querySelector(".class-card__pick")!.addEventListener("click", () => {
      document.querySelectorAll(".class-card").forEach((o) => o.classList.remove("is-picked"));
      c.classList.add("is-picked");
      const cls = c.dataset.class!;
      const radio = form.querySelector<HTMLInputElement>(`input[name=class][value="${cls}"]`);
      if (radio) radio.checked = true;
      updateCard();
      onClassChange(CLASS_COLORS[cls]);
      toast(`▶ ${cls.toUpperCase()} locked in. Continue to registration ↓`);
    });
  });

  // restore a previous registration
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (saved) {
      Object.entries(saved).forEach(([k, v]) => {
        const el = form.elements.namedItem(k);
        if (el instanceof RadioNodeList) el.value = String(v);
        else if (el instanceof HTMLInputElement) {
          if (el.type === "checkbox") el.checked = true;
          else el.value = String(v);
        }
      });
      updateCard();
      showDone(saved.commit);
      return;
    }
  } catch {
    /* ignore */
  }

  updateCard();
}

/** Tiny interactive terminal in the footer. */

type Out = (text: string, cls?: string) => void;

const START = new Date("2026-11-21T10:00:00+05:30");

export function initTerminal(actions: { godMode: () => void; pulse: () => void }) {
  const out = document.getElementById("termOut")!;
  const form = document.getElementById("termForm") as HTMLFormElement;
  const input = document.getElementById("termInput") as HTMLInputElement;
  const history: string[] = [];
  let hIdx = 0;

  const print: Out = (text, cls) => {
    const div = document.createElement("div");
    if (cls) div.className = cls;
    div.textContent = text;
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
  };

  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const commands: Record<string, (args: string[]) => void> = {
    help: () =>
      print(
        [
          "available commands:",
          "  about      what is this",
          "  schedule   jump to the schedule",
          "  prizes     list the loot table",
          "  register   go to registration",
          "  countdown  time until git init",
          "  whoami     identify yourself",
          "  sudo       try it",
          "  push       push to every branch at once",
          "  clear      clear the screen",
        ].join("\n"),
        "acc",
      ),
    about: () =>
      print("THE LAST COMMIT — a 48h hackathon. The global repository freezes at 00:00. Ship before it does."),
    schedule: () => {
      print("→ opening schedule…", "acc");
      go("quests");
    },
    prizes: () =>
      print("1st  ₹5,00,000\n2nd  ₹3,00,000\n3rd  ₹1,50,000\n+ 6× best-in-track awards and special prizes", "acc"),
    register: () => {
      print("→ opening registration…", "acc");
      go("join");
    },
    countdown: () => {
      const ms = Math.max(0, START.getTime() - Date.now());
      const d = Math.floor(ms / 864e5);
      const h = Math.floor((ms / 36e5) % 24);
      const m = Math.floor((ms / 6e4) % 60);
      print(`T-minus ${d}d ${h}h ${m}m until git init.`, "acc");
    },
    whoami: () => {
      try {
        const p = JSON.parse(localStorage.getItem("tlc-registration") ?? "null");
        if (p) return print(`${p.name} (${p.class} track). registered ✔`, "acc");
      } catch {
        /* ignore */
      }
      print("guest. unregistered. type 'register' to fix that.", "warn");
    },
    sudo: (args) => {
      if (args.join(" ") === "make me a sandwich") return print("okay.", "acc");
      print("permission denied. (hint: there's a cheat code ↑↑↓↓…)", "warn");
    },
    push: () => {
      actions.pulse();
      print("// pushed to every branch. look up ↑", "acc");
    },
    git: (args) => {
      if (args[0] === "push") {
        print("Enumerating objects: 1337, done.\nWriting objects: 100% (1337/1337)\nTo origin/main\n   * [the last commit] → main", "acc");
        actions.pulse();
      } else if (args[0] === "commit") print("[main 4f2c1aa] it's not the last one yet. keep building.", "acc");
      else print("usage: git push | git commit", "warn");
    },
    iddqd: () => actions.godMode(),
    clear: () => (out.innerHTML = ""),
  };

  print("THE LAST COMMIT shell v1.0 — type 'help' to list commands.", "acc");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = input.value.trim();
    input.value = "";
    if (!raw) return;
    history.push(raw);
    hIdx = history.length;
    print(`$ ${raw}`, "cmd");
    const [cmd, ...args] = raw.split(/\s+/);
    const fn = commands[cmd.toLowerCase()];
    if (fn) fn(args);
    else print(`command not found: ${cmd}. try 'help'.`, "warn");
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" && hIdx > 0) {
      hIdx--;
      input.value = history[hIdx];
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      hIdx = Math.min(history.length, hIdx + 1);
      input.value = history[hIdx] ?? "";
      e.preventDefault();
    } else if (e.key === "Tab") {
      const match = Object.keys(commands).find((c) => c.startsWith(input.value) && input.value);
      if (match) input.value = match;
      e.preventDefault();
    }
  });

  document.getElementById("term")!.addEventListener("click", () => input.focus({ preventScroll: true }));
}

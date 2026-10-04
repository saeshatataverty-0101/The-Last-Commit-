/**
 * Simulated live commit feed for the hero: a new commit from a random team
 * slides in every few seconds, like a hackathon dashboard.
 */

const TEAMS = [
  "null-pointers",
  "404-sleep-not-found",
  "git-happens",
  "segfault-squad",
  "ctrl-alt-elite",
  "the-mergers",
  "byte-me",
  "stack-overflowers",
  "team-rocket.js",
  "localhost-heroes",
];

const MESSAGES = [
  "feat: add OTP login",
  "fix: websocket race condition",
  "chore: deploy to production",
  "feat: realtime leaderboard",
  "fix: works on my machine",
  "docs: update README",
  "feat: offline mode",
  "refactor: clean up API routes",
  "fix: typo in prod",
  "feat: dark mode",
  "test: add e2e for checkout",
  "feat: AI summary endpoint",
  "perf: cache db queries",
  "style: final UI polish",
];

const pick = <T>(arr: T[]) => arr[(Math.random() * arr.length) | 0];
const hex = () => Math.floor(Math.random() * 0xfffffff).toString(16).padStart(7, "0");

export function initFeed() {
  const list = document.getElementById("feed");
  if (!list) return;
  const MAX = 3;

  const add = (animate: boolean) => {
    const li = document.createElement("li");
    const add = 5 + Math.floor(Math.random() * 400);
    const del = Math.floor(Math.random() * 60);
    li.innerHTML = `<b>${hex()}</b><span class="feed__team">${pick(TEAMS)}</span><span class="feed__msg"></span><i>+${add} −${del}</i>`;
    li.querySelector(".feed__msg")!.textContent = pick(MESSAGES);
    if (animate) li.classList.add("is-new");
    list.prepend(li);
    while (list.children.length > MAX) list.lastElementChild!.remove();
  };

  for (let i = 0; i < MAX; i++) add(false);
  const loop = () => {
    add(true);
    setTimeout(loop, 2200 + Math.random() * 2200);
  };
  setTimeout(loop, 2500);
}

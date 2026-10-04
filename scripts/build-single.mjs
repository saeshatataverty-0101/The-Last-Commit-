// Bundles dist/ into one self-contained HTML file (JS + CSS + fonts inlined)
// so the site can be opened by double-clicking, without a server.
// Usage: npm run build:single  →  the-last-commit.html
import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const assets = readdirSync("dist/assets");
const js = readFileSync(`dist/assets/${assets.find((f) => f.endsWith(".js"))}`, "utf8").replaceAll("</script", "<\\/script");
const css = readFileSync(`dist/assets/${assets.find((f) => f.endsWith(".css"))}`, "utf8");

const html = readFileSync("dist/index.html", "utf8")
  .replace(/<script type="module" crossorigin src="[^"]*"><\/script>\s*/, "")
  .replace(/<link rel="stylesheet" crossorigin href="[^"]*">/, () => `<style>${css}</style>`)
  .replace("</body>", () => `<script type="module">${js}</script>\n</body>`);

writeFileSync("the-last-commit.html", html);
console.log(`the-last-commit.html written (${(html.length / 1024).toFixed(0)} KB)`);

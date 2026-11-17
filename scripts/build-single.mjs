// Packs the production build (dist/) into one HTML file that opens with a double click,
// without a server and without an installation. Run through `npm run build:single`.
//
// Vite writes one script and one stylesheet next to index.html. Browsers refuse to load
// module scripts from file:// addresses, so both are written into the page itself.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const outDir = join(root, "dist-single");
const outFile = join(outDir, "ai-competency-check.html");

let html = readFileSync(join(dist, "index.html"), "utf8");
let scripts = 0;
let styles = 0;

// Inside a <script> element the text must not contain "</script" or "<!--".
const safeScript = (code) => code.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");
const safeStyle = (css) => css.replace(/<\/style/gi, "<\\/style");

html = html.replace(/<script type="module"[^>]*\ssrc="\.\/([^"]+)"[^>]*><\/script>/g, (_tag, file) => {
  scripts += 1;
  return `<script type="module">${safeScript(readFileSync(join(dist, file), "utf8"))}</script>`;
});
html = html.replace(/<link rel="stylesheet"[^>]*\shref="\.\/([^"]+)"[^>]*>/g, (_tag, file) => {
  styles += 1;
  return `<style>${safeStyle(readFileSync(join(dist, file), "utf8"))}</style>`;
});

if (scripts !== 1 || styles !== 1) {
  console.error(`Expected one script and one stylesheet in dist/index.html, found ${scripts} and ${styles}.`);
  process.exit(1);
}
if (/\b(?:src|href)="\.\/assets\//.test(html)) {
  console.error("dist/index.html still points to files in assets/; the single file would be incomplete.");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, html);
console.log(`${outFile} (${Math.round(html.length / 1024)} kB)`);

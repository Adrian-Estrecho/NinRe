// Renders the app icon and splash PNGs that `npx capacitor-assets generate` reads from client/assets/.
// node assets/src/render.mjs   (needs Google Chrome; set CHROME to its path if it isn't in the usual place)
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const src = dirname(fileURLToPath(import.meta.url));
const out = join(src, "..");
const chrome = process.env.CHROME || (process.platform === "win32" ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : "google-chrome");
const svg = (name) => `data:image/svg+xml;base64,${readFileSync(join(src, name)).toString("base64")}`;
const layers = `<img src="${svg("icon-background.svg")}"><img src="${svg("icon-foreground.svg")}">`;

function shot(file, size, body, transparent = false) {
  const html = join(src, `.${file}.html`);
  writeFileSync(html, `<!doctype html><html><head><style>
    html, body { margin: 0; width: ${size}px; height: ${size}px; overflow: hidden; background: transparent; }
    img { position: absolute; inset: 0; width: 100%; height: 100%; }
    .splash { position: absolute; inset: 0; display: grid; place-items: center; }
    .splash .tile { position: relative; width: 22%; aspect-ratio: 1; border-radius: 22%; overflow: hidden; box-shadow: 0 30px 80px -30px rgba(0, 0, 0, .55); }
  </style></head><body>${body}</body></html>`);
  execFileSync(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", `--window-size=${size},${size}`,
    ...(transparent ? ["--default-background-color=00000000"] : []), `--screenshot=${join(out, file)}`, pathToFileURL(html).href], { stdio: "ignore" });
  console.log(file);
}

shot("icon-background.png", 1024, `<img src="${svg("icon-background.svg")}">`);
shot("icon-foreground.png", 1024, `<img src="${svg("icon-foreground.svg")}">`, true);
shot("icon-only.png", 1024, layers);
shot("splash.png", 2732, `<div class="splash" style="background:#2a56b9"><div class="tile">${layers}</div></div>`);
shot("splash-dark.png", 2732, `<div class="splash" style="background:#14202b"><div class="tile">${layers}</div></div>`);

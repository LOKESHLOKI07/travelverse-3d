/**
 * Copies static assets from dist into public/ and src/assets/ so Vite dev and
 * bundled image imports stay in sync after a build.
 */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodeFontsInDirectory } from "./decode-base64-fonts.js";
import { decodeImagesInDirectory } from "./decode-base64-images.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const feRoot = path.join(repoRoot, "src", "frontend");
const distAssets = path.join(feRoot, "dist", "assets");
const pubAssets = path.join(feRoot, "public", "assets");
const srcAssets = path.join(feRoot, "src", "assets");

/** Keeps `public/assets/mountain_explorers_logo.png` in sync with `src/assets` (used by `/assets/...` in the UI). */
function syncBrandingLogo() {
  const logoSrc = path.join(srcAssets, "mountain_explorers_logo.png");
  const logoDst = path.join(pubAssets, "mountain_explorers_logo.png");
  if (!existsSync(logoSrc)) return;
  mkdirSync(path.dirname(logoDst), { recursive: true });
  cpSync(logoSrc, logoDst);
  console.log(
    "sync-frontend-public-assets: src/assets/mountain_explorers_logo.png -> public/assets/",
  );
}

if (!existsSync(distAssets)) {
  for (const imgDir of [
    path.join(pubAssets, "generated"),
    path.join(pubAssets, "uploads"),
    path.join(srcAssets, "generated"),
  ]) {
    if (!existsSync(imgDir)) continue;
    const r = decodeImagesInDirectory(imgDir);
    if (r.decoded) {
      console.log("sync-frontend-public-assets: decoded images in", imgDir, r);
    }
  }
  console.warn(
    "sync-frontend-public-assets: src/frontend/dist/assets not found — run `npx vite build` in src/frontend once.",
  );
  syncBrandingLogo();
  process.exit(0);
}

mkdirSync(pubAssets, { recursive: true });

for (const dir of ["generated", "fonts", "uploads"]) {
  const from = path.join(distAssets, dir);
  const to = path.join(pubAssets, dir);
  if (!existsSync(from)) continue;
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

const genFrom = path.join(distAssets, "generated");
const genTo = path.join(srcAssets, "generated");
if (existsSync(genFrom)) {
  mkdirSync(genTo, { recursive: true });
  cpSync(genFrom, genTo, { recursive: true });
}

const fontsFrom = path.join(distAssets, "fonts");
const fontsTo = path.join(srcAssets, "fonts");
if (existsSync(fontsFrom)) {
  mkdirSync(fontsTo, { recursive: true });
  cpSync(fontsFrom, fontsTo, { recursive: true });
}

const pubFonts = path.join(pubAssets, "fonts");
for (const fontDir of [pubFonts, fontsTo, fontsFrom]) {
  if (!existsSync(fontDir)) continue;
  const r = decodeFontsInDirectory(fontDir);
  if (r.decodedWoff2 || r.trimmedWoff2 || r.convertedTtf) {
    console.log("sync-frontend-public-assets: decoded fonts in", fontDir, r);
  }
}

const pubGenerated = path.join(pubAssets, "generated");
const pubUploads = path.join(pubAssets, "uploads");
const distUploads = path.join(distAssets, "uploads");
for (const imgDir of [pubGenerated, pubUploads, genTo, genFrom, distUploads]) {
  if (!existsSync(imgDir)) continue;
  const r = decodeImagesInDirectory(imgDir);
  if (r.decoded) {
    console.log("sync-frontend-public-assets: decoded images in", imgDir, r);
  }
}

syncBrandingLogo();

console.log(
  "sync-frontend-public-assets: dist -> public/assets and src/assets (generated, fonts, uploads)",
);

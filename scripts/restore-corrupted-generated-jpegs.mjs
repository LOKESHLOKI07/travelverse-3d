/**
 * Replaces generated JPGs that no longer decode to valid JPEG (corrupted base64 / JUMBF text).
 * Writes the same bytes to src/assets/generated and public/assets/generated.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const feRoot = path.join(__dirname, "..", "src", "frontend");
const dirs = [
  path.join(feRoot, "src", "assets", "generated"),
  path.join(feRoot, "public", "assets", "generated"),
];

/** @type {Record<string, string>} */
const SOURCES = {
  "experience-above-clouds.dim_800x500.jpg":
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&w=800&h=500&fit=crop&q=80",
  "experience-snow-training.dim_800x500.jpg":
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&w=800&h=500&fit=crop&q=80",
  "experience-summit-sunrise.dim_800x500.jpg":
    "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&w=800&h=500&fit=crop&q=80",
  "friendship-peak-hero.dim_1920x600.jpg":
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&w=1920&h=600&fit=crop&q=80",
};

async function main() {
  for (const dir of dirs) {
    mkdirSync(dir, { recursive: true });
  }

  for (const [filename, url] of Object.entries(SOURCES)) {
    const res = await fetch(url, {
      headers: { Accept: "image/jpeg" },
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(`${filename}: HTTP ${res.status} ${url}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500 || buf[0] !== 0xff || buf[1] !== 0xd8) {
      throw new Error(`${filename}: response is not a JPEG`);
    }
    for (const dir of dirs) {
      writeFileSync(path.join(dir, filename), buf);
    }
    console.log("restore-corrupted-generated-jpegs:", filename, buf.length, "bytes");
  }
  console.log("restore-corrupted-generated-jpegs: done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

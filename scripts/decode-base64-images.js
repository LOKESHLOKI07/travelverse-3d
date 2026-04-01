/**
 * Some images were stored as base64 text inside `.png` / `.jpg` / `.webp` files.
 * Browsers and Three.js TextureLoader then fail (e.g. naturalWidth 0 or "undefined").
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

function looksLikeBinaryPng(buf) {
  return (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  );
}

function looksLikeBinaryJpeg(buf) {
  return buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8;
}

function looksLikeBinaryWebp(buf) {
  return (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

function isAlreadyBinaryForExt(buf, ext) {
  const e = ext.toLowerCase();
  if (e === ".png") return looksLikeBinaryPng(buf);
  if (e === ".jpg" || e === ".jpeg") return looksLikeBinaryJpeg(buf);
  if (e === ".webp") return looksLikeBinaryWebp(buf);
  return (
    looksLikeBinaryPng(buf) ||
    looksLikeBinaryJpeg(buf) ||
    looksLikeBinaryWebp(buf)
  );
}

function decodedMatchesExt(buf, ext) {
  const e = ext.toLowerCase();
  if (e === ".png") return looksLikeBinaryPng(buf);
  if (e === ".jpg" || e === ".jpeg") return looksLikeBinaryJpeg(buf);
  if (e === ".webp") return looksLikeBinaryWebp(buf);
  return (
    looksLikeBinaryPng(buf) ||
    looksLikeBinaryJpeg(buf) ||
    looksLikeBinaryWebp(buf)
  );
}

/** Base64 decoded PNGs sometimes lose the leading 0x89 (UTF-8 mangling → U+FFFD bytes). */
function repairDecodedPng(buf) {
  if (looksLikeBinaryPng(buf)) return buf;
  const win = Math.min(buf.length, 96);
  for (let i = 0; i <= win - 8; i++) {
    if (
      buf[i] === 0x50 &&
      buf[i + 1] === 0x4e &&
      buf[i + 2] === 0x47 &&
      buf[i + 3] === 0x0d &&
      buf[i + 4] === 0x0a &&
      buf[i + 5] === 0x1a &&
      buf[i + 6] === 0x0a
    ) {
      return Buffer.concat([Buffer.from([0x89]), buf.subarray(i)]);
    }
  }
  for (let i = 1; i <= win - 8; i++) {
    if (looksLikeBinaryPng(buf.subarray(i))) return buf.subarray(i);
  }
  return buf;
}

/** Strip a garbage prefix before JPEG SOI (FF D8). */
function repairDecodedJpeg(buf) {
  if (looksLikeBinaryJpeg(buf)) return buf;
  const max = Math.min(buf.length, 512 * 1024);
  for (let i = 0; i < max - 1; i++) {
    if (buf[i] === 0xff && buf[i + 1] === 0xd8) return buf.subarray(i);
  }
  return buf;
}

/**
 * @param {string} dir
 * @returns {{ decoded: number; skipped: number }}
 */
export function decodeImagesInDirectory(dir) {
  const out = { decoded: 0, skipped: 0 };
  if (!existsSync(dir)) return out;

  for (const name of readdirSync(dir)) {
    const ext = path.extname(name);
    if (!/^\.(png|jpe?g|webp)$/i.test(ext)) continue;
    const filePath = path.join(dir, name);
    const raw = readFileSync(filePath);
    if (isAlreadyBinaryForExt(raw, ext)) {
      out.skipped += 1;
      continue;
    }

    let str;
    try {
      str = raw.toString("utf8").trim().replace(/\s/g, "");
    } catch {
      out.skipped += 1;
      continue;
    }

    if (str.length < 80 || !/^[A-Za-z0-9+/=]+$/.test(str)) {
      out.skipped += 1;
      continue;
    }

    let buf;
    try {
      buf = Buffer.from(str, "base64");
    } catch {
      out.skipped += 1;
      continue;
    }

    const e = ext.toLowerCase();
    if (e === ".png") buf = repairDecodedPng(buf);
    if (e === ".jpg" || e === ".jpeg") buf = repairDecodedJpeg(buf);

    if (!decodedMatchesExt(buf, ext)) {
      out.skipped += 1;
      continue;
    }

    writeFileSync(filePath, buf);
    out.decoded += 1;
  }

  return out;
}

const __entry = process.argv[1] ? path.basename(process.argv[1]) : "";
const __isMain = __entry === "decode-base64-images.js";
if (__isMain) {
  const { fileURLToPath } = await import("node:url");
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const feRoot = path.join(__dirname, "..", "src", "frontend");
  const dirs = [
    path.join(feRoot, "src", "assets", "generated"),
    path.join(feRoot, "public", "assets", "generated"),
    path.join(feRoot, "public", "assets", "uploads"),
    path.join(feRoot, "dist", "assets", "generated"),
    path.join(feRoot, "dist", "assets", "uploads"),
  ];
  let total = { decoded: 0, skipped: 0 };
  for (const d of dirs) {
    const r = decodeImagesInDirectory(d);
    total.decoded += r.decoded;
    total.skipped += r.skipped;
    if (r.decoded) console.log("decode-base64-images:", d, r);
  }
  console.log("decode-base64-images: done", total);
}

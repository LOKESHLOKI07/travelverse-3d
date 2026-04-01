/**
 * Some font files were committed as base64 text inside `.woff2` paths. Browsers
 * then report OTS errors (invalid sfntVersion). This decodes them to real
 * binary WOFF2, or writes TrueType/OpenType sfnt as `.ttf` and removes the
 * misnamed `.woff2`.
 *
 * Also trims binary WOFF2 to the total `length` in the file header (big-endian
 * UInt32 at offset 8). Extra trailing bytes (often UTF-8 mojibake) break
 * browser decoding: "Size of decompressed WOFF 2.0 is less than compressed size".
 */
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

function isBinaryWoff2(buf) {
  return (
    buf.length >= 4 &&
    buf[0] === 0x77 &&
    buf[1] === 0x4f &&
    buf[2] === 0x46 &&
    buf[3] === 0x32
  );
}

function isSfnt(buf) {
  if (buf.length < 4) return false;
  if (buf[0] === 0 && buf[1] === 1 && buf[2] === 0 && buf[3] === 0) return true;
  return buf.subarray(0, 4).toString("ascii") === "OTTO";
}

/** @see https://www.w3.org/TR/WOFF2/#woff20Header */
function trimWoff2ToDeclaredLength(buf) {
  if (!isBinaryWoff2(buf) || buf.length < 12) return buf;
  const declared = buf.readUInt32BE(8);
  if (declared < 12 || declared > buf.length) return buf;
  if (declared === buf.length) return buf;
  return buf.subarray(0, declared);
}

/**
 * @param {string} dir
 * @returns {{ decodedWoff2: number; trimmedWoff2: number; convertedTtf: number; skipped: number }}
 */
export function decodeFontsInDirectory(dir) {
  const out = {
    decodedWoff2: 0,
    trimmedWoff2: 0,
    convertedTtf: 0,
    skipped: 0,
  };
  if (!existsSync(dir)) return out;

  for (const name of readdirSync(dir)) {
    if (!name.toLowerCase().endsWith(".woff2")) continue;
    const filePath = path.join(dir, name);
    const raw = readFileSync(filePath);
    if (isBinaryWoff2(raw)) {
      const trimmed = trimWoff2ToDeclaredLength(raw);
      if (trimmed.length !== raw.length) {
        writeFileSync(filePath, trimmed);
        out.trimmedWoff2 += 1;
      } else {
        out.skipped += 1;
      }
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

    if (buf.length < 8) {
      out.skipped += 1;
      continue;
    }

    if (isBinaryWoff2(buf)) {
      const trimmed = trimWoff2ToDeclaredLength(buf);
      writeFileSync(filePath, trimmed);
      out.decodedWoff2 += 1;
      if (trimmed.length !== buf.length) out.trimmedWoff2 += 1;
      continue;
    }

    if (isSfnt(buf)) {
      const ttfPath = filePath.replace(/\.woff2$/i, ".ttf");
      writeFileSync(ttfPath, buf);
      unlinkSync(filePath);
      out.convertedTtf += 1;
      continue;
    }

    out.skipped += 1;
  }

  return out;
}

const __entry = process.argv[1] ? path.basename(process.argv[1]) : "";
const __isMain = __entry === "decode-base64-fonts.js";
if (__isMain) {
  const { fileURLToPath } = await import("node:url");
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const feRoot = path.join(__dirname, "..", "src", "frontend");
  const dirs = [
    path.join(feRoot, "src", "assets", "fonts"),
    path.join(feRoot, "public", "assets", "fonts"),
    path.join(feRoot, "dist", "assets", "fonts"),
  ];
  let total = {
    decodedWoff2: 0,
    trimmedWoff2: 0,
    convertedTtf: 0,
    skipped: 0,
  };
  for (const d of dirs) {
    const r = decodeFontsInDirectory(d);
    total.decodedWoff2 += r.decodedWoff2;
    total.trimmedWoff2 += r.trimmedWoff2;
    total.convertedTtf += r.convertedTtf;
    total.skipped += r.skipped;
    if (r.decodedWoff2 || r.trimmedWoff2 || r.convertedTtf) {
      console.log("decode-base64-fonts:", d, r);
    }
  }
  console.log("decode-base64-fonts: done", total);
}

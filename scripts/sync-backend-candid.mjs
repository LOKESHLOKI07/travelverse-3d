/**
 * After a Motoko build (`icp` / canister.yaml), moc writes the actor interface
 * next to --actor-idl (see src/backend/canister.yaml → system-idl).
 * This copies that file beside the hand-maintained JS IDL so you can diff and
 * refresh src/frontend/src/declarations/backend.did.* + backend.ts when needed.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const idlDir = path.join(root, "src", "backend", "system-idl");
const outFile = path.join(
  root,
  "src",
  "frontend",
  "src",
  "declarations",
  "backend.from-moc.did",
);

const skip = new Set(["aaaaa-aa.did"]);

function findActorDid() {
  if (!fs.existsSync(idlDir)) {
    return null;
  }
  const names = fs.readdirSync(idlDir).filter(
    (f) => f.endsWith(".did") && !skip.has(f),
  );
  // main.mo → moc typically emits main.did
  const preferred = names.find((n) => n === "main.did");
  if (preferred) return path.join(idlDir, preferred);
  if (names.length === 1) return path.join(idlDir, names[0]);
  return null;
}

const src = findActorDid();
if (!src) {
  console.error(
    "No actor .did found under src/backend/system-idl (except aaa). Build the backend first (icp / moc with --actor-idl).",
  );
  process.exit(1);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.copyFileSync(src, outFile);
console.log(`Copied ${path.relative(root, src)} → ${path.relative(root, outFile)}`);
console.log(
  "If field order or methods differ from backend.did.js, align declarations manually or regenerate JS bindings from this .did.",
);

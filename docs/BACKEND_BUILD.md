# Backend (Motoko) build, Candid, and deploy

## Build WASM

Use your ICP/Motoko toolchain (for example `icp` with `src/backend/canister.yaml`). The build runs `moc` with `--actor-idl system-idl`, which emits the actor interface as a `.did` file alongside `main.mo` (typically `src/backend/system-idl/main.did`).

## Keep the frontend IDL in sync

The app uses hand-maintained bindings under `src/frontend/src/declarations/backend.did.js` and `backend.did.d.ts`, plus `src/frontend/src/backend.ts` / `backend.d.ts`.

After you change `main.mo` or rebuild:

1. Run `pnpm sync-backend-candid` (or `npm run sync-backend-candid`) from the repo root. That copies the moc-generated interface to `src/frontend/src/declarations/backend.from-moc.did` (gitignored) for comparison.
2. If method names, record field order, or variants differ from what the JS IDL encodes, update `backend.did.js`, `backend.did.d.ts`, and the `Backend` wrapper types/methods in `backend.ts` / `backend.d.ts` so they match moc output. Field order in Candid matters for encoding.

## Deploy and exercise the catalog

1. Deploy the backend canister and point the frontend at its canister id (your usual env / config).
2. Sign in with the admin principal (as configured in the canister).
3. Open **Admin** → **Catalog** → **Seed demo catalog** (or manage categories/packages there).
4. Use **Private** and **Fixed** pages against the live catalog.

## Persistence and admin UI scope

- Catalog and bookings in the actor heap follow the Motoko **persistent actor** / compiler defaults for upgrade survival; confirm behavior with your Motoko version and deployment settings.
- A full in-browser editor for every field is optional; the Catalog tab builds on `adminPutPackage`, `adminUpsertCategory`, and related admin methods.

import type { SyntheticEvent } from "react";

/** Avoid duplicate logo groups when React Strict Mode runs effects twice (dev). */
let logoDevContextLogged = false;

/**
 * Dev-only: global image error capture, window.load img audit, config logging.
 * Strip in production via import.meta.env.DEV guards.
 */
function auditImages(label: string): void {
  const imgs = [...document.querySelectorAll("img")];
  console.groupCollapsed(
    `[TravelVerse] ${imgs.length} <img> — ${label}`,
  );
  for (const [i, img] of imgs.entries()) {
    const src = img.currentSrc || img.src;
    const ok = img.complete && img.naturalWidth > 0;
    const line = {
      ok,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      src: src.length > 120 ? `${src.slice(0, 120)}…` : src,
    };
    if (ok) console.log(`#${i}`, line);
    else console.warn(`#${i} FAILED`, line);
  }
  console.groupEnd();
}

export function installDevDebug(): void {
  if (!import.meta.env.DEV) return;

  console.info(
    "%c[TravelVerse]",
    "color:#22d3ee;font-weight:bold",
    "dev debug on — <img> audits run after paint (Strict Mode–safe). Fonts: Plus Jakarta Sans & Bricolage Grotesque (Google Fonts, index.css).",
  );

  const schedule = () => {
    auditImages("window load + 400ms");
    setTimeout(() => auditImages("window load + 2s (React settled)"), 1600);
  };

  if (document.readyState === "complete") {
    setTimeout(schedule, 400);
  } else {
    window.addEventListener("load", () => setTimeout(schedule, 400), {
      once: true,
    });
  }
}

export function logDevConfigLoaded(config: {
  backend_canister_id: string;
  backend_host?: string;
  storage_gateway_url: string;
  project_id: string;
}): void {
  if (!import.meta.env.DEV) return;
  console.info("[TravelVerse] loadConfig", {
    backend_canister_id: config.backend_canister_id,
    backend_host: config.backend_host ?? "(default)",
    storage_gateway_url: config.storage_gateway_url || "(empty)",
    project_id: config.project_id,
  });
}

export function logDevBundledImages(urls: Record<string, string>): void {
  if (!import.meta.env.DEV) return;
  console.groupCollapsed("[TravelVerse] bundled image URLs (Vite)");
  for (const [name, url] of Object.entries(urls)) {
    console.log(name, url);
  }
  console.groupEnd();
}

/** Why the header logo might 404 or not decode — logs once per page load in dev. */
export function logLogoDevContext(logoUrl: string): void {
  if (!import.meta.env.DEV) return;
  if (logoDevContextLogged) return;
  logoDevContextLogged = true;

  const resolved = new URL(logoUrl, window.location.href).href;
  console.groupCollapsed("[TravelVerse] logo debug");
  console.log("LOGO_URL (raw)", logoUrl);
  console.log("resolved (absolute)", resolved);
  console.log("import.meta.env.BASE_URL", import.meta.env.BASE_URL);
  console.log("window.location", window.location.href);
  console.log(
    "Tip: fetch 200 + image/png means the file is served. If it still looks wrong, check the next lines and [TravelVerse] logo <img> onLoad / onError.",
  );

  void fetch(logoUrl, { method: "GET", cache: "no-store" })
    .then(async (r) => {
      console.log("fetch probe", {
        status: r.status,
        ok: r.ok,
        contentType: r.headers.get("content-type"),
      });
      if (!r.ok) {
        console.warn(
          "Logo URL returned non-OK — ensure public/assets/mountain_explorers_logo.png exists and sync-frontend-public-assets ran (or copy from src/assets).",
        );
        return;
      }
      try {
        const blob = await r.blob();
        const bmp = await createImageBitmap(blob);
        console.log("[TravelVerse] logo decode test (createImageBitmap)", {
          width: bmp.width,
          height: bmp.height,
        });
        bmp.close();
      } catch (err: unknown) {
        console.error(
          "[TravelVerse] logo: bytes downloaded but browser cannot decode (corrupt file?)",
          err,
        );
      }
    })
    .catch((err: unknown) => {
      console.error("fetch probe failed (network / CORS / blocked)", err);
    });

  console.groupEnd();
}

export function logoImgDevHandlers(): {
  onLoad: (e: SyntheticEvent<HTMLImageElement>) => void;
  onError: (e: SyntheticEvent<HTMLImageElement>) => void;
} | undefined {
  if (!import.meta.env.DEV) return undefined;
  return {
    onLoad(e) {
      const el = e.currentTarget;
      console.log("[TravelVerse] logo <img> onLoad OK", {
        naturalWidth: el.naturalWidth,
        naturalHeight: el.naturalHeight,
        currentSrc: el.currentSrc || el.src,
      });
    },
    onError(e) {
      const el = e.currentTarget;
      console.error("[TravelVerse] logo <img> onError (browser failed to decode or 404)", {
        src: el.src,
        currentSrc: el.currentSrc,
        complete: el.complete,
      });
    },
  };
}

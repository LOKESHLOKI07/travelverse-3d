import { appendNodeApiAuthHeaders } from "../api/nodeHttpBackend";
import { debugCatalogClient } from "./catalogDebug";
import { getAdminBearerToken } from "./adminLocalSession";
import { getUserBearerToken } from "./userLocalSession";

function nodeApiBase(): string {
  const raw =
    (import.meta.env.VITE_NODE_API_BASE_URL as string | undefined) ??
    "/api-node";
  return raw.replace(/\/$/, "") || "/api-node";
}

/** Admin-only; returns a URL suitable for hero / thumbnail fields (same origin in Vite dev). */
export async function uploadCatalogImage(
  file: File,
  getPrincipalText: () => string,
): Promise<string> {
  const base = nodeApiBase();
  const fd = new FormData();
  fd.append("image", file);
  const headers = new Headers();
  appendNodeApiAuthHeaders(
    headers,
    getPrincipalText,
    getAdminBearerToken,
    getUserBearerToken,
  );
  const uploadUrl = `${base}/catalog-media/upload`;
  if (debugCatalogClient()) {
    console.log("[tourist-debug][catalog-upload] POST", uploadUrl, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });
  }
  const res = await fetch(uploadUrl, {
    method: "POST",
    body: fd,
    headers,
  });
  if (debugCatalogClient()) {
    console.log(
      "[tourist-debug][catalog-upload] response status",
      res.status,
      res.statusText,
    );
  }
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = (await res.json()) as { error?: string };
      if (j?.error) msg = j.error;
    } catch {
      try {
        msg = await res.text();
      } catch {
        /* ignore */
      }
    }
    if (debugCatalogClient()) {
      console.warn("[tourist-debug][catalog-upload] error body", msg);
    }
    throw new Error(msg);
  }
  const j = (await res.json()) as { url?: string };
  if (!j?.url || typeof j.url !== "string") {
    if (debugCatalogClient()) {
      console.warn("[tourist-debug][catalog-upload] bad JSON", j);
    }
    throw new Error("Invalid upload response");
  }
  if (debugCatalogClient()) {
    console.log("[tourist-debug][catalog-upload] image URL returned:", j.url);
  }
  return j.url;
}

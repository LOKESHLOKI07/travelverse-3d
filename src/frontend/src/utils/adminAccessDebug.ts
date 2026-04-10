import { Principal } from "@icp-sdk/core/principal";
import { viteEnvIsTrue } from "./viteEnv";

export const ANONYMOUS_PRINCIPAL_TEXT = Principal.anonymous().toText();

export function snapshotIdentityForAdminDebug(
  identity:
    | {
        getPrincipal(): {
          toText(): string;
          isAnonymous?: () => boolean;
        };
      }
    | undefined,
) {
  if (!identity) {
    return { hasIdentity: false as const };
  }
  const p = identity.getPrincipal();
  const text = p.toText();
  const isAnon =
    typeof p.isAnonymous === "function"
      ? Boolean(p.isAnonymous())
      : text === ANONYMOUS_PRINCIPAL_TEXT;
  return {
    hasIdentity: true as const,
    principalText: text,
    principalLength: text.length,
    identityReportsAnonymous: isAnon,
    equalsAnonymousConstant: text === ANONYMOUS_PRINCIPAL_TEXT,
  };
}

export function snapshotViteBackendMode() {
  return {
    VITE_USE_NODE_BACKEND: viteEnvIsTrue(import.meta.env.VITE_USE_NODE_BACKEND),
    VITE_NODE_API_BASE_URL:
      (import.meta.env.VITE_NODE_API_BASE_URL as string | undefined) ||
      "(unset → /api-node)",
    VITE_APP_ADMIN_TOKEN_nonEmpty: Boolean(
      String(import.meta.env.VITE_APP_ADMIN_TOKEN ?? "").trim(),
    ),
  };
}

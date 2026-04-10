import type { Identity } from "@icp-sdk/core/agent";
import { Principal } from "@icp-sdk/core/principal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";
import { adminLocalJwtKeyPart } from "../utils/adminLocalSession";
import { userLocalJwtKeyPart } from "../utils/userLocalSession";
import { getSecretParameter, getSessionParameter } from "../utils/urlParams";
import { viteEnvIsTrue } from "../utils/viteEnv";
import { useInternetIdentity } from "./useInternetIdentity";

export const ACTOR_QUERY_KEY = "actor";

/** Stable key when II identity is not loaded yet (avoids `undefined.toString()` crashes). */
export function actorQueryPrincipalKey(identity: Identity | undefined): string {
  const p =
    identity?.getPrincipal()?.toText() ?? Principal.anonymous().toText();
  if (viteEnvIsTrue(import.meta.env.VITE_USE_NODE_BACKEND)) {
    return `${p}::${adminLocalJwtKeyPart()}::${userLocalJwtKeyPart()}`;
  }
  return p;
}

/**
 * Shared options for `useActor` and `queryClient.fetchQuery` so saves can await the
 * backend while the hook’s `data` is still undefined (avoids “Not connected” toasts).
 */
export function getActorQueryOptions(identity: Identity | undefined) {
  const queryKey = [ACTOR_QUERY_KEY, actorQueryPrincipalKey(identity)] as const;

  const queryFn = async (): Promise<backendInterface> => {
    const isAuthenticated = !!identity;
    const sessionAdminToken = getSessionParameter("appAdminToken") ?? "";
    /** Node API: send bootstrap secret for init-access whenever using HTTP backend (not only vite dev). */
    const nodeBootstrap = viteEnvIsTrue(import.meta.env.VITE_USE_NODE_BACKEND)
      ? (import.meta.env.VITE_APP_ADMIN_TOKEN as string | undefined)?.trim() ||
        "dev-admin"
      : "";

    if (!isAuthenticated) {
      return createActorWithConfig();
    }

    const actorOptions = {
      agentOptions: {
        identity,
      },
    };

    const actor = await createActorWithConfig(actorOptions);
    const adminToken =
      getSecretParameter("appAdminToken") ||
      sessionAdminToken ||
      nodeBootstrap;
    try {
      await actor._initializeAccessControlWithSecret(adminToken);
    } catch (e) {
      console.warn(
        "[useActor] init-access failed — continuing (Node may still accept X-App-Admin-Token):",
        e,
      );
    }
    return actor;
  };

  return {
    queryKey,
    queryFn,
    staleTime: Number.POSITIVE_INFINITY,
  };
}

export function useActor() {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const actorQuery = useQuery<backendInterface>({
    ...getActorQueryOptions(identity),
    enabled: true,
  });

  // When the actor changes, invalidate dependent queries
  useEffect(() => {
    if (actorQuery.data) {
      queryClient.invalidateQueries({
        predicate: (query) => {
          return !query.queryKey.includes(ACTOR_QUERY_KEY);
        },
      });
      queryClient.refetchQueries({
        predicate: (query) => {
          return !query.queryKey.includes(ACTOR_QUERY_KEY);
        },
      });
    }
  }, [actorQuery.data, queryClient]);

  return {
    actor: actorQuery.data || null,
    isFetching: actorQuery.isFetching,
  };
}

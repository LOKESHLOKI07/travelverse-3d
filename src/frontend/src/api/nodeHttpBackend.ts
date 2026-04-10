import { Principal } from "@icp-sdk/core/principal";
import {
  type Booking,
  BookingStatus,
  type CategoryView,
  type TourPackage,
  type UserProfile,
  UserRole,
  type backendInterface,
} from "../backend";
import { getSecretParameter, getSessionParameter } from "../utils/urlParams";
import {
  ANONYMOUS_PRINCIPAL_TEXT,
  snapshotViteBackendMode,
} from "../utils/adminAccessDebug";
import { viteEnvIsTrue } from "../utils/viteEnv";

function appAdminTokenForHeaders(): string | undefined {
  const fromHash = getSecretParameter("appAdminToken")?.trim();
  const fromSession = getSessionParameter("appAdminToken")?.trim();
  if (fromHash || fromSession) return fromHash || fromSession;
  if (viteEnvIsTrue(import.meta.env.VITE_USE_NODE_BACKEND)) {
    const t = (
      import.meta.env.VITE_APP_ADMIN_TOKEN as string | undefined
    )?.trim();
    return t || "dev-admin";
  }
  return undefined;
}

function parseBooking(j: Record<string, unknown>): Booking {
  const statusStr = String(j.status);
  const status =
    statusStr === "cancelled"
      ? BookingStatus.cancelled
      : statusStr === "confirmed"
        ? BookingStatus.confirmed
        : BookingStatus.pending;
  const catalogPackageId =
    j.catalogPackageId !== undefined && j.catalogPackageId !== null
      ? BigInt(String(j.catalogPackageId))
      : 0n;
  const catalogBatchId =
    j.catalogBatchId !== undefined && j.catalogBatchId !== null
      ? BigInt(String(j.catalogBatchId))
      : undefined;
  const catalogTierIndex =
    j.catalogTierIndex !== undefined && j.catalogTierIndex !== null
      ? BigInt(String(j.catalogTierIndex))
      : undefined;
  return {
    customerName: String(j.customerName),
    packageName: String(j.packageName),
    status,
    bookingId: BigInt(String(j.bookingId)),
    customerPhone: String(j.customerPhone),
    packageCategory: String(j.packageCategory),
    addOns: Array.isArray(j.addOns) ? j.addOns.map(String) : [],
    createdTimestamp: BigInt(String(j.createdTimestamp)),
    travelDate: String(j.travelDate),
    groupSize: BigInt(String(j.groupSize)),
    customerEmail: String(j.customerEmail),
    totalPriceINR: BigInt(String(j.totalPriceINR)),
    catalogPackageId,
    catalogBatchId,
    catalogTierIndex,
  };
}

function roleFromApi(role: string): UserRole {
  if (role === "admin") return UserRole.admin;
  if (role === "user") return UserRole.user;
  return UserRole.guest;
}

/**
 * HTTP client implementing the same surface as the ICP {@link backendInterface}.
 * Identity is sent as `X-IC-Principal` (Internet Identity principal text).
 * `getPrincipalText` runs per request so headers match the live identity (not a snapshot from actor creation).
 */
export function createNodeHttpBackend(
  baseUrl: string,
  getPrincipalText: () => string,
  getAdminBearer?: () => string | null,
  getUserBearer?: () => string | null,
): backendInterface {
  const root = baseUrl.replace(/\/$/, "");

  function api(path: string, init?: RequestInit): Promise<Response> {
    const adminTok = appAdminTokenForHeaders();
    const h = new Headers(init?.headers);
    if (!h.has("Content-Type")) {
      h.set("Content-Type", "application/json");
    }
    const adminBearer = getAdminBearer?.()?.trim();
    const userBearer = getUserBearer?.()?.trim();
    const bearer = adminBearer || userBearer;
    if (bearer) {
      h.set("Authorization", `Bearer ${bearer}`);
    }
    if (adminTok) {
      h.set("X-App-Admin-Token", adminTok);
    }
    h.set("X-IC-Principal", getPrincipalText());
    return fetch(`${root}${path}`, {
      ...init,
      headers: h,
    });
  }

  async function readError(res: Response): Promise<never> {
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
    throw new Error(msg);
  }

  function jsonBodyDeep(value: unknown): string {
    return JSON.stringify(value, (_key, v) =>
      typeof v === "bigint" ? v.toString() : v,
    );
  }

  return {
    async _initializeAccessControlWithSecret(
      userSecret: string,
    ): Promise<void> {
      const res = await api("/init-access", {
        method: "POST",
        body: JSON.stringify({ secret: userSecret }),
      });
      if (!res.ok) await readError(res);
    },

    async assignCallerUserRole(user: Principal, role: UserRole): Promise<void> {
      const res = await api("/assign-role", {
        method: "POST",
        body: JSON.stringify({
          userPrincipal: user.toText(),
          role,
        }),
      });
      if (!res.ok) await readError(res);
    },

    async createBooking(
      packageCategory: string,
      packageName: string,
      customerName: string,
      customerEmail: string,
      customerPhone: string,
      travelDate: string,
      groupSize: bigint,
      addOns: Array<string>,
      totalPriceINR: bigint,
    ): Promise<bigint> {
      const res = await api("/bookings", {
        method: "POST",
        body: JSON.stringify({
          packageCategory,
          packageName,
          customerName,
          customerEmail,
          customerPhone,
          travelDate,
          groupSize: groupSize.toString(),
          addOns,
          totalPriceINR: totalPriceINR.toString(),
        }),
      });
      if (!res.ok) await readError(res);
      const j = (await res.json()) as { bookingId: string };
      return BigInt(j.bookingId);
    },

    async getAllBookings(): Promise<Array<Booking>> {
      const res = await api("/bookings");
      if (!res.ok) await readError(res);
      const arr = (await res.json()) as unknown[];
      return arr.map((x) => parseBooking(x as Record<string, unknown>));
    },

    async getCallerUserProfile(): Promise<UserProfile> {
      const res = await api("/profile");
      if (!res.ok) await readError(res);
      return (await res.json()) as UserProfile;
    },

    async getCallerUserRole(): Promise<UserRole> {
      const res = await api("/caller-role");
      if (!res.ok) await readError(res);
      const j = (await res.json()) as { role: string };
      return roleFromApi(j.role);
    },

    async getMyBookings(): Promise<Array<Booking>> {
      const res = await api("/bookings/mine");
      if (!res.ok) await readError(res);
      const arr = (await res.json()) as unknown[];
      return arr.map((x) => parseBooking(x as Record<string, unknown>));
    },

    async getUserProfile(user: Principal): Promise<UserProfile> {
      const enc = encodeURIComponent(user.toText());
      const res = await api(`/users/${enc}/profile`);
      if (!res.ok) await readError(res);
      return (await res.json()) as UserProfile;
    },

    async isCallerAdmin(): Promise<boolean> {
      const principal = getPrincipalText();
      const absUrl = new URL(`${root}/is-admin`, window.location.origin).href;
      const sendingAdminHeader = Boolean(appAdminTokenForHeaders());

      let res: Response;
      try {
        res = await api("/is-admin");
      } catch (err: unknown) {
        console.error(
          "[tourist admin] isCallerAdmin: fetch failed (Vite proxy / network / CORS?)",
          {
            absUrl,
            principal,
            principalLength: principal.length,
            sendingXAppAdminToken: sendingAdminHeader,
            equalsAnonymousText: principal === ANONYMOUS_PRINCIPAL_TEXT,
            ...snapshotViteBackendMode(),
            error: err,
          },
        );
        throw err;
      }

      const rawText = await res.text();
      let parsed: { isAdmin?: boolean; error?: string } = {};
      try {
        parsed = JSON.parse(rawText) as { isAdmin?: boolean; error?: string };
      } catch {
        console.error("[tourist admin] isCallerAdmin: response is not JSON", {
          absUrl,
          httpStatus: res.status,
          principal,
          rawSnippet: rawText.slice(0, 400),
          ...snapshotViteBackendMode(),
        });
        throw new Error(res.statusText || "Invalid JSON from /is-admin");
      }

      if (!res.ok) {
        console.error("[tourist admin] isCallerAdmin: HTTP error from Node API", {
          absUrl,
          httpStatus: res.status,
          principal,
          responseJson: parsed,
          sendingXAppAdminToken: sendingAdminHeader,
          equalsAnonymousText: principal === ANONYMOUS_PRINCIPAL_TEXT,
          ...snapshotViteBackendMode(),
        });
        throw new Error(
          parsed.error || res.statusText || `HTTP ${res.status} from /is-admin`,
        );
      }

      const isAdmin = Boolean(parsed.isAdmin);
      if (!isAdmin) {
        console.warn(
          "[tourist admin] isCallerAdmin: JSON says isAdmin=false (Node API)",
          {
            absUrl,
            httpStatus: res.status,
            responseJson: parsed,
            principal,
            principalLength: principal.length,
            sendingXAppAdminToken: sendingAdminHeader,
            equalsAnonymousText: principal === ANONYMOUS_PRINCIPAL_TEXT,
            ...snapshotViteBackendMode(),
            hints: [
              principal === ANONYMOUS_PRINCIPAL_TEXT
                ? "Principal text matches anonymous — II may not be wired yet; sign out/in or refresh."
                : null,
              "Ensure tourist-node-api is on 4944 and Vite proxies /api-node → 4944.",
              "If APP_ADMIN_TOKEN is a custom secret, set VITE_APP_ADMIN_TOKEN to match or run init-access.",
              "If TOURIST_DISABLE_OPEN_II_ADMIN=1 on the API, open-II admin is off.",
            ].filter(Boolean),
          },
        );
      }

      return isAdmin;
    },

    async saveCallerUserProfile(profile: UserProfile): Promise<void> {
      const res = await api("/profile", {
        method: "PUT",
        body: JSON.stringify(profile),
      });
      if (!res.ok) await readError(res);
    },

    async updateBookingStatus(
      bookingId: bigint,
      newStatus: BookingStatus,
    ): Promise<void> {
      const res = await api(`/bookings/${bookingId.toString()}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) await readError(res);
    },

    async createCatalogBooking(
      packageId: bigint,
      batchId: bigint | undefined,
      tierIndex: bigint | undefined,
      travelDate: string,
      groupSize: bigint,
      selectedAddOnIds: Array<bigint>,
      customerName: string,
      customerEmail: string,
      customerPhone: string,
      claimedTotalPriceINR: bigint,
    ): Promise<bigint> {
      const res = await api("/catalog/booking", {
        method: "POST",
        body: jsonBodyDeep({
          packageId,
          batchId: batchId ?? null,
          tierIndex: tierIndex ?? null,
          travelDate,
          groupSize,
          selectedAddOnIds,
          customerName,
          customerEmail,
          customerPhone,
          claimedTotalPriceINR,
        }),
      });
      if (!res.ok) await readError(res);
      const j = (await res.json()) as { bookingId: string };
      return BigInt(j.bookingId);
    },
    async listCatalog(): Promise<Array<CategoryView>> {
      const res = await api("/catalog/list");
      if (!res.ok) await readError(res);
      return (await res.json()) as Array<CategoryView>;
    },
    async getPackage(packageId: bigint): Promise<TourPackage | null> {
      const res = await api(`/catalog/package/${packageId.toString()}`);
      if (res.status === 404) return null;
      if (!res.ok) await readError(res);
      return (await res.json()) as TourPackage;
    },
    async adminUpsertCategory(
      id: bigint | undefined,
      name: string,
      sortOrder: bigint,
      active: boolean,
    ): Promise<bigint> {
      const body: Record<string, unknown> = {
        name,
        sortOrder,
        active,
      };
      if (id !== undefined) {
        body.id = id;
      }
      const res = await api("/catalog/admin/category", {
        method: "POST",
        body: jsonBodyDeep(body),
      });
      if (!res.ok) await readError(res);
      const j = (await res.json()) as { id: string };
      return BigInt(j.id);
    },
    async adminDeleteCategory(categoryId: bigint): Promise<void> {
      const res = await api(
        `/catalog/admin/category/${categoryId.toString()}`,
        { method: "DELETE" },
      );
      if (!res.ok) await readError(res);
    },
    async adminPutPackage(pkg: TourPackage): Promise<bigint> {
      const res = await api("/catalog/admin/package", {
        method: "PUT",
        body: jsonBodyDeep(pkg),
      });
      if (!res.ok) await readError(res);
      const j = (await res.json()) as { id: string };
      return BigInt(j.id);
    },
    async adminDeletePackage(packageId: bigint): Promise<void> {
      const res = await api(`/catalog/admin/package/${packageId.toString()}`, {
        method: "DELETE",
      });
      if (!res.ok) await readError(res);
    },
    async adminReserveBatchIds(count: bigint): Promise<Array<bigint>> {
      const res = await api("/catalog/admin/reserve-batch-ids", {
        method: "POST",
        body: jsonBodyDeep({ count }),
      });
      if (!res.ok) await readError(res);
      const j = (await res.json()) as { ids: Array<string | number> };
      return j.ids.map((x) => BigInt(String(x)));
    },
    async adminSeedDemoCatalog(): Promise<void> {
      const res = await api("/catalog/admin/seed", {
        method: "POST",
        body: JSON.stringify({ force: false }),
      });
      if (!res.ok) await readError(res);
      const j = (await res.json()) as { skippedBecauseNotEmpty?: boolean };
      if (j.skippedBecauseNotEmpty) {
        throw new Error(
          "SEED_SKIPPED: Demo seed only runs when the catalog is empty. Use “Replace with demo catalog” to clear and reload all demo categories and packages.",
        );
      }
    },

    async adminReplaceDemoCatalog(): Promise<void> {
      const res = await api("/catalog/admin/seed", {
        method: "POST",
        body: JSON.stringify({ force: true }),
      });
      if (!res.ok) await readError(res);
    },
  };
}

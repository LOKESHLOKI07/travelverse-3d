import type { TourPackage } from "../backend";

/**
 * Listing kind for admin / catalog logic (public site shows one unified catalog).
 * Node API stores extra kinds on packages; canister falls back from `detail` shape.
 */
export type ListingKind =
  | "private"
  | "fixed"
  | "villa"
  | "trek"
  | "hotel";

export type TourAmenity = { icon: string; label: string };

/** Private-package day: short line (accordion header) + long body. */
export type ItineraryDayPlan = { title: string; description: string };

export type TourPackageListing = TourPackage & {
  listingKind?: ListingKind;
  thumbnailUrl?: string;
  longDescription?: string;
  /** Extra gallery images (Node catalog). Hero + thumbnail are merged for display when empty. */
  galleryImageUrls?: string[];
  /** Related package row ids (Node catalog), same ids as `TourPackage.id`. */
  relatedPackageIds?: Array<number | string>;
  /** Long “Overview” body on the public detail page (Node catalog). */
  detailOverview?: string;
  durationLabel?: string;
  tourTypeLabel?: string;
  /** Shown as Included; for fixed tours overrides `detail.fixed.inclusions` when non-empty. */
  packageInclusions?: string[];
  packageExclusions?: string[];
  amenities?: TourAmenity[];
  tourMinAge?: string;
  tourMaxGuestsDisplay?: string;
  tourLocation?: string;
  tourLanguages?: string;
  /** Sidebar “Last minute deals” — other package ids (Node catalog). */
  lastMinuteDealPackageIds?: Array<number | string>;
  /** Day-wise tour plan (Node catalog + derived from legacy `itineraryDays`). */
  itineraryPlan?: ItineraryDayPlan[];
  /** 1–12 or unset (0) — season window for private tours (Node catalog). */
  seasonStartMonth?: number;
  seasonEndMonth?: number;
  meetingPointLabel?: string;
  meetingPointMapsUrl?: string;
  /** Per total-headcount rate; used with traveller-weighted billing when fully configured. */
  privatePartyPricing?: PrivatePartyPriceRow[];
  minOnlinePartySize?: number;
  maxOnlinePartySize?: number;
  childFreeMaxAge?: number;
  childHalfMaxAge?: number;
  childFullMinAge?: number;
  hideItineraryOnDetail?: boolean;
  /** YYYY-MM-DD dates when the property/tour cannot be booked (Node). */
  bookingBlackoutDates?: string[];
  propertyYoutubeUrl?: string;
  propertyMapsUrl?: string;
  villaWeekdayPricePerPersonINR?: number;
  villaWeekendPricePerPersonINR?: number;
  villaWeekdayMaxGuests?: number;
  villaWeekendMaxGuests?: number;
  villaWeekdayPriceNoMealINR?: number;
  villaWeekendPriceNoMealINR?: number;
  /** Parallel to multi-tier room order (Node hotels). */
  hotelRoomTierImageUrls?: string[];
};

export type PrivatePartyPriceRow = {
  pax: number;
  pricePerPersonINR: number;
};

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Human-readable season from 1-based months; empty string if unset. */
export function formatSeasonWindow(
  startMonth: number | undefined,
  endMonth: number | undefined,
): string {
  const s = Number(startMonth);
  const e = Number(endMonth);
  if (s < 1 || s > 12 || e < 1 || e > 12) return "";
  const a = MONTH_SHORT[s - 1]!;
  const b = MONTH_SHORT[e - 1]!;
  if (s === e) return a;
  return `${a} – ${b}`;
}

export function isPrivatePartyMatrixConfigured(p: TourPackage): boolean {
  const tl = p as TourPackageListing;
  const matrix = tl.privatePartyPricing;
  if (!Array.isArray(matrix) || matrix.length === 0) return false;
  const minO = Math.max(1, Number(tl.minOnlinePartySize ?? 2));
  let maxO = Number(tl.maxOnlinePartySize ?? 12);
  if (!Number.isFinite(maxO) || maxO < minO) maxO = minO;
  const byPax = new Map(
    matrix.map((r) => [Number(r.pax), Number(r.pricePerPersonINR)]),
  );
  for (let h = minO; h <= maxO; h++) {
    const pr = byPax.get(h);
    if (!(pr !== undefined && Number.isFinite(pr) && pr > 0)) return false;
  }
  return true;
}

function asListing(p: TourPackage): TourPackageListing {
  return p as TourPackageListing;
}

/**
 * Structured day rows for admin + detail UI.
 * Prefers `itineraryPlan`; otherwise splits legacy `detail.private.itineraryDays`
 * entries on blank lines (`title` then `description`) or uses whole string as description.
 */
export function itineraryPlansFromTourPackage(p: TourPackage): ItineraryDayPlan[] {
  const tl = asListing(p);
  if (tl.hideItineraryOnDetail) return [];
  const plan = tl.itineraryPlan;
  if (Array.isArray(plan) && plan.length > 0) {
    return plan
      .map((x) => ({
        title: String(x?.title ?? "").trim(),
        description: String(x?.description ?? "").trim(),
      }))
      .filter((r) => r.title.length > 0 || r.description.length > 0);
  }
  if (!("private" in p.detail)) return [];
  const days = p.detail.private.itineraryDays ?? [];
  return days
    .map((raw, i) => {
      const s = String(raw ?? "").trim();
      if (!s) return { title: "", description: "" };
      const parts = s.split(/\n\n+/);
      if (parts.length >= 2 && parts[0].trim()) {
        return {
          title: parts[0].trim(),
          description: parts.slice(1).join("\n\n").trim(),
        };
      }
      return { title: `Day ${i + 1}`, description: s };
    })
    .filter((r) => r.title.length > 0 || r.description.length > 0);
}

export function getListingKind(p: TourPackage): ListingKind {
  const x = asListing(p);
  if (
    x.listingKind === "private" ||
    x.listingKind === "fixed" ||
    x.listingKind === "villa" ||
    x.listingKind === "trek" ||
    x.listingKind === "hotel"
  ) {
    return x.listingKind;
  }
  if ("private" in p.detail) return "private";
  return "fixed";
}

/**
 * Maps admin category display name → `listingKind` when the admin uses a single
 * “Category” control (name keywords; unknown names default to private).
 */
export function listingKindFromCategoryName(name: string): ListingKind {
  const n = String(name ?? "")
    .trim()
    .toLowerCase();
  if (!n) return "private";
  if (
    n.includes("villa") ||
    n.includes("farmhouse") ||
    n.includes("farm house") ||
    n.includes("farm stay")
  ) {
    return "villa";
  }
  if (n.includes("hotel")) return "hotel";
  if (n.includes("trek") || n.includes("expedition")) return "trek";
  if (n.includes("fixed") || n.includes("departure")) return "fixed";
  if (n.includes("private")) return "private";
  return "private";
}

export function packageForPrivatePage(p: TourPackage): boolean {
  return getListingKind(p) === "private";
}

export function packageForFixedPage(p: TourPackage): boolean {
  return getListingKind(p) === "fixed";
}

export function packageForVillasPage(p: TourPackage): boolean {
  return getListingKind(p) === "villa";
}

export function packageForTreksPage(p: TourPackage): boolean {
  return getListingKind(p) === "trek";
}

export function packageForHotelsTab(p: TourPackage): boolean {
  return getListingKind(p) === "hotel";
}

/** First YYYY-MM-DD in a travel string (e.g. check-in or `2026-04-01 → 2026-04-05`). */
export function firstIsoDateFromTravelField(travelDate: string): string {
  const s = String(travelDate ?? "").trim();
  const head = (s.split(/\s*→\s*/)[0] ?? s).split(/\s*->\s*/)[0]?.trim() ?? s;
  const m = head.match(/(\d{4}-\d{2}-\d{2})/);
  return m?.[1] ?? "";
}

/** UTC Sat/Sun from YYYY-MM-DD. */
export function isWeekendIsoDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T12:00:00Z`);
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

/** Nights [checkin, checkout) as YYYY-MM-DD UTC. */
export function enumerateStayNightsIso(checkIn: string, checkOut: string): string[] {
  const a = checkIn.slice(0, 10);
  const b = checkOut.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) return [];
  const start = new Date(`${a}T00:00:00Z`);
  const end = new Date(`${b}T00:00:00Z`);
  if (end <= start) return [];
  const out: string[] = [];
  for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function stayTouchesBookingBlackout(
  checkIn: string,
  checkOut: string,
  blackouts: string[] | undefined,
): boolean {
  if (!blackouts?.length) return false;
  const set = new Set(blackouts.map((x) => x.slice(0, 10)));
  for (const night of enumerateStayNightsIso(checkIn, checkOut)) {
    if (set.has(night)) return true;
  }
  return false;
}

/** Number of billed nights for a stay window (matches Node catalog booking). */
export function catalogStayNightsCount(checkIn: string, checkOut: string): number {
  const n = enumerateStayNightsIso(checkIn, checkOut).length;
  return n > 0 ? n : 1;
}

/**
 * Per-person rate for a villa stay (weekday/weekend + optional no-meal), aligned with
 * Node `POST /catalog/booking` private non-matrix villa logic.
 */
export function villaCatalogPricePerPersonForStay(
  pkg: TourPackage,
  travelDateJoined: string,
  mealIncluded: boolean,
  tierIndex: number | null,
): number {
  if (!("private" in pkg.detail) || getListingKind(pkg) !== "villa") return 0;
  const tl = asListing(pkg);
  const pr = pkg.detail.private.pricing;
  let pricePP =
    "single" in pr
      ? Number(pr.single.pricePerPersonINR)
      : Number(pr.multi.tiers[tierIndex ?? 0]?.pricePerPersonINR ?? 0);
  const iso = firstIsoDateFromTravelField(travelDateJoined);
  if (iso) {
    const wknd = isWeekendIsoDate(iso);
    const wd = Number(tl.villaWeekdayPricePerPersonINR ?? 0);
    const we = Number(tl.villaWeekendPricePerPersonINR ?? 0);
    if (wknd && we > 0) pricePP = we;
    else if (!wknd && wd > 0) pricePP = wd;
    if (!mealIncluded) {
      const nmWd = Number(tl.villaWeekdayPriceNoMealINR ?? 0);
      const nmWe = Number(tl.villaWeekendPriceNoMealINR ?? 0);
      if (wknd && nmWe > 0) pricePP = nmWe;
      else if (!wknd && nmWd > 0) pricePP = nmWd;
    }
  }
  return pricePP;
}

/** Parse `shortDescription` like `8 Days · 5,289m · Moderate-Hard` (trek cards). */
export function parseTrekSubtitle(shortDescription: string): {
  duration: string;
  altitude: string;
  difficulty: string;
} {
  const parts = shortDescription.split("·").map((s) => s.trim());
  return {
    duration: parts[0] ?? "",
    altitude: parts[1] ?? "",
    difficulty: parts[2] ?? "",
  };
}

/** Read `difficultyColor:oklch(...)` from trek `longDescription`. */
export function parseTrekDifficultyColor(longDescription: string | undefined): string {
  const m = String(longDescription ?? "").match(
    /difficultyColor:\s*([^\n]+)/i,
  );
  return (m?.[1] ?? "").trim() || "oklch(var(--brand-coral))";
}

/** Read `rating:4.8` from hotel `longDescription`. */
export function parseHotelRating(longDescription: string | undefined): number {
  const m = String(longDescription ?? "").match(/rating:\s*([\d.]+)/i);
  const n = Number(m?.[1]);
  return Number.isFinite(n) ? n : 4.5;
}

/**
 * Human-readable stay copy for hotels / villas / farm stays.
 * Strips machine lines (`rating:…`, `difficultyColor:…`) used elsewhere.
 */
export function stayFullDescriptionText(
  longDescription: string | undefined,
): string {
  return String(longDescription ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length > 0 &&
        !/^\s*rating:\s*[\d.]+/i.test(l) &&
        !/^\s*difficultyColor:/i.test(l),
    )
    .join("\n\n")
    .trim();
}

/** Preset keys for the amenity icon picker (admin + detail page map). */
export const AMENITY_ICON_KEYS = [
  "bed",
  "tent",
  "wine",
  "hard-hat",
  "utensils",
  "activity",
  "dog",
  "file-text",
  "plane",
  "users",
  "map-pin",
  "globe",
  "music",
  "flame",
  "mountain",
  "ticket",
] as const;

export type AmenityIconKey = (typeof AMENITY_ICON_KEYS)[number];

/** Inclusions shown on the detail page: explicit list wins; else fixed-tour `inclusions`. */
export function effectivePackageInclusions(
  p: TourPackage,
  fixedInclusions: string[],
): string[] {
  const tl = p as TourPackageListing;
  const fromMeta = (tl.packageInclusions ?? [])
    .map((s) => String(s).trim())
    .filter(Boolean);
  if (fromMeta.length > 0) return fromMeta;
  return fixedInclusions;
}

/** Ordered URLs for package detail: hero first, then gallery extras (deduped). */
export function packageDetailGalleryUrls(p: TourPackage): string[] {
  const tl = p as TourPackageListing;
  const hero = String(p.heroImageUrl ?? "").trim();
  const thumb = String(tl.thumbnailUrl ?? "").trim();
  const extras = (tl.galleryImageUrls ?? [])
    .map((u) => String(u ?? "").trim())
    .filter(Boolean);
  const out: string[] = [];
  const push = (u: string) => {
    if (!u || out.includes(u)) return;
    out.push(u);
  };
  push(hero);
  push(thumb);
  for (const u of extras) push(u);
  return out;
}

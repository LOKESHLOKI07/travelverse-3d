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

export type TourPackageListing = TourPackage & {
  listingKind?: ListingKind;
  thumbnailUrl?: string;
  longDescription?: string;
};

function asListing(p: TourPackage): TourPackageListing {
  return p as TourPackageListing;
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
  return (m?.[1] ?? "").trim() || "oklch(0.75 0.14 55)";
}

/** Read `rating:4.8` from hotel `longDescription`. */
export function parseHotelRating(longDescription: string | undefined): number {
  const m = String(longDescription ?? "").match(/rating:\s*([\d.]+)/i);
  const n = Number(m?.[1]);
  return Number.isFinite(n) ? n : 4.5;
}

import type { CategoryView, TourPackage } from "../backend";

/** Flatten API catalog: every active package with its category label (organizational only). */
export function flattenCatalogViews(views: CategoryView[]): Array<{
  categoryName: string;
  pkg: TourPackage;
}> {
  const out: Array<{ categoryName: string; pkg: TourPackage }> = [];
  for (const v of views) {
    const name = v.category.name;
    for (const p of v.packages) {
      if (p.active) out.push({ categoryName: name, pkg: p });
    }
  }
  return out;
}

/** User-facing price line — no “listing kind” wording. */
export function packagePriceHint(p: TourPackage): string {
  if ("fixed" in p.detail) {
    const n = Number(p.detail.fixed.pricePerPersonINR);
    return `₹${n.toLocaleString("en-IN")} / person`;
  }
  if ("private" in p.detail) {
    const pr = p.detail.private.pricing;
    if ("multi" in pr) {
      const prices = pr.multi.tiers.map((t) => Number(t.pricePerPersonINR));
      const min = Math.min(...prices);
      return `From ₹${min.toLocaleString("en-IN")} / person`;
    }
    return `₹${Number(pr.single.pricePerPersonINR).toLocaleString("en-IN")} / person`;
  }
  return "";
}

export function findPackageById(
  views: CategoryView[],
  id: bigint,
): TourPackage | null {
  for (const v of views) {
    for (const p of v.packages) {
      if (p.id === id) return p;
    }
  }
  return null;
}

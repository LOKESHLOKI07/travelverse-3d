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

function idKey(id: unknown): string {
  try {
    return String(BigInt(String(id)));
  } catch {
    return String(id);
  }
}

/**
 * Resolve related packages by id list (e.g. from `relatedPackageIds`), preserving order.
 */
export function findPackagesByIds(
  views: CategoryView[],
  ids: Array<number | string | bigint>,
  opts?: { excludeId?: bigint; onlyActive?: boolean },
): TourPackage[] {
  const onlyActive = opts?.onlyActive !== false;
  const ex =
    opts?.excludeId !== undefined ? idKey(opts.excludeId) : null;
  const byId = new Map<string, TourPackage>();
  for (const v of views) {
    for (const p of v.packages) {
      if (onlyActive && !p.active) continue;
      byId.set(idKey(p.id), p);
    }
  }
  const out: TourPackage[] = [];
  for (const raw of ids) {
    const k = idKey(raw);
    if (ex && k === ex) continue;
    const p = byId.get(k);
    if (p) out.push(p);
  }
  return out;
}

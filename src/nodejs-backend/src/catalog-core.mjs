/** @param {unknown} x */
export function n(x) {
  if (typeof x === "bigint") return Number(x);
  if (typeof x === "number") return x;
  return Number(String(x ?? 0));
}

export function jsonBigIntReplacer(_k, v) {
  return typeof v === "bigint" ? v.toString() : v;
}

export function withListingMeta(norm, raw) {
  let lk = raw.listingKind;
  if (
    lk !== "private" &&
    lk !== "fixed" &&
    lk !== "villa" &&
    lk !== "trek" &&
    lk !== "hotel"
  ) {
    lk = "private" in norm.detail ? "private" : "fixed";
  }
  const thumb = String(raw.thumbnailUrl ?? "").trim();
  const longDesc = String(raw.longDescription ?? "");
  return {
    ...norm,
    listingKind: lk,
    thumbnailUrl: thumb || norm.heroImageUrl,
    longDescription: longDesc,
  };
}

export function normalizePackage(raw) {
  const id = n(raw.id);
  const categoryId = n(raw.categoryId);
  const detail = raw.detail;
  if (detail && "private" in detail && detail.private) {
    const p = detail.private;
    const pricing =
      p.pricing && "single" in p.pricing && p.pricing.single != null
        ? {
            single: {
              pricePerPersonINR: n(p.pricing.single.pricePerPersonINR),
            },
          }
        : {
            multi: {
              tiers: (p.pricing.multi?.tiers ?? []).map((t) => ({
                label: t.label,
                pricePerPersonINR: n(t.pricePerPersonINR),
              })),
            },
          };
    const norm = {
      id,
      categoryId,
      name: String(raw.name),
      shortDescription: String(raw.shortDescription ?? ""),
      heroImageUrl: String(raw.heroImageUrl ?? ""),
      active: Boolean(raw.active),
      detail: {
        private: {
          minGroupSize: n(p.minGroupSize),
          maxGroupSize: n(p.maxGroupSize),
          pricing,
          addOns: (p.addOns ?? []).map((a) => ({
            addOnId: n(a.addOnId),
            label: String(a.label),
            priceINR: n(a.priceINR),
          })),
          itineraryDays: (p.itineraryDays ?? []).map((line) => String(line)),
        },
      },
    };
    return withListingMeta(norm, raw);
  }
  if (detail && "fixed" in detail && detail.fixed) {
    const f = detail.fixed;
    const norm = {
      id,
      categoryId,
      name: String(raw.name),
      shortDescription: String(raw.shortDescription ?? ""),
      heroImageUrl: String(raw.heroImageUrl ?? ""),
      active: Boolean(raw.active),
      detail: {
        fixed: {
          pricePerPersonINR: n(f.pricePerPersonINR),
          batches: f.batches.map((b) => ({
            batchId: n(b.batchId),
            dateLabel: String(b.dateLabel),
            seatsTotal: n(b.seatsTotal),
            seatsRemaining: n(b.seatsRemaining),
          })),
          addOns: (f.addOns ?? []).map((a) => ({
            addOnId: n(a.addOnId),
            label: String(a.label),
            priceINR: n(a.priceINR),
          })),
          inclusions: (f.inclusions ?? []).map((line) => String(line)),
        },
      },
    };
    return withListingMeta(norm, raw);
  }
  throw new Error("Invalid package detail");
}

export function sumAddOnPrices(defs, selectedIds) {
  let sum = 0;
  for (const sid of selectedIds) {
    const d = defs.find((x) => n(x.addOnId) === n(sid));
    if (!d) throw new Error("Invalid add-on id");
    sum += n(d.priceINR);
  }
  return sum;
}

export function addOnLabels(defs, selectedIds) {
  return selectedIds.map((sid) => {
    const d = defs.find((x) => n(x.addOnId) === n(sid));
    if (!d) throw new Error("Invalid add-on id");
    return d.label;
  });
}

export function findBatch(fixedCfg, batchId) {
  return fixedCfg.batches.find((b) => n(b.batchId) === n(batchId)) ?? null;
}

export function takeSeatsFromBatch(pkg, batchId, seats) {
  if (!("fixed" in pkg.detail)) throw new Error("Not a fixed package");
  const f = pkg.detail.fixed;
  const batches = f.batches.map((b) => {
    if (n(b.batchId) !== n(batchId)) return b;
    const rem = n(b.seatsRemaining);
    if (seats > rem) throw new Error("Not enough seats");
    return {
      ...b,
      seatsRemaining: rem - seats,
    };
  });
  return {
    ...pkg,
    detail: { fixed: { ...f, batches } },
  };
}

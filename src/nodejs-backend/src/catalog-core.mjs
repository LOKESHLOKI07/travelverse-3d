/** @param {unknown} x */
export function n(x) {
  if (typeof x === "bigint") return Number(x);
  if (typeof x === "number") return x;
  return Number(String(x ?? 0));
}

export function jsonBigIntReplacer(_k, v) {
  return typeof v === "bigint" ? v.toString() : v;
}

/** @param {unknown} raw @param {string} key */
function stringListField(raw, key) {
  const v = raw[key];
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? "").trim()).filter(Boolean);
}

/** @param {unknown} raw */
function amenityListField(raw) {
  const v = raw.amenities;
  if (!Array.isArray(v)) return [];
  return v
    .map((a) => ({
      icon: String(a?.icon ?? "")
        .trim()
        .toLowerCase(),
      label: String(a?.label ?? "").trim(),
    }))
    .filter((a) => a.label.length > 0);
}

/** @param {unknown} raw */
function itineraryPlanArrayFromRaw(raw) {
  const v = raw.itineraryPlan;
  if (!Array.isArray(v) || v.length === 0) return [];
  const rows = v
    .map((x) => ({
      title: String(x?.title ?? "").trim(),
      description: String(x?.description ?? "").trim(),
    }))
    .filter((r) => r.title.length > 0 || r.description.length > 0);
  return rows.map((r, i) => ({
    title: r.title || `Day ${i + 1}`,
    description: r.description,
  }));
}

/** @param {unknown} raw @param {unknown} norm */
function itineraryPlanForMeta(norm, raw) {
  const fromRaw = itineraryPlanArrayFromRaw(raw);
  if (fromRaw.length > 0) return fromRaw;
  const days =
    raw.detail?.private?.itineraryDays ??
    norm.detail?.private?.itineraryDays ??
    [];
  if (!Array.isArray(days) || days.length === 0) return [];
  return days
    .map((text, i) => {
      const s = String(text ?? "").trim();
      if (!s) return null;
      const parts = s.split(/\n\n+/);
      if (parts.length >= 2 && parts[0].trim()) {
        return {
          title: parts[0].trim(),
          description: parts.slice(1).join("\n\n").trim(),
        };
      }
      return { title: `Day ${i + 1}`, description: s };
    })
    .filter(Boolean);
}

/** @param {unknown} v @returns {number} 0 if unset / invalid */
function seasonMonthField(v) {
  const m = n(v);
  return m >= 1 && m <= 12 ? m : 0;
}

/** @param {unknown} raw */
function privatePartyPricingFromRaw(raw) {
  const v = raw.privatePartyPricing;
  if (!Array.isArray(v) || v.length === 0) return undefined;
  const rows = v
    .map((x) => ({
      pax: n(x?.pax),
      pricePerPersonINR: n(x?.pricePerPersonINR),
    }))
    .filter((r) => r.pax > 0 && r.pricePerPersonINR > 0);
  if (rows.length === 0) return undefined;
  rows.sort((a, b) => a.pax - b.pax);
  return rows;
}

/**
 * True when every integer party size from minOnline..maxOnline has a positive rate.
 * @param {unknown} pkg normalized package (listing meta merged)
 */
export function isPrivatePartyMatrixConfigured(pkg) {
  const matrix = pkg.privatePartyPricing;
  if (!Array.isArray(matrix) || matrix.length === 0) return false;
  const minO = n(pkg.minOnlinePartySize ?? 2);
  const maxO = n(pkg.maxOnlinePartySize ?? 12);
  if (minO < 1 || maxO < minO) return false;
  const byPax = new Map(
    matrix.map((r) => [n(r.pax), n(r.pricePerPersonINR)]),
  );
  for (let h = minO; h <= maxO; h++) {
    const pr = byPax.get(h);
    if (!(pr > 0)) return false;
  }
  return true;
}

/** @param {unknown} raw @param {string} key */
function isoDateListField(raw, key) {
  const v = raw[key];
  if (!Array.isArray(v)) return [];
  const out = [];
  for (const x of v) {
    const s = String(x ?? "").trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) out.push(s);
  }
  return out;
}

/** @param {unknown} raw */
function hotelRoomTierImageUrlsFromRaw(raw) {
  const v = raw.hotelRoomTierImageUrls;
  if (!Array.isArray(v)) return undefined;
  const rows = v.map((x) => String(x ?? "").trim());
  return rows.length > 0 ? rows : undefined;
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
  const galleryImageUrls = Array.isArray(raw.galleryImageUrls)
    ? raw.galleryImageUrls
        .map((u) => String(u ?? "").trim())
        .filter(Boolean)
    : [];
  const relatedPackageIds = Array.isArray(raw.relatedPackageIds)
    ? raw.relatedPackageIds
        .map((x) => n(x))
        .filter((id) => id > 0)
    : [];
  const lastMinuteDealPackageIds = Array.isArray(raw.lastMinuteDealPackageIds)
    ? raw.lastMinuteDealPackageIds
        .map((x) => n(x))
        .filter((id) => id > 0)
    : [];
  const minOnlinePartySize = Math.max(1, n(raw.minOnlinePartySize ?? 2));
  let maxOnlinePartySize = n(raw.maxOnlinePartySize ?? 12);
  if (maxOnlinePartySize < minOnlinePartySize) maxOnlinePartySize = minOnlinePartySize;
  maxOnlinePartySize = Math.min(50, maxOnlinePartySize);
  const privatePartyPricing = privatePartyPricingFromRaw(raw);
  return {
    ...norm,
    listingKind: lk,
    thumbnailUrl: thumb || norm.heroImageUrl,
    longDescription: longDesc,
    galleryImageUrls,
    relatedPackageIds,
    detailOverview: String(raw.detailOverview ?? "").trim(),
    durationLabel: String(raw.durationLabel ?? "").trim(),
    tourTypeLabel: String(raw.tourTypeLabel ?? "").trim(),
    packageInclusions: stringListField(raw, "packageInclusions"),
    packageExclusions: stringListField(raw, "packageExclusions"),
    amenities: amenityListField(raw),
    tourMinAge: String(raw.tourMinAge ?? "").trim(),
    tourMaxGuestsDisplay: String(raw.tourMaxGuestsDisplay ?? "").trim(),
    tourLocation: String(raw.tourLocation ?? "").trim(),
    tourLanguages: String(raw.tourLanguages ?? "").trim(),
    lastMinuteDealPackageIds,
    itineraryPlan: itineraryPlanForMeta(norm, raw),
    seasonStartMonth: seasonMonthField(raw.seasonStartMonth),
    seasonEndMonth: seasonMonthField(raw.seasonEndMonth),
    meetingPointLabel: String(raw.meetingPointLabel ?? "").trim(),
    meetingPointMapsUrl: String(raw.meetingPointMapsUrl ?? "").trim(),
    privatePartyPricing,
    minOnlinePartySize,
    maxOnlinePartySize,
    childFreeMaxAge: n(raw.childFreeMaxAge ?? 5),
    childHalfMaxAge: n(raw.childHalfMaxAge ?? 10),
    childFullMinAge: n(raw.childFullMinAge ?? 11),
    hideItineraryOnDetail: Boolean(raw.hideItineraryOnDetail),
    bookingBlackoutDates: isoDateListField(raw, "bookingBlackoutDates"),
    propertyYoutubeUrl: String(raw.propertyYoutubeUrl ?? "").trim(),
    propertyMapsUrl: String(raw.propertyMapsUrl ?? "").trim(),
    villaWeekdayPricePerPersonINR: n(raw.villaWeekdayPricePerPersonINR ?? 0),
    villaWeekendPricePerPersonINR: n(raw.villaWeekendPricePerPersonINR ?? 0),
    villaWeekdayMaxGuests: n(raw.villaWeekdayMaxGuests ?? 0),
    villaWeekendMaxGuests: n(raw.villaWeekendMaxGuests ?? 0),
    villaWeekdayPriceNoMealINR: n(raw.villaWeekdayPriceNoMealINR ?? 0),
    villaWeekendPriceNoMealINR: n(raw.villaWeekendPriceNoMealINR ?? 0),
    hotelRoomTierImageUrls: hotelRoomTierImageUrlsFromRaw(raw),
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
    const planArr = itineraryPlanArrayFromRaw(raw);
    const legacyLines = (p.itineraryDays ?? []).map((line) => String(line));
    const itineraryDaysLines =
      planArr.length > 0
        ? planArr.map((row) => row.title)
        : legacyLines;
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
          itineraryDays: itineraryDaysLines,
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

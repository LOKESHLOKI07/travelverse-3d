/**
 * Catalog HTTP routes (list, admin CRUD, catalog booking).
 * Storage: memory (createMemoryCatalogStore) or Postgres (createPgCatalogStore).
 */

import {
  n,
  sumAddOnPrices,
  addOnLabels,
  findBatch,
  takeSeatsFromBatch,
  isPrivatePartyMatrixConfigured,
} from "./catalog-core.mjs";
import { debugCatalogMedia } from "./tourist-debug.mjs";

function firstIsoDateFromTravelDate(travelDate) {
  const s = String(travelDate ?? "").trim();
  const head = (s.split(/\s*→\s*/)[0] ?? s).split(/\s*->\s*/)[0]?.trim() ?? s;
  const m = head.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

function isWeekendIso(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T12:00:00Z`);
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

function stayTouchesBlackout(travelDate, blackouts) {
  if (!Array.isArray(blackouts) || blackouts.length === 0) return false;
  const set = new Set(blackouts.map((x) => String(x).slice(0, 10)));
  const iso = firstIsoDateFromTravelDate(travelDate);
  if (iso && set.has(iso)) return true;
  const s = String(travelDate ?? "").trim();
  const parts = s.split(/\s*(?:→|->)\s*/).map((x) => x.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const a = firstIsoDateFromTravelDate(parts[0]);
    const b = firstIsoDateFromTravelDate(parts[1]);
    if (a && b) {
      const start = new Date(`${a}T00:00:00Z`);
      const end = new Date(`${b}T00:00:00Z`);
      for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
        if (set.has(d.toISOString().slice(0, 10))) return true;
      }
    }
  }
  return false;
}

/** Nights between check-in and check-out for `YYYY-MM-DD → YYYY-MM-DD` (or `->`); else 1. */
function stayNightCountFromTravelDate(travelDate) {
  const s = String(travelDate ?? "").trim();
  const parts = s.split(/\s*(?:→|->)\s*/).map((x) => x.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const a = firstIsoDateFromTravelDate(parts[0] ?? "");
    const b = firstIsoDateFromTravelDate(parts[1] ?? "");
    if (a && b) {
      const start = new Date(`${a}T00:00:00Z`);
      const end = new Date(`${b}T00:00:00Z`);
      const nights = Math.floor((end - start) / 86400000);
      return Math.max(1, nights);
    }
  }
  return 1;
}

function villaMealIncludedFromBody(b) {
  const v = b?.villaMealIncluded;
  if (v === false || v === 0 || v === "0" || String(v).toLowerCase() === "false") {
    return false;
  }
  return true;
}

/**
 * @param {import("express").Express} app
 * @param {{
 *   catalog: { [k: string]: (...args: unknown[]) => unknown },
 *   isAdminRequest: (req: import("express").Request) => boolean | Promise<boolean>,
 *   createBooking: (booking: object) => Promise<number>,
 * }} ctx
 */
export function attachCatalogRoutes(app, ctx) {
  const { catalog, isAdminRequest, createBooking } = ctx;

  app.get("/catalog/list", async (_req, res) => {
    try {
      res.json(await catalog.listCatalogJson());
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  app.get("/catalog/package/:id", async (req, res) => {
    try {
      const p = await catalog.getPackagePublic(req.params.id);
      if (!p) return res.status(404).json({ error: "Not found" });
      res.json(p);
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  app.post("/catalog/admin/seed", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const force = Boolean(body.force);
      const hadAny =
        (await catalog.countCategories()) > 0 ||
        (await catalog.countPackages()) > 0;
      if (force) {
        await catalog.resetStorage();
      }
      await catalog.seedIfEmpty();
      res.json({
        ok: true,
        force,
        hadCatalogBefore: hadAny,
        categoryCount: await catalog.countCategories(),
        packageCount: await catalog.countPackages(),
        skippedBecauseNotEmpty: !force && hadAny,
      });
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  app.post("/catalog/admin/category", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const body = req.body ?? {};
      const name = String(body.name ?? "");
      const sortOrder = n(body.sortOrder ?? 1);
      const active = Boolean(body.active);
      const idOpt = body.id;
      if (!name) throw new Error("Category name required");
      const id = await catalog.upsertCategory({ idOpt, name, sortOrder, active });
      res.json({ id });
    } catch (e) {
      res.status(400).json({ error: String(e.message || e) });
    }
  });

  app.delete("/catalog/admin/category/:id", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      await catalog.deleteCategory(req.params.id);
      res.status(204).end();
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  app.put("/catalog/admin/package", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const body = req.body && typeof req.body === "object" ? req.body : {};
      if (debugCatalogMedia()) {
        console.log("[tourist-debug][catalog] PUT /catalog/admin/package (incoming)", {
          id: body.id,
          name: body.name,
          heroImageUrl: body.heroImageUrl,
          thumbnailUrl: body.thumbnailUrl,
          listingKind: body.listingKind,
        });
      }
      const id = await catalog.insertPackageRecord(req.body);
      if (debugCatalogMedia()) {
        console.log("[tourist-debug][catalog] package row id after save:", id);
      }
      res.json({ id });
    } catch (e) {
      if (debugCatalogMedia()) {
        console.warn(
          "[tourist-debug][catalog] PUT /catalog/admin/package failed:",
          String(e?.message || e),
        );
      }
      res.status(400).json({ error: String(e.message || e) });
    }
  });

  app.delete("/catalog/admin/package/:id", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      await catalog.deletePackage(req.params.id);
      res.status(204).end();
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  app.post("/catalog/admin/reserve-batch-ids", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const count = n(req.body?.count ?? 0);
      if (count <= 0) throw new Error("count must be positive");
      const ids = await catalog.reserveBatchIds(count);
      res.json({ ids });
    } catch (e) {
      res.status(400).json({ error: String(e.message || e) });
    }
  });

  void catalog.seedIfEmpty().catch((err) => {
    console.error("[tourist-node-api] catalog seedIfEmpty failed:", err);
  });

  app.post("/catalog/booking", async (req, res) => {
    try {
      const b = req.body ?? {};
      const packageId = n(b.packageId);
      const batchIdOpt = b.batchId;
      const tierIndexOpt = b.tierIndex;
      const travelDate = String(b.travelDate ?? "");
      const groupSize = n(b.groupSize);
      const selectedAddOnIds = Array.isArray(b.selectedAddOnIds)
        ? b.selectedAddOnIds.map((x) => n(x))
        : [];
      const customerName = String(b.customerName ?? "");
      const customerEmail = String(b.customerEmail ?? "");
      const customerPhone = String(b.customerPhone ?? "");
      const claimedTotalPriceINR = n(b.claimedTotalPriceINR);
      const villaMealIncluded = villaMealIncludedFromBody(b);

      if (!customerName) throw new Error("Customer name cannot be empty");
      if (!customerEmail) throw new Error("Customer email cannot be empty");
      if (!customerPhone) throw new Error("Customer phone cannot be empty");
      if (!travelDate) throw new Error("Travel date cannot be empty");
      if (groupSize <= 0) throw new Error("Group size must be greater than 0");
      if (claimedTotalPriceINR <= 0) {
        throw new Error("Total price must be greater than 0");
      }

      const pkg = await catalog.getPackage(packageId);
      if (!pkg) throw new Error("Package not found");
      if (!pkg.active) throw new Error("Package inactive");
      if (stayTouchesBlackout(travelDate, pkg.bookingBlackoutDates)) {
        throw new Error("Selected dates include a blackout — choose other dates");
      }
      const catName = await catalog.categoryNameOrTrap(n(pkg.categoryId));

      let basePerPerson;
      /** @type {string[]} */
      let addOnLabelArr;
      let displayName;
      /** @type {number | undefined} */
      let batchIdStore;
      /** @type {number | undefined} */
      let tierStore;
      /** @type {number} */
      let total;

      if ("private" in pkg.detail) {
        const p = pkg.detail.private;
        if (isPrivatePartyMatrixConfigured(pkg)) {
          const adults = n(b.adults ?? 0);
          const c0 = n(b.childrenUnder6 ?? 0);
          const c610 = n(b.children6To10 ?? 0);
          const c11 = n(b.children11Plus ?? 0);
          if (adults < 0 || c0 < 0 || c610 < 0 || c11 < 0) {
            throw new Error("Invalid guest counts");
          }
          const totalHeads = adults + c0 + c610 + c11;
          if (totalHeads <= 0) throw new Error("Party cannot be empty");
          if (totalHeads !== groupSize) {
            throw new Error("Guest counts must match group size");
          }
          if (totalHeads < n(p.minGroupSize) || totalHeads > n(p.maxGroupSize)) {
            throw new Error("Group size out of range");
          }
          const minO = n(pkg.minOnlinePartySize ?? 2);
          const maxO = n(pkg.maxOnlinePartySize ?? 12);
          if (totalHeads > maxO) {
            throw new Error("For larger groups, please contact us");
          }
          if (totalHeads < minO) {
            throw new Error("Party size is below the minimum for online booking");
          }
          if (tierIndexOpt !== undefined && tierIndexOpt !== null) {
            throw new Error("Tier not applicable");
          }
          const matrix = pkg.privatePartyPricing;
          const row = matrix.find((r) => n(r.pax) === totalHeads);
          if (!row) throw new Error("No published rate for this party size");
          const pricePP = n(row.pricePerPersonINR);
          const weighted = adults + 0.5 * c610 + 1 * c11;
          if (weighted <= 0) {
            throw new Error("At least one paying guest is required");
          }
          const addSum = sumAddOnPrices(p.addOns, selectedAddOnIds);
          addOnLabelArr = addOnLabels(p.addOns, selectedAddOnIds);
          basePerPerson = pricePP + addSum;
          displayName = `${pkg.name} — ${totalHeads} guests`;
          tierStore = undefined;
          total = Math.round((pricePP + addSum) * weighted);
        } else {
          if (groupSize < n(p.minGroupSize) || groupSize > n(p.maxGroupSize)) {
            throw new Error("Group size out of range");
          }
          const pr = p.pricing;
          let pricePP;
          if (pr.single) {
            if (tierIndexOpt !== undefined && tierIndexOpt !== null) {
              throw new Error("Tier not applicable");
            }
            pricePP = n(pr.single.pricePerPersonINR);
            displayName = pkg.name;
            tierStore = undefined;
            if (pkg.listingKind === "villa") {
              const iso = firstIsoDateFromTravelDate(travelDate);
              if (iso) {
                const wknd = isWeekendIso(iso);
                const wd = n(pkg.villaWeekdayPricePerPersonINR);
                const we = n(pkg.villaWeekendPricePerPersonINR);
                if (wknd && we > 0) pricePP = we;
                else if (!wknd && wd > 0) pricePP = wd;
                if (!villaMealIncluded) {
                  const nmWd = n(pkg.villaWeekdayPriceNoMealINR);
                  const nmWe = n(pkg.villaWeekendPriceNoMealINR);
                  if (wknd && nmWe > 0) pricePP = nmWe;
                  else if (!wknd && nmWd > 0) pricePP = nmWd;
                }
                const cap = wknd ? n(pkg.villaWeekendMaxGuests) : n(pkg.villaWeekdayMaxGuests);
                if (cap > 0 && groupSize > cap) {
                  throw new Error("Guest count exceeds the maximum for this stay type");
                }
              }
            }
          } else {
            const ti =
              tierIndexOpt === undefined || tierIndexOpt === null
                ? null
                : n(tierIndexOpt);
            if (ti === null) throw new Error("Select a tier");
            const m = pr.multi;
            if (ti < 0 || ti >= m.tiers.length) throw new Error("Invalid tier");
            pricePP = n(m.tiers[ti].pricePerPersonINR);
            displayName = `${pkg.name} — ${m.tiers[ti].label}`;
            tierStore = ti;
            if (pkg.listingKind === "villa") {
              const iso = firstIsoDateFromTravelDate(travelDate);
              if (iso) {
                const wknd = isWeekendIso(iso);
                const wd = n(pkg.villaWeekdayPricePerPersonINR);
                const we = n(pkg.villaWeekendPricePerPersonINR);
                if (wknd && we > 0) pricePP = we;
                else if (!wknd && wd > 0) pricePP = wd;
                if (!villaMealIncluded) {
                  const nmWd = n(pkg.villaWeekdayPriceNoMealINR);
                  const nmWe = n(pkg.villaWeekendPriceNoMealINR);
                  if (wknd && nmWe > 0) pricePP = nmWe;
                  else if (!wknd && nmWd > 0) pricePP = nmWd;
                }
                const cap = wknd ? n(pkg.villaWeekendMaxGuests) : n(pkg.villaWeekdayMaxGuests);
                if (cap > 0 && groupSize > cap) {
                  throw new Error("Guest count exceeds the maximum for this stay type");
                }
              }
            }
          }
          const addSum = sumAddOnPrices(p.addOns, selectedAddOnIds);
          addOnLabelArr = addOnLabels(p.addOns, selectedAddOnIds);
          basePerPerson = pricePP + addSum;
          total = basePerPerson * groupSize;
          const stayNights =
            pkg.listingKind === "villa" || pkg.listingKind === "hotel"
              ? stayNightCountFromTravelDate(travelDate)
              : 1;
          total = Math.round(total * stayNights);
        }
      } else if ("fixed" in pkg.detail) {
        const f = pkg.detail.fixed;
        if (batchIdOpt === undefined || batchIdOpt === null) {
          throw new Error("Select a departure batch");
        }
        const bid = n(batchIdOpt);
        const batch = findBatch(f, bid);
        if (!batch) throw new Error("Invalid batch");
        if (groupSize > n(batch.seatsRemaining)) {
          throw new Error("Not enough seats");
        }
        const addSum = sumAddOnPrices(f.addOns, selectedAddOnIds);
        addOnLabelArr = addOnLabels(f.addOns, selectedAddOnIds);
        basePerPerson = n(f.pricePerPersonINR) + addSum;
        displayName = pkg.name;
        batchIdStore = bid;
        total = basePerPerson * groupSize;
      } else {
        throw new Error("Invalid package");
      }
      if (total !== claimedTotalPriceINR) {
        throw new Error("Price mismatch — refresh and try again");
      }

      if ("fixed" in pkg.detail && batchIdStore != null) {
        await catalog.mutatePackage(packageId, (cur) =>
          takeSeatsFromBatch(cur, batchIdStore, groupSize),
        );
      }

      const createdTimestamp = BigInt(Date.now()) * 1_000_000n;
      const booking = {
        packageCategory: catName,
        packageName: displayName,
        customerName,
        customerEmail,
        customerPhone,
        travelDate,
        groupSize: BigInt(groupSize),
        addOns: addOnLabelArr,
        totalPriceINR: BigInt(Math.floor(total)),
        status: "pending",
        createdTimestamp,
        catalogPackageId: packageId,
        catalogBatchId: batchIdStore,
        catalogTierIndex: tierStore,
      };
      const bookingId = await createBooking(booking);
      res.json({ bookingId: String(bookingId) });
    } catch (e) {
      res.status(400).json({ error: String(e.message || e) });
    }
  });
}

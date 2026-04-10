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
} from "./catalog-core.mjs";

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
      const id = await catalog.insertPackageRecord(req.body);
      res.json({ id });
    } catch (e) {
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
      const catName = await catalog.categoryNameOrTrap(n(pkg.categoryId));

      let basePerPerson;
      /** @type {string[]} */
      let addOnLabelArr;
      let displayName;
      /** @type {number | undefined} */
      let batchIdStore;
      /** @type {number | undefined} */
      let tierStore;

      if ("private" in pkg.detail) {
        const p = pkg.detail.private;
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
        }
        const addSum = sumAddOnPrices(p.addOns, selectedAddOnIds);
        addOnLabelArr = addOnLabels(p.addOns, selectedAddOnIds);
        basePerPerson = pricePP + addSum;
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
      } else {
        throw new Error("Invalid package");
      }

      const total = basePerPerson * groupSize;
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

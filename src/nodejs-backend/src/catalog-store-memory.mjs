import {
  n,
  normalizePackage,
  sumAddOnPrices,
  addOnLabels,
  findBatch,
  takeSeatsFromBatch,
} from "./catalog-core.mjs";

export function createMemoryCatalogStore() {
  const categories = new Map();
  const packages = new Map();
  let nextCategoryId = 1;
  let nextPackageId = 1;
  let nextBatchId = 1;

  function resetCatalogStorage() {
    categories.clear();
    packages.clear();
    nextCategoryId = 1;
    nextPackageId = 1;
    nextBatchId = 1;
  }

  function categoryNameOrTrap(catId) {
    const c = categories.get(catId);
    if (!c) throw new Error("Unknown category");
    return c.name;
  }

  function insertPackageRecord(pkg) {
    const norm = normalizePackage(pkg);
    if (norm.id === 0) {
      const id = nextPackageId++;
      const withId = { ...norm, id };
      packages.set(id, withId);
      return id;
    }
    if (!packages.has(norm.id)) throw new Error("Package not found");
    packages.set(norm.id, norm);
    return norm.id;
  }

  function listCatalogJson() {
    const raw = [];
    for (const c of categories.values()) {
      if (!c.active) continue;
      const pbuf = [];
      for (const p of packages.values()) {
        if (n(p.categoryId) === n(c.id) && p.active) pbuf.push(p);
      }
      raw.push({ category: c, packages: pbuf });
    }
    raw.sort((a, b) => n(a.category.sortOrder) - n(b.category.sortOrder));
    return raw;
  }

  function getPackagePublic(packageId) {
    const p = packages.get(n(packageId));
    if (!p || !p.active) return null;
    return p;
  }

  function mkBatch(dateLabel, total, remaining) {
    const bid = nextBatchId++;
    return {
      batchId: bid,
      dateLabel,
      seatsTotal: total,
      seatsRemaining: remaining,
    };
  }

  function seedDemoCatalogIfEmpty() {
    if (categories.size > 0) return;

    const catPrivate = nextCategoryId++;
    categories.set(catPrivate, {
      id: catPrivate,
      name: "Private Travel",
      sortOrder: 1,
      active: true,
    });
    const catFixed = nextCategoryId++;
    categories.set(catFixed, {
      id: catFixed,
      name: "Fixed Departures",
      sortOrder: 2,
      active: true,
    });
    const catTrek = nextCategoryId++;
    categories.set(catTrek, {
      id: catTrek,
      name: "Treks & Expeditions",
      sortOrder: 3,
      active: true,
    });
    const catHotel = nextCategoryId++;
    categories.set(catHotel, {
      id: catHotel,
      name: "Hotels",
      sortOrder: 4,
      active: true,
    });
    const catVilla = nextCategoryId++;
    categories.set(catVilla, {
      id: catVilla,
      name: "Villas & Farmhouses",
      sortOrder: 5,
      active: true,
    });

    const privateAddOns = [
      { addOnId: 1, label: "River Rafting", priceINR: 800 },
      { addOnId: 2, label: "Paragliding", priceINR: 2500 },
      { addOnId: 3, label: "Snow Skiing", priceINR: 1500 },
      { addOnId: 4, label: "Camping under Stars", priceINR: 600 },
      { addOnId: 5, label: "Photography Workshop", priceINR: 1200 },
    ];
    const tiers = [
      { label: "Standard", pricePerPersonINR: 15000 },
      { label: "Deluxe", pricePerPersonINR: 22000 },
      { label: "Super Deluxe", pricePerPersonINR: 31000 },
    ];

    insertPackageRecord({
      id: 0,
      categoryId: catPrivate,
      name: "Manali-Spiti Circuit",
      shortDescription:
        "10-day circuit through Pin Valley, Chandratal, and Key Monastery.",
      heroImageUrl:
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&fit=crop",
      listingKind: "private",
      active: true,
      detail: {
        private: {
          minGroupSize: 1,
          maxGroupSize: 20,
          pricing: { multi: { tiers } },
          addOns: privateAddOns,
        },
      },
    });

    insertPackageRecord({
      id: 0,
      categoryId: catPrivate,
      name: "Leh Ladakh Adventure",
      shortDescription:
        "12-day adventure: Pangong, Nubra, Khardung La, Magnetic Hill.",
      heroImageUrl:
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&fit=crop",
      listingKind: "private",
      active: true,
      detail: {
        private: {
          minGroupSize: 1,
          maxGroupSize: 20,
          pricing: { multi: { tiers } },
          addOns: privateAddOns,
        },
      },
    });

    insertPackageRecord({
      id: 0,
      categoryId: catFixed,
      name: "Golden Triangle",
      shortDescription: "7-day classic Delhi – Agra – Jaipur route.",
      heroImageUrl:
        "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&fit=crop",
      listingKind: "fixed",
      active: true,
      detail: {
        fixed: {
          pricePerPersonINR: 12500,
          batches: [
            mkBatch("Apr 10, 2026", 8, 8),
            mkBatch("May 5, 2026", 14, 14),
            mkBatch("Jun 1, 2026", 2, 2),
          ],
          addOns: [],
        },
      },
    });

    insertPackageRecord({
      id: 0,
      categoryId: catFixed,
      name: "Kerala Backwaters",
      shortDescription: "6-day houseboats and coastal Kerala.",
      heroImageUrl:
        "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=600&fit=crop",
      listingKind: "fixed",
      active: true,
      detail: {
        fixed: {
          pricePerPersonINR: 15000,
          batches: [
            mkBatch("Apr 15, 2026", 6, 6),
            mkBatch("May 20, 2026", 12, 12),
          ],
          addOns: [],
        },
      },
    });

    insertPackageRecord({
      id: 0,
      categoryId: catFixed,
      name: "Rajasthan Heritage",
      shortDescription: "8-day palaces and desert heritage.",
      heroImageUrl:
        "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=600&fit=crop",
      listingKind: "fixed",
      active: true,
      detail: {
        fixed: {
          pricePerPersonINR: 18000,
          batches: [
            mkBatch("Apr 20, 2026", 10, 10),
            mkBatch("May 15, 2026", 12, 0),
            mkBatch("Jun 10, 2026", 5, 5),
          ],
          addOns: [],
        },
      },
    });

    insertPackageRecord({
      id: 0,
      categoryId: catTrek,
      name: "Friendship Peak Expedition",
      shortDescription: "8 Days · 5,289m · Moderate-Hard",
      heroImageUrl:
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&fit=crop",
      longDescription: "difficultyColor:oklch(0.75 0.14 55)",
      listingKind: "trek",
      active: true,
      detail: {
        fixed: {
          pricePerPersonINR: 28500,
          batches: [
            mkBatch("May 1, 2026", 8, 8),
            mkBatch("Jun 1, 2026", 5, 5),
            mkBatch("Sep 1, 2026", 8, 8),
          ],
          addOns: [],
        },
      },
    });

    insertPackageRecord({
      id: 0,
      categoryId: catTrek,
      name: "Hampta Pass Trek",
      shortDescription: "5 Days · 4,270m · Moderate",
      heroImageUrl:
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&fit=crop",
      longDescription: "difficultyColor:oklch(0.85 0.13 192)",
      listingKind: "trek",
      active: true,
      detail: {
        fixed: {
          pricePerPersonINR: 18500,
          batches: [
            mkBatch("Apr 15, 2026", 12, 12),
            mkBatch("May 15, 2026", 8, 8),
          ],
          addOns: [],
        },
      },
    });

    insertPackageRecord({
      id: 0,
      categoryId: catTrek,
      name: "Kedarkantha Winter Trek",
      shortDescription: "6 Days · 3,800m · Easy-Moderate",
      heroImageUrl:
        "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&fit=crop",
      longDescription: "difficultyColor:oklch(0.65 0.18 145)",
      listingKind: "trek",
      active: true,
      detail: {
        fixed: {
          pricePerPersonINR: 14500,
          batches: [
            mkBatch("Dec 15, 2026", 10, 10),
            mkBatch("Jan 10, 2027", 6, 6),
          ],
          addOns: [],
        },
      },
    });

    insertPackageRecord({
      id: 0,
      categoryId: catHotel,
      name: "The Himalayan Retreat",
      shortDescription: "Manali, Himachal Pradesh",
      heroImageUrl:
        "https://images.unsplash.com/photo-1455587734955-081b22074882?w=600&fit=crop",
      longDescription: "rating:4.8",
      listingKind: "hotel",
      active: true,
      detail: {
        private: {
          minGroupSize: 1,
          maxGroupSize: 10,
          pricing: {
            multi: {
              tiers: [
                { label: "Standard", pricePerPersonINR: 3500 },
                { label: "Deluxe", pricePerPersonINR: 5500 },
                { label: "Suite", pricePerPersonINR: 9000 },
              ],
            },
          },
          addOns: [],
        },
      },
    });

    insertPackageRecord({
      id: 0,
      categoryId: catHotel,
      name: "The Valley View Resort",
      shortDescription: "Shimla, Himachal Pradesh",
      heroImageUrl:
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&fit=crop",
      longDescription: "rating:4.6",
      listingKind: "hotel",
      active: true,
      detail: {
        private: {
          minGroupSize: 1,
          maxGroupSize: 10,
          pricing: {
            multi: {
              tiers: [
                { label: "Standard", pricePerPersonINR: 4000 },
                { label: "Deluxe", pricePerPersonINR: 6500 },
                { label: "Suite", pricePerPersonINR: 11000 },
              ],
            },
          },
          addOns: [],
        },
      },
    });

    insertPackageRecord({
      id: 0,
      categoryId: catVilla,
      name: "Pine Forest Villa",
      shortDescription: "Kasauli, Himachal Pradesh · mountain retreat",
      heroImageUrl:
        "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=600&fit=crop",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400&fit=crop",
      longDescription:
        "Private pool, BBQ deck, chef on request, and panoramic mountain views. Ideal for groups.",
      listingKind: "villa",
      active: true,
      detail: {
        private: {
          minGroupSize: 8,
          maxGroupSize: 15,
          pricing: { single: { pricePerPersonINR: 1200 } },
          addOns: [],
        },
      },
    });

    insertPackageRecord({
      id: 0,
      categoryId: catVilla,
      name: "Riverside Farmhouse",
      shortDescription: "Rishikesh, Uttarakhand · river & garden",
      heroImageUrl:
        "https://images.unsplash.com/photo-1544124499-58912cbddaad?w=600&fit=crop",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1544124499-58912cbddaad?w=400&fit=crop",
      longDescription:
        "River view, Bonfire area, Organic garden, Yoga space, Chef on request.",
      listingKind: "villa",
      active: true,
      detail: {
        private: {
          minGroupSize: 10,
          maxGroupSize: 20,
          pricing: { single: { pricePerPersonINR: 900 } },
          addOns: [],
        },
      },
    });
  }

  return {
    async listCatalogJson() {
      return listCatalogJson();
    },
    async getPackage(packageId) {
      return packages.get(n(packageId)) ?? null;
    },
    async getPackagePublic(packageId) {
      return getPackagePublic(packageId);
    },
    async insertPackageRecord(pkg) {
      return insertPackageRecord(pkg);
    },
    async resetStorage() {
      resetCatalogStorage();
    },
    async seedIfEmpty() {
      seedDemoCatalogIfEmpty();
    },
    async countCategories() {
      return categories.size;
    },
    async countPackages() {
      return packages.size;
    },
    async upsertCategory({ idOpt, name, sortOrder, active }) {
      if (idOpt === undefined || idOpt === null || idOpt === "") {
        const id = nextCategoryId++;
        categories.set(id, { id, name, sortOrder, active });
        return id;
      }
      const id = n(idOpt);
      if (!categories.has(id)) throw new Error("Category not found");
      categories.set(id, { id, name, sortOrder, active });
      return id;
    },
    async deleteCategory(id) {
      categories.delete(n(id));
    },
    async deletePackage(id) {
      packages.delete(n(id));
    },
    async reserveBatchIds(count) {
      const ids = [];
      for (let i = 0; i < count; i++) {
        ids.push(nextBatchId++);
      }
      return ids;
    },
    async categoryNameOrTrap(catId) {
      return categoryNameOrTrap(catId);
    },
    async updatePackage(pkgId, pkg) {
      packages.set(n(pkgId), pkg);
    },
    /**
     * @param {number} packageId
     * @param {(pkg: object) => object} updater
     */
    async mutatePackage(packageId, updater) {
      const id = n(packageId);
      const cur = packages.get(id);
      if (!cur) throw new Error("Package not found");
      const next = updater(cur);
      packages.set(id, next);
      return next;
    },
  };
}

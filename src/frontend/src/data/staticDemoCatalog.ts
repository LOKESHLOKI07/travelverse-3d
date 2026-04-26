/**
 * Built-in demo catalog for the admin UI when the Node API / canister returns
 * nothing or cannot be reached (e.g. only `npm run dev` without `pnpm dev:api`).
 * Mirrors `src/nodejs-backend/src/catalog-api.mjs` seed content + image URLs.
 */
import type { CategoryView, TourPackage } from "../backend";
import type { TourPackageListing } from "../utils/catalogListing";

function addon(id: number, label: string, price: number) {
  return { addOnId: BigInt(id), label, priceINR: BigInt(price) };
}

const privateAddOns = [
  addon(1, "River Rafting", 800),
  addon(2, "Paragliding", 2500),
  addon(3, "Snow Skiing", 1500),
  addon(4, "Camping under Stars", 600),
  addon(5, "Photography Workshop", 1200),
];

const tiers = [
  { label: "Standard", pricePerPersonINR: 15000n },
  { label: "Deluxe", pricePerPersonINR: 22000n },
  { label: "Super Deluxe", pricePerPersonINR: 31000n },
];

function batch(id: number, dateLabel: string, total: number, remaining: number) {
  return {
    batchId: BigInt(id),
    dateLabel,
    seatsTotal: BigInt(total),
    seatsRemaining: BigInt(remaining),
  };
}

function pkg(
  base: Omit<TourPackage, "active"> & Partial<TourPackageListing>,
): TourPackage {
  const { listingKind, thumbnailUrl, longDescription, ...rest } = base;
  return {
    ...rest,
    active: true,
    ...(listingKind !== undefined ? { listingKind } : {}),
    ...(thumbnailUrl !== undefined ? { thumbnailUrl } : {}),
    ...(longDescription !== undefined ? { longDescription } : {}),
  } as TourPackage;
}

const catPrivate = 1n;
const catFixed = 2n;
const catTrek = 3n;
const catHotel = 4n;
const catVilla = 5n;

/** Stable fake IDs for preview rows only (not on chain). */
export function getStaticDemoCatalogViews(): CategoryView[] {
  return [
    {
      category: {
        id: catPrivate,
        name: "Private Travel",
        sortOrder: 1n,
        active: true,
      },
      packages: [
        pkg({
          id: 101n,
          categoryId: catPrivate,
          name: "Manali-Spiti Circuit",
          shortDescription:
            "10-day circuit through Pin Valley, Chandratal, and Key Monastery.",
          heroImageUrl:
            "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&fit=crop",
          listingKind: "private",
          detail: {
            private: {
              minGroupSize: 1n,
              maxGroupSize: 20n,
              pricing: { multi: { tiers } },
              addOns: privateAddOns,
              itineraryDays: [
                "Arrive Chandigarh, drive to Manali. Evening walk on Mall Road.",
                "Cross Rohtang / Atal Tunnel, reach Kaza. Acclimatisation evening.",
                "Pin Valley monastery visit, village walk, overnight in Kaza.",
                "Chandratal Lake day excursion; camp or guesthouse.",
                "Return leg via Kunzum La; night near Manali.",
                "Departure after breakfast.",
              ],
            },
          },
        }),
        pkg({
          id: 102n,
          categoryId: catPrivate,
          name: "Leh Ladakh Adventure",
          shortDescription:
            "12-day adventure: Pangong, Nubra, Khardung La, Magnetic Hill.",
          heroImageUrl:
            "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&fit=crop",
          listingKind: "private",
          detail: {
            private: {
              minGroupSize: 1n,
              maxGroupSize: 20n,
              pricing: { multi: { tiers } },
              addOns: privateAddOns,
              itineraryDays: [
                "Fly to Leh, rest and light acclimatisation. Oxygen on standby.",
                "Sham Valley monasteries: Likir, Alchi, Magnetic Hill.",
                "Khardung La and Nubra Valley; double-hump camel ride (optional).",
                "Pangong Tso full day; lakeside stay.",
                "Return to Leh via Chang La; evening bazaar.",
                "Leh palace & Shanti Stupa; departure.",
              ],
            },
          },
        }),
      ],
    },
    {
      category: {
        id: catFixed,
        name: "Fixed Departures",
        sortOrder: 2n,
        active: true,
      },
      packages: [
        pkg({
          id: 103n,
          categoryId: catFixed,
          name: "Golden Triangle",
          shortDescription: "7-day classic Delhi – Agra – Jaipur route.",
          heroImageUrl:
            "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&fit=crop",
          listingKind: "fixed",
          detail: {
            fixed: {
              pricePerPersonINR: 12500n,
              batches: [
                batch(1001, "Apr 10, 2026", 8, 8),
                batch(1002, "May 5, 2026", 14, 14),
                batch(1003, "Jun 1, 2026", 2, 2),
              ],
              addOns: [],
              inclusions: [
                "Hotel stay (twin sharing)",
                "Daily breakfast",
                "AC vehicle for sightseeing",
                "English-speaking guide",
              ],
            },
          },
        }),
        pkg({
          id: 104n,
          categoryId: catFixed,
          name: "Kerala Backwaters",
          shortDescription: "6-day houseboats and coastal Kerala.",
          heroImageUrl:
            "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=600&fit=crop",
          listingKind: "fixed",
          detail: {
            fixed: {
              pricePerPersonINR: 15000n,
              batches: [
                batch(1004, "Apr 15, 2026", 6, 6),
                batch(1005, "May 20, 2026", 12, 12),
              ],
              addOns: [],
              inclusions: [
                "Houseboat stay with meals",
                "Airport / station transfers",
                "Shikara ride",
                "All taxes as per itinerary",
              ],
            },
          },
        }),
        pkg({
          id: 105n,
          categoryId: catFixed,
          name: "Rajasthan Heritage",
          shortDescription: "8-day palaces and desert heritage.",
          heroImageUrl:
            "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=600&fit=crop",
          listingKind: "fixed",
          detail: {
            fixed: {
              pricePerPersonINR: 18000n,
              batches: [
                batch(1006, "Apr 20, 2026", 10, 10),
                batch(1007, "May 15, 2026", 12, 0),
                batch(1008, "Jun 10, 2026", 5, 5),
              ],
              addOns: [],
              inclusions: [
                "Heritage hotels & haveli stays",
                "Breakfast daily; select dinners",
                "Private vehicle with driver",
                "Monument entry fees (as listed)",
              ],
            },
          },
        }),
      ],
    },
    {
      category: {
        id: catTrek,
        name: "Treks & Expeditions",
        sortOrder: 3n,
        active: true,
      },
      packages: [
        pkg({
          id: 106n,
          categoryId: catTrek,
          name: "Friendship Peak Expedition",
          shortDescription: "8 Days · 5,289m · Moderate-Hard",
          heroImageUrl:
            "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&fit=crop",
          longDescription: "difficultyColor:oklch(var(--brand-coral))",
          listingKind: "trek",
          detail: {
            fixed: {
              pricePerPersonINR: 28500n,
              batches: [
                batch(1101, "May 1, 2026", 8, 8),
                batch(1102, "Jun 1, 2026", 5, 5),
                batch(1103, "Sep 1, 2026", 8, 8),
              ],
              addOns: [],
              inclusions: [
                "Certified mountain guide",
                "Camping equipment (tents, sleeping bags)",
                "All meals on trek",
                "Permits & forest fees",
              ],
            },
          },
        }),
        pkg({
          id: 107n,
          categoryId: catTrek,
          name: "Hampta Pass Trek",
          shortDescription: "5 Days · 4,270m · Moderate",
          heroImageUrl:
            "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&fit=crop",
          longDescription: "difficultyColor:oklch(var(--brand-blue))",
          listingKind: "trek",
          detail: {
            fixed: {
              pricePerPersonINR: 18500n,
              batches: [
                batch(1104, "Apr 15, 2026", 12, 12),
                batch(1105, "May 15, 2026", 8, 8),
              ],
              addOns: [],
              inclusions: [
                "Experienced trek lead",
                "Shared camp stays",
                "Meals during trek",
                "Transport from base village",
              ],
            },
          },
        }),
        pkg({
          id: 108n,
          categoryId: catTrek,
          name: "Kedarkantha Winter Trek",
          shortDescription: "6 Days · 3,800m · Easy-Moderate",
          heroImageUrl:
            "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&fit=crop",
          longDescription: "difficultyColor:oklch(0.65 0.18 145)",
          listingKind: "trek",
          detail: {
            fixed: {
              pricePerPersonINR: 14500n,
              batches: [
                batch(1106, "Dec 15, 2026", 10, 10),
                batch(1107, "Jan 10, 2027", 6, 6),
              ],
              addOns: [],
              inclusions: [
                "Local guide",
                "Tented accommodation",
                "Meals on trek",
                "Safety & first-aid support",
              ],
            },
          },
        }),
      ],
    },
    {
      category: {
        id: catHotel,
        name: "Hotels",
        sortOrder: 4n,
        active: true,
      },
      packages: [
        pkg({
          id: 109n,
          categoryId: catHotel,
          name: "The Himalayan Retreat",
          shortDescription: "Manali, Himachal Pradesh",
          heroImageUrl:
            "https://images.unsplash.com/photo-1455587734955-081b22074882?w=600&fit=crop",
          longDescription:
            "rating:4.8\n\nSpa, heated pool, and oak-panelled lounge. Most rooms face the peaks; the restaurant serves regional and continental menus. 24-hour desk and paid airport transfers.",
          listingKind: "hotel",
          detail: {
            private: {
              minGroupSize: 1n,
              maxGroupSize: 10n,
              pricing: {
                multi: {
                  tiers: [
                    { label: "Standard", pricePerPersonINR: 3500n },
                    { label: "Deluxe", pricePerPersonINR: 5500n },
                    { label: "Suite", pricePerPersonINR: 9000n },
                  ],
                },
              },
              addOns: [],
              itineraryDays: [],
            },
          },
        }),
        pkg({
          id: 110n,
          categoryId: catHotel,
          name: "The Valley View Resort",
          shortDescription: "Shimla, Himachal Pradesh",
          heroImageUrl:
            "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&fit=crop",
          longDescription:
            "rating:4.6\n\nColonial-era building with valley-facing balconies. In-house café, guided nature walks, and a kids' activity room. EV charging and laundry on request.",
          listingKind: "hotel",
          detail: {
            private: {
              minGroupSize: 1n,
              maxGroupSize: 10n,
              pricing: {
                multi: {
                  tiers: [
                    { label: "Standard", pricePerPersonINR: 4000n },
                    { label: "Deluxe", pricePerPersonINR: 6500n },
                    { label: "Suite", pricePerPersonINR: 11000n },
                  ],
                },
              },
              addOns: [],
              itineraryDays: [],
            },
          },
        }),
      ],
    },
    {
      category: {
        id: catVilla,
        name: "Villas & Farmhouses",
        sortOrder: 5n,
        active: true,
      },
      packages: [
        pkg({
          id: 111n,
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
          detail: {
            private: {
              minGroupSize: 8n,
              maxGroupSize: 15n,
              pricing: { single: { pricePerPersonINR: 1200n } },
              addOns: [],
              itineraryDays: [],
            },
          },
        }),
        pkg({
          id: 112n,
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
          detail: {
            private: {
              minGroupSize: 10n,
              maxGroupSize: 20n,
              pricing: { single: { pricePerPersonINR: 900n } },
              addOns: [],
              itineraryDays: [],
            },
          },
        }),
      ],
    },
  ];
}

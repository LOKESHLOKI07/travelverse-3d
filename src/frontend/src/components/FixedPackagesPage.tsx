import { Button } from "@/components/ui/button";
import CatalogBookingCheckoutDialog from "@/components/CatalogBookingCheckoutDialog";
import { FixedBatchSeatBadge } from "@/components/FixedBatchSeatBadge";
import { useActor } from "@/hooks/useActor";
import { ArrowLeft, Calendar, Mountain, Users } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { TourPackage } from "../backend";
import {
  packageForFixedPage,
  type TourPackageListing,
} from "../utils/catalogListing";
import type { Page } from "../types";

interface Props {
  setPage: (page: Page) => void;
}

interface Batch {
  date: string;
  /** Seats remaining (available). */
  seats: number;
  seatsTotal: number;
  batchId?: bigint;
}

interface Package {
  name: string;
  price: number;
  image: string;
  duration: string;
  batches: Batch[];
  inclusions: string[];
  packageId?: bigint;
}

const PACKAGES: Package[] = [
  {
    name: "Golden Triangle",
    price: 12500,
    image:
      "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&fit=crop",
    duration: "7 Days",
    inclusions: [
      "Hotel stay (twin sharing)",
      "Daily breakfast",
      "AC vehicle for sightseeing",
    ],
    batches: [
      { date: "Apr 10, 2026", seats: 8, seatsTotal: 8 },
      { date: "May 5, 2026", seats: 14, seatsTotal: 14 },
      { date: "Jun 1, 2026", seats: 2, seatsTotal: 2 },
    ],
  },
  {
    name: "Kerala Backwaters",
    price: 15000,
    image:
      "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=600&fit=crop",
    duration: "6 Days",
    inclusions: [
      "Houseboat stay with meals",
      "Airport / station transfers",
      "Shikara ride",
    ],
    batches: [
      { date: "Apr 15, 2026", seats: 6, seatsTotal: 6 },
      { date: "May 20, 2026", seats: 12, seatsTotal: 12 },
    ],
  },
  {
    name: "Rajasthan Heritage",
    price: 18000,
    image:
      "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=600&fit=crop",
    duration: "8 Days",
    inclusions: [
      "Heritage hotels & haveli stays",
      "Breakfast daily; select dinners",
      "Private vehicle with driver",
    ],
    batches: [
      { date: "Apr 20, 2026", seats: 10, seatsTotal: 10 },
      { date: "May 15, 2026", seats: 0, seatsTotal: 12 },
      { date: "Jun 10, 2026", seats: 5, seatsTotal: 5 },
    ],
  },
];

function fixedCfgOf(p: TourPackage) {
  if (!("fixed" in p.detail)) {
    throw new Error("Expected fixed package");
  }
  return p.detail.fixed;
}

function tourPackageToFixedDisplay(p: TourPackage): Package {
  const f = fixedCfgOf(p);
  const tl = p as TourPackageListing;
  const thumb = String(tl.thumbnailUrl ?? "").trim();
  return {
    name: p.name,
    price: Number(f.pricePerPersonINR),
    image: thumb || p.heroImageUrl,
    duration: p.shortDescription,
    packageId: p.id,
    inclusions: f.inclusions ?? [],
    batches: f.batches.map((b) => ({
      date: b.dateLabel,
      seats: Number(b.seatsRemaining),
      seatsTotal: Number(b.seatsTotal),
      batchId: b.batchId,
    })),
  };
}

export default function FixedPackagesPage({ setPage }: Props) {
  const { actor } = useActor();
  const [fixedPkgs, setFixedPkgs] = useState<TourPackage[] | null>(null);
  const [bookingTarget, setBookingTarget] = useState<{
    pkg: Package;
    batch: Batch;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!actor) return;
    let cancelled = false;
    actor
      .listCatalog()
      .then((cats) => {
        if (cancelled) return;
        const fix: TourPackage[] = [];
        for (const c of cats) {
          for (const p of c.packages) {
            if (packageForFixedPage(p) && "fixed" in p.detail) {
              fix.push(p);
            }
          }
        }
        setFixedPkgs(fix);
      })
      .catch(() => {
        if (!cancelled) setFixedPkgs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [actor]);

  const displayPackages = useMemo(() => {
    if (fixedPkgs && fixedPkgs.length > 0) {
      return fixedPkgs.map(tourPackageToFixedDisplay);
    }
    return PACKAGES;
  }, [fixedPkgs]);

  const catalogMode = !!(fixedPkgs && fixedPkgs.length > 0);

  const handleBook = async (payload: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  }) => {
    if (!actor) {
      toast.error("Please wait, connecting...");
      return;
    }
    if (!bookingTarget) return;
    setLoading(true);
    try {
      const { pkg, batch } = bookingTarget;
      if (
        catalogMode &&
        pkg.packageId !== undefined &&
        batch.batchId !== undefined
      ) {
        await actor.createCatalogBooking(
          pkg.packageId,
          batch.batchId,
          undefined,
          batch.date,
          BigInt(1),
          [],
          payload.customerName,
          payload.customerEmail,
          payload.customerPhone,
          BigInt(pkg.price),
        );
      } else {
        await actor.createBooking(
          "Fixed Date Package",
          pkg.name,
          payload.customerName,
          payload.customerEmail,
          payload.customerPhone,
          batch.date,
          BigInt(1),
          [],
          BigInt(pkg.price),
        );
      }
      toast.success("Booking confirmed! We'll contact you soon.");
      setBookingTarget(null);
    } catch {
      toast.error("Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "var(--app-page-gradient)",
      }}
    >
      <header
        className="sticky top-0 z-40 border-b border-border"
        style={{
          background: "oklch(0.99 0.006 248 / 0.92)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
          <button
            type="button"
            data-ocid="nav.link"
            onClick={() => setPage("home")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <div className="h-5 w-px bg-border" />
          <span className="font-display font-bold text-lg tracking-tight">
            Fixed Date{" "}
            <span style={{ color: "oklch(var(--brand-coral))" }}>Packages</span>
          </span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <p
            className="text-sm uppercase tracking-widest mb-3"
            style={{ color: "oklch(var(--brand-blue))" }}
          >
            Scheduled Departures
          </p>
          <h1 className="font-display text-4xl md:text-6xl font-black text-foreground mb-4">
            Fixed Date
            <br />
            <span style={{ color: "oklch(var(--brand-coral))" }}>
              Travel Packages
            </span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl">
            Join a batch of like-minded travellers on fixed departure dates.
            Price per person includes everything.
          </p>
        </motion.div>

        <div className="grid gap-8">
          {displayPackages.map((pkg, idx) => (
            <motion.div
              key={pkg.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="rounded-2xl overflow-hidden border border-border"
              style={{
                background: "oklch(0.98 0.008 248 / 0.72)",
                backdropFilter: "blur(10px)",
              }}
            >
              <div className="md:flex">
                <div className="md:w-72 h-48 md:h-auto relative flex-shrink-0">
                  <img
                    src={pkg.image}
                    alt={pkg.name}
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to right, transparent, oklch(0.55 0.03 248 / 0.14))",
                    }}
                  />
                </div>
                <div className="flex-1 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="font-display font-bold text-2xl mb-1">
                        {pkg.name}
                      </h2>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1 line-clamp-2">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          {pkg.duration}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          Per person
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className="text-2xl font-black"
                        style={{ color: "oklch(var(--brand-blue))" }}
                      >
                        ₹{pkg.price.toLocaleString("en-IN")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        per person
                      </div>
                    </div>
                  </div>
                  {pkg.inclusions.length > 0 ? (
                    <div className="rounded-xl border p-4 mb-2 select-card-warm">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                        What&apos;s included
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                        {pkg.inclusions.map((line, i) => (
                          <li key={`${i}-${line}`}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      Available batches
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {pkg.batches.map((batch) => (
                        <div
                          key={`${pkg.name}-${batch.batchId ?? batch.date}`}
                          className={`flex items-center gap-3 rounded-xl px-4 py-3 border select-card-warm ${
                            batch.seats === 0 ? "opacity-75" : ""
                          }`}
                          style={{
                            borderColor:
                              batch.seats === 0
                                ? "oklch(0.55 0.12 25 / 0.45)"
                                : "oklch(0.72 0.08 200 / 0.45)",
                          }}
                        >
                          <div>
                            <div className="text-sm font-medium">
                              {batch.date}
                            </div>
                            <div className="mt-1">
                              <FixedBatchSeatBadge
                                remaining={batch.seats}
                                total={batch.seatsTotal}
                              />
                            </div>
                          </div>
                          <Button
                            data-ocid="fixed.batch.primary_button"
                            size="sm"
                            disabled={batch.seats === 0}
                            onClick={() => setBookingTarget({ pkg, batch })}
                            style={{
                              background:
                                batch.seats === 0
                                  ? "oklch(0.26 0.038 228)"
                                  : "oklch(var(--brand-blue))",
                              color:
                                batch.seats === 0
                                  ? "oklch(0.52 0.04 228)"
                                  : "oklch(0.985 0.005 85)",
                              fontWeight: 700,
                            }}
                          >
                            {batch.seats === 0 ? "Sold Out" : "Book"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <CatalogBookingCheckoutDialog
        open={!!bookingTarget}
        onOpenChange={(o) => !o && setBookingTarget(null)}
        productTitle={bookingTarget?.pkg.name ?? ""}
        categoryLine="Fixed date package"
        summaryImageUrl={bookingTarget?.pkg.image}
        dateFromLabel={bookingTarget?.batch.date}
        guestsLine="1 person"
        subtotalINR={bookingTarget?.pkg.price ?? 0}
        gstPercent={0}
        loading={loading}
        onSubmit={(p) => void handleBook(p)}
      />

      <footer className="text-center py-8 mt-16 text-xs text-muted-foreground border-t border-border">
        <Mountain className="w-4 h-4 inline mr-1" />
        Mountain Explorers · © {new Date().getFullYear()} ·
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noreferrer"
          className="ml-1 hover:text-foreground transition-colors"
        >
          Built with caffeine.ai
        </a>
      </footer>
    </div>
  );
}

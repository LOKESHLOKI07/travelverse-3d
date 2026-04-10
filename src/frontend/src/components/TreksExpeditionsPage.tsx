import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActor } from "@/hooks/useActor";
import {
  ArrowLeft,
  Calendar,
  Loader2,
  Mountain,
  TrendingUp,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { TourPackage } from "../backend";
import {
  packageForTreksPage,
  parseTrekDifficultyColor,
  parseTrekSubtitle,
  type TourPackageListing,
} from "../utils/catalogListing";
import type { Page } from "../types";

interface Props {
  setPage: (page: Page) => void;
}

interface Batch {
  date: string;
  seats: number;
  batchId?: bigint;
}

interface Trek {
  name: string;
  price: number;
  image: string;
  duration: string;
  altitude: string;
  difficulty: string;
  difficultyColor: string;
  batches: Batch[];
  packageId?: bigint;
}

const TREKS: Trek[] = [
  {
    name: "Friendship Peak Expedition",
    price: 28500,
    image:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&fit=crop",
    duration: "8 Days",
    altitude: "5,289m",
    difficulty: "Moderate-Hard",
    difficultyColor: "oklch(0.75 0.14 55)",
    batches: [
      { date: "May 1, 2026", seats: 8 },
      { date: "Jun 1, 2026", seats: 5 },
      { date: "Sep 1, 2026", seats: 8 },
    ],
  },
  {
    name: "Hampta Pass Trek",
    price: 18500,
    image:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&fit=crop",
    duration: "5 Days",
    altitude: "4,270m",
    difficulty: "Moderate",
    difficultyColor: "oklch(0.85 0.13 192)",
    batches: [
      { date: "Apr 15, 2026", seats: 12 },
      { date: "May 15, 2026", seats: 8 },
    ],
  },
  {
    name: "Kedarkantha Winter Trek",
    price: 14500,
    image:
      "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&fit=crop",
    duration: "6 Days",
    altitude: "3,800m",
    difficulty: "Easy-Moderate",
    difficultyColor: "oklch(0.65 0.18 145)",
    batches: [
      { date: "Dec 15, 2026", seats: 10 },
      { date: "Jan 10, 2027", seats: 6 },
    ],
  },
];

function SeatBadge({ seats }: { seats: number }) {
  if (seats === 0)
    return (
      <Badge style={{ background: "oklch(0.45 0.18 25)", color: "white" }}>
        Sold Out
      </Badge>
    );
  if (seats <= 5)
    return (
      <Badge
        style={{
          background: "oklch(0.6 0.18 55)",
          color: "oklch(0.1 0.02 55)",
        }}
      >
        {seats} seats left
      </Badge>
    );
  return (
    <Badge style={{ background: "oklch(0.55 0.18 145)", color: "white" }}>
      {seats} seats
    </Badge>
  );
}

function fixedCfgOf(p: TourPackage) {
  if (!("fixed" in p.detail)) {
    throw new Error("Expected fixed-departure trek package");
  }
  return p.detail.fixed;
}

function tourPackageToTrek(p: TourPackage): Trek {
  const f = fixedCfgOf(p);
  const tl = p as TourPackageListing;
  const thumb = String(tl.thumbnailUrl ?? "").trim();
  const { duration, altitude, difficulty } = parseTrekSubtitle(
    p.shortDescription,
  );
  return {
    name: p.name,
    price: Number(f.pricePerPersonINR),
    image: thumb || p.heroImageUrl,
    duration,
    altitude,
    difficulty,
    difficultyColor: parseTrekDifficultyColor(tl.longDescription),
    packageId: p.id,
    batches: f.batches.map((b) => ({
      date: b.dateLabel,
      seats: Number(b.seatsRemaining),
      batchId: b.batchId,
    })),
  };
}

export default function TreksExpeditionsPage({ setPage }: Props) {
  const { actor } = useActor();
  const [trekPkgs, setTrekPkgs] = useState<TourPackage[] | null>(null);
  const [bookingTarget, setBookingTarget] = useState<{
    trek: Trek;
    batch: Batch;
  } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!actor) return;
    let cancelled = false;
    actor
      .listCatalog()
      .then((cats) => {
        if (cancelled) return;
        const rows: TourPackage[] = [];
        for (const c of cats) {
          for (const p of c.packages) {
            if (packageForTreksPage(p) && "fixed" in p.detail) {
              rows.push(p);
            }
          }
        }
        setTrekPkgs(rows);
      })
      .catch(() => {
        if (!cancelled) setTrekPkgs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [actor]);

  const displayTreks = useMemo(() => {
    if (trekPkgs && trekPkgs.length > 0) {
      return trekPkgs.map(tourPackageToTrek);
    }
    return TREKS;
  }, [trekPkgs]);

  const catalogMode = !!(trekPkgs && trekPkgs.length > 0);

  const handleBook = async () => {
    if (!actor) {
      toast.error("Please wait, connecting...");
      return;
    }
    if (!form.name || !form.email || !form.phone) {
      toast.error("Please fill all fields");
      return;
    }
    if (!bookingTarget) return;
    setLoading(true);
    try {
      const { trek, batch } = bookingTarget;
      if (
        catalogMode &&
        trek.packageId !== undefined &&
        batch.batchId !== undefined
      ) {
        await actor.createCatalogBooking(
          trek.packageId,
          batch.batchId,
          undefined,
          batch.date,
          BigInt(1),
          [],
          form.name,
          form.email,
          form.phone,
          BigInt(trek.price),
        );
      } else {
        await actor.createBooking(
          "Trek & Expedition",
          trek.name,
          form.name,
          form.email,
          form.phone,
          batch.date,
          BigInt(1),
          [],
          BigInt(trek.price),
        );
      }
      toast.success("Trek booked! Adventure awaits. 🏔");
      setBookingTarget(null);
      setForm({ name: "", email: "", phone: "" });
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
          "linear-gradient(160deg, oklch(0.13 0.025 232) 0%, oklch(0.09 0.018 232) 100%)",
      }}
    >
      <header
        className="sticky top-0 z-40 border-b border-white/10"
        style={{
          background: "oklch(0.11 0.025 232 / 0.95)",
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
          <div className="h-5 w-px bg-white/20" />
          <span className="font-display font-bold text-lg tracking-tight">
            Treks &{" "}
            <span style={{ color: "oklch(0.75 0.14 55)" }}>Expeditions</span>
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
            style={{ color: "oklch(0.85 0.13 192)" }}
          >
            Summit Awaits
          </p>
          <h1 className="font-display text-4xl md:text-6xl font-black text-foreground mb-4">
            Treks &<br />
            <span style={{ color: "oklch(0.75 0.14 55)" }}>Expeditions</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl">
            Certified guides, proven routes, and fixed batch departures. Book
            your Himalayan summit attempt today.
          </p>
        </motion.div>

        <div className="grid gap-8">
          {displayTreks.map((trek, idx) => (
            <motion.div
              key={`${trek.name}-${trek.packageId ?? "static"}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="rounded-2xl overflow-hidden border border-white/10"
              style={{
                background: "oklch(0.16 0.025 232 / 0.6)",
                backdropFilter: "blur(10px)",
              }}
            >
              <div className="md:flex">
                <div className="md:w-72 h-48 md:h-auto relative flex-shrink-0">
                  <img
                    src={trek.image}
                    alt={trek.name}
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to right, transparent, oklch(0.16 0.025 232 / 0.3))",
                    }}
                  />
                  <div className="absolute top-3 left-3">
                    <Badge
                      style={{
                        background: trek.difficultyColor,
                        color: "oklch(0.1 0.02 55)",
                      }}
                    >
                      {trek.difficulty}
                    </Badge>
                  </div>
                </div>
                <div className="flex-1 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="font-display font-bold text-2xl mb-1">
                        {trek.name}
                      </h2>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {trek.duration}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" />
                          {trek.altitude}
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
                        style={{ color: "oklch(0.85 0.13 192)" }}
                      >
                        ₹{trek.price.toLocaleString("en-IN")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        per person
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      Available Batches
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {trek.batches.map((batch) => (
                        <div
                          key={`${trek.name}-${batch.batchId ?? batch.date}`}
                          className="flex items-center gap-3 rounded-xl px-4 py-3 border"
                          style={{
                            borderColor:
                              batch.seats === 0
                                ? "oklch(0.25 0.04 25 / 0.5)"
                                : "oklch(0.25 0.04 192 / 0.5)",
                            background: "oklch(0.13 0.02 232)",
                          }}
                        >
                          <div>
                            <div className="text-sm font-medium">
                              {batch.date}
                            </div>
                            <div className="mt-1">
                              <SeatBadge seats={batch.seats} />
                            </div>
                          </div>
                          <Button
                            data-ocid="trek.batch.primary_button"
                            size="sm"
                            disabled={batch.seats === 0}
                            onClick={() => setBookingTarget({ trek, batch })}
                            style={{
                              background:
                                batch.seats === 0
                                  ? "oklch(0.25 0.02 232)"
                                  : "oklch(0.85 0.13 192)",
                              color:
                                batch.seats === 0
                                  ? "oklch(0.5 0.03 232)"
                                  : "oklch(0.13 0.04 195)",
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

      <Dialog
        open={!!bookingTarget}
        onOpenChange={(o) => !o && setBookingTarget(null)}
      >
        <DialogContent
          data-ocid="trek.booking.dialog"
          className="sm:max-w-md"
          style={{
            background: "oklch(0.14 0.025 232)",
            border: "1px solid oklch(0.3 0.04 232 / 0.5)",
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              Book:{" "}
              <span style={{ color: "oklch(0.85 0.13 192)" }}>
                {bookingTarget?.trek.name}
              </span>
            </DialogTitle>
          </DialogHeader>
          {bookingTarget && (
            <div className="space-y-4 mt-2">
              <div
                className="rounded-xl p-3 text-sm"
                style={{ background: "oklch(0.11 0.02 232)" }}
              >
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {bookingTarget.batch.date}
                  </span>
                  <span
                    className="font-bold"
                    style={{ color: "oklch(0.85 0.13 192)" }}
                  >
                    ₹{bookingTarget.trek.price.toLocaleString("en-IN")}/pp
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Full Name
                  </Label>
                  <Input
                    data-ocid="trek.booking.input"
                    placeholder="Ravi Kumar"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Email
                  </Label>
                  <Input
                    data-ocid="trek.booking.input"
                    type="email"
                    placeholder="ravi@email.com"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Phone
                  </Label>
                  <Input
                    data-ocid="trek.booking.input"
                    placeholder="+91 9876543210"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
              <Button
                data-ocid="trek.booking.submit_button"
                onClick={handleBook}
                disabled={loading}
                className="w-full font-bold"
                style={{
                  background: "oklch(0.85 0.13 192)",
                  color: "oklch(0.13 0.04 195)",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Confirm Booking"
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <footer className="text-center py-8 mt-16 text-xs text-muted-foreground border-t border-white/10">
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

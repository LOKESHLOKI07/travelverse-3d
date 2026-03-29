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
import { ArrowLeft, Calendar, Loader2, Mountain, Users } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Page } from "../types";

interface Props {
  setPage: (page: Page) => void;
}

interface Batch {
  date: string;
  seats: number;
}

interface Package {
  name: string;
  price: number;
  image: string;
  duration: string;
  batches: Batch[];
}

const PACKAGES: Package[] = [
  {
    name: "Golden Triangle",
    price: 12500,
    image:
      "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&fit=crop",
    duration: "7 Days",
    batches: [
      { date: "Apr 10, 2026", seats: 8 },
      { date: "May 5, 2026", seats: 14 },
      { date: "Jun 1, 2026", seats: 2 },
    ],
  },
  {
    name: "Kerala Backwaters",
    price: 15000,
    image:
      "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=600&fit=crop",
    duration: "6 Days",
    batches: [
      { date: "Apr 15, 2026", seats: 6 },
      { date: "May 20, 2026", seats: 12 },
    ],
  },
  {
    name: "Rajasthan Heritage",
    price: 18000,
    image:
      "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=600&fit=crop",
    duration: "8 Days",
    batches: [
      { date: "Apr 20, 2026", seats: 10 },
      { date: "May 15, 2026", seats: 0 },
      { date: "Jun 10, 2026", seats: 5 },
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

export default function FixedPackagesPage({ setPage }: Props) {
  const { actor } = useActor();
  const [bookingTarget, setBookingTarget] = useState<{
    pkg: Package;
    batch: Batch;
  } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);

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
      await actor.createBooking(
        "Fixed Date Package",
        bookingTarget.pkg.name,
        form.name,
        form.email,
        form.phone,
        bookingTarget.batch.date,
        BigInt(1),
        [],
        BigInt(bookingTarget.pkg.price),
      );
      toast.success("Booking confirmed! We'll contact you soon.");
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
            Fixed Date{" "}
            <span style={{ color: "oklch(0.75 0.14 55)" }}>Packages</span>
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
            Scheduled Departures
          </p>
          <h1 className="font-display text-4xl md:text-6xl font-black text-foreground mb-4">
            Fixed Date
            <br />
            <span style={{ color: "oklch(0.75 0.14 55)" }}>
              Travel Packages
            </span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl">
            Join a batch of like-minded travellers on fixed departure dates.
            Price per person includes everything.
          </p>
        </motion.div>

        <div className="grid gap-8">
          {PACKAGES.map((pkg, idx) => (
            <motion.div
              key={pkg.name}
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
                    src={pkg.image}
                    alt={pkg.name}
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to right, transparent, oklch(0.16 0.025 232 / 0.3))",
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
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
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
                        style={{ color: "oklch(0.85 0.13 192)" }}
                      >
                        ₹{pkg.price.toLocaleString("en-IN")}
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
                      {pkg.batches.map((batch) => (
                        <div
                          key={batch.date}
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
                            data-ocid="fixed.batch.primary_button"
                            size="sm"
                            disabled={batch.seats === 0}
                            onClick={() => setBookingTarget({ pkg, batch })}
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
          data-ocid="fixed.booking.dialog"
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
                {bookingTarget?.pkg.name}
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
                    ₹{bookingTarget.pkg.price.toLocaleString("en-IN")}/pp
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Full Name
                  </Label>
                  <Input
                    data-ocid="fixed.booking.input"
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
                    data-ocid="fixed.booking.input"
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
                    data-ocid="fixed.booking.input"
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
                data-ocid="fixed.booking.submit_button"
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

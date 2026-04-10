import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useActor } from "@/hooks/useActor";
import { ArrowLeft, Calendar, Loader2, Mountain, Users } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { CategoryView, PrivateCfg, TourPackage } from "../backend";
import type { Page } from "../types";
import type { TourPackageListing } from "../utils/catalogListing";
import { findPackageById, packagePriceHint } from "../utils/unifiedCatalog";

interface Props {
  packageId: bigint | null;
  setPage: (page: Page) => void;
  onBackToList: () => void;
}

const TIER_COLOR_CYCLE = [
  "oklch(0.65 0.12 192)",
  "oklch(0.75 0.14 55)",
  "oklch(0.72 0.18 320)",
];

function privateCfgOf(p: TourPackage): PrivateCfg {
  if (!("private" in p.detail)) throw new Error("Expected private package");
  return p.detail.private;
}

function fixedCfgOf(p: TourPackage) {
  if (!("fixed" in p.detail)) throw new Error("Expected fixed package");
  return p.detail.fixed;
}

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

export default function PackageDetailPage({
  packageId,
  setPage,
  onBackToList,
}: Props) {
  const { actor } = useActor();
  const [views, setViews] = useState<CategoryView[] | null>(null);
  const [selectedTier, setSelectedTier] = useState(0);
  const [groupSize, setGroupSize] = useState(2);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    date: "",
  });
  const [loading, setLoading] = useState(false);

  const [bookingTarget, setBookingTarget] = useState<{
    batch: {
      date: string;
      seats: number;
      batchId?: bigint;
    };
  } | null>(null);
  const [fixedForm, setFixedForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    if (!packageId) {
      onBackToList();
      return;
    }
    if (!actor) return;
    let cancelled = false;
    actor
      .listCatalog()
      .then((v) => {
        if (!cancelled) setViews(v ?? []);
      })
      .catch(() => {
        if (!cancelled) setViews([]);
      });
    return () => {
      cancelled = true;
    };
  }, [actor, packageId, onBackToList]);

  const pkg = useMemo(() => {
    if (!views || packageId === null) return null;
    return findPackageById(views, packageId);
  }, [views, packageId]);

  const isPrivate = Boolean(pkg && "private" in pkg.detail);
  const isFixed = Boolean(pkg && "fixed" in pkg.detail);

  const effectiveTiers = useMemo(() => {
    if (!pkg || !isPrivate) return [];
    const priv = privateCfgOf(pkg);
    const pr = priv.pricing;
    if ("multi" in pr) {
      return pr.multi.tiers.map((tier, i) => ({
        key: `t-${i}`,
        label: tier.label,
        color: TIER_COLOR_CYCLE[i % TIER_COLOR_CYCLE.length]!,
        pricePerPerson: (_gs: number) => Number(tier.pricePerPersonINR),
      }));
    }
    return [
      {
        key: "single",
        label: "Package rate",
        color: TIER_COLOR_CYCLE[0]!,
        pricePerPerson: (_gs: number) => Number(pr.single.pricePerPersonINR),
      },
    ];
  }, [pkg, isPrivate]);

  const effectiveAddOns = useMemo(() => {
    if (!pkg || !isPrivate) return [];
    return privateCfgOf(pkg).addOns.map((a) => ({
      id: String(a.addOnId),
      label: a.label,
      price: Number(a.priceINR),
    }));
  }, [pkg, isPrivate]);

  const groupMin =
    pkg && isPrivate ? Number(privateCfgOf(pkg).minGroupSize) : 2;
  const groupMax =
    pkg && isPrivate ? Number(privateCfgOf(pkg).maxGroupSize) : 15;

  useEffect(() => {
    setGroupSize((g) => Math.min(Math.max(g, groupMin), groupMax));
  }, [groupMin, groupMax]);

  useEffect(() => {
    setSelectedTier((t) => (t >= effectiveTiers.length ? 0 : t));
  }, [effectiveTiers.length]);

  const pricePerPerson =
    effectiveTiers[selectedTier]?.pricePerPerson(groupSize) ?? 0;
  const addOnTotal = selectedAddOns.reduce((sum, id) => {
    const a = effectiveAddOns.find((x) => x.id === id);
    return sum + (a ? a.price : 0);
  }, 0);
  const totalPerPerson = pricePerPerson + addOnTotal;
  const grandTotal = totalPerPerson * groupSize;

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handlePrivateBook = async () => {
    if (!actor || !pkg) return;
    if (!form.name || !form.email || !form.phone || !form.date) {
      toast.error("Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      const pc = privateCfgOf(pkg);
      const tierOpt = "multi" in pc.pricing ? BigInt(selectedTier) : undefined;
      await actor.createCatalogBooking(
        pkg.id,
        undefined,
        tierOpt,
        form.date,
        BigInt(groupSize),
        selectedAddOns.map((id) => BigInt(id)),
        form.name,
        form.email,
        form.phone,
        BigInt(grandTotal),
      );
      toast.success("Booking confirmed! We'll contact you soon.");
      setBookingOpen(false);
      setForm({ name: "", email: "", phone: "", date: "" });
    } catch {
      toast.error("Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fixedDisplay = useMemo(() => {
    if (!pkg || !isFixed) return null;
    const f = fixedCfgOf(pkg);
    const tl = pkg as TourPackageListing;
    const thumb = String(tl.thumbnailUrl ?? "").trim();
    return {
      name: pkg.name,
      price: Number(f.pricePerPersonINR),
      image: thumb || pkg.heroImageUrl,
      duration: pkg.shortDescription,
      packageId: pkg.id,
      batches: f.batches.map((b) => ({
        date: b.dateLabel,
        seats: Number(b.seatsRemaining),
        batchId: b.batchId,
      })),
    };
  }, [pkg, isFixed]);

  const handleFixedBook = async () => {
    if (!actor || !pkg || !fixedDisplay) return;
    if (!fixedForm.name || !fixedForm.email || !fixedForm.phone) {
      toast.error("Please fill all fields");
      return;
    }
    if (!bookingTarget) return;
    const batch = bookingTarget.batch;
    setLoading(true);
    try {
      if (batch.batchId !== undefined) {
        await actor.createCatalogBooking(
          fixedDisplay.packageId,
          batch.batchId,
          undefined,
          batch.date,
          BigInt(1),
          [],
          fixedForm.name,
          fixedForm.email,
          fixedForm.phone,
          BigInt(fixedDisplay.price),
        );
      }
      toast.success("Booking confirmed! We'll contact you soon.");
      setBookingTarget(null);
      setFixedForm({ name: "", email: "", phone: "" });
    } catch {
      toast.error("Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!packageId) return null;

  if (views === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground">This package is not available.</p>
        <Button variant="outline" onClick={onBackToList}>
          Back to packages
        </Button>
      </div>
    );
  }

  const tl = pkg as TourPackageListing;
  const heroImg =
    String(tl.thumbnailUrl ?? "").trim() || pkg.heroImageUrl;
  const hint = packagePriceHint(pkg);

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
            onClick={onBackToList}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">All packages</span>
          </button>
          <div className="h-5 w-px bg-white/20" />
          <button
            type="button"
            onClick={() => setPage("home")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Home
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid lg:grid-cols-2 gap-10 mb-12"
        >
          <div className="rounded-2xl overflow-hidden border border-white/10 h-64 lg:h-80">
            <img
              src={heroImg}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="font-display text-3xl md:text-5xl font-black mb-3">
              {pkg.name}
            </h1>
            <p className="text-muted-foreground text-lg mb-4">
              {pkg.shortDescription}
            </p>
            {hint ? (
              <p
                className="text-xl font-bold mb-6"
                style={{ color: "oklch(0.85 0.13 192)" }}
              >
                {hint}
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground max-w-xl">
              Configure options below, then book. Pricing and add-ons are set by
              our team in the catalog — you always see the live totals here.
            </p>
          </div>
        </motion.div>

        {isPrivate && (
          <>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div
                  className="rounded-2xl p-6 border border-white/10"
                  style={{
                    background: "oklch(0.16 0.025 232 / 0.6)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <h2 className="font-display font-bold text-xl mb-5">
                    Options
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {effectiveTiers.map((tier, i) => (
                      <button
                        key={tier.key}
                        type="button"
                        onClick={() => setSelectedTier(i)}
                        className="rounded-xl p-4 border text-left transition-all duration-200"
                        style={{
                          borderColor:
                            selectedTier === i
                              ? tier.color
                              : "oklch(0.3 0.03 232 / 0.5)",
                          background:
                            selectedTier === i
                              ? "oklch(0.16 0.025 232)"
                              : "oklch(0.14 0.02 232 / 0.4)",
                        }}
                      >
                        <div
                          className="font-bold text-lg mb-1"
                          style={{
                            color:
                              selectedTier === i
                                ? tier.color
                                : "oklch(0.75 0.02 232)",
                          }}
                        >
                          {tier.label}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ₹
                          {tier
                            .pricePerPerson(groupSize)
                            .toLocaleString("en-IN")}
                          /pp
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  className="rounded-2xl p-6 border border-white/10"
                  style={{
                    background: "oklch(0.16 0.025 232 / 0.6)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <h2 className="font-display font-bold text-xl mb-2">
                    Group size
                  </h2>
                  <div className="flex items-center gap-4 mb-4">
                    <Users
                      className="w-5 h-5"
                      style={{ color: "oklch(0.85 0.13 192)" }}
                    />
                    <span className="text-3xl font-bold">{groupSize}</span>
                    <span className="text-muted-foreground">people</span>
                  </div>
                  <Slider
                    min={groupMin}
                    max={groupMax}
                    step={1}
                    value={[groupSize]}
                    onValueChange={(v) => setGroupSize(v[0])}
                  />
                </div>

                {effectiveAddOns.length > 0 ? (
                  <div
                    className="rounded-2xl p-6 border border-white/10"
                    style={{
                      background: "oklch(0.16 0.025 232 / 0.6)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <h2 className="font-display font-bold text-xl mb-5">
                      Add-ons
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {effectiveAddOns.map((addOn) => (
                        <label
                          key={addOn.id}
                          htmlFor={`d-addon-${addOn.id}`}
                          className="flex items-center gap-3 rounded-xl p-4 cursor-pointer border"
                          style={{
                            borderColor: selectedAddOns.includes(addOn.id)
                              ? "oklch(0.85 0.13 192 / 0.5)"
                              : "oklch(0.25 0.03 232 / 0.5)",
                          }}
                        >
                          <Checkbox
                            id={`d-addon-${addOn.id}`}
                            checked={selectedAddOns.includes(addOn.id)}
                            onCheckedChange={() => toggleAddOn(addOn.id)}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {addOn.label}
                            </div>
                            <div
                              className="text-xs"
                              style={{ color: "oklch(0.75 0.14 55)" }}
                            >
                              +₹{addOn.price.toLocaleString("en-IN")}/person
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div>
                <div
                  className="sticky top-24 rounded-2xl p-6 border border-white/10"
                  style={{
                    background: "oklch(0.16 0.025 232 / 0.8)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <h2 className="font-display font-bold text-xl mb-6">
                    Summary
                  </h2>
                  <div className="space-y-3 mb-6 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Option</span>
                      <span>{effectiveTiers[selectedTier]?.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Group</span>
                      <span>{groupSize} people</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-bold text-lg">
                        ₹{grandTotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                  <Button
                    className="w-full font-bold"
                    onClick={() => setBookingOpen(true)}
                    style={{
                      background: "oklch(0.85 0.13 192)",
                      color: "oklch(0.13 0.04 195)",
                    }}
                  >
                    Book now
                  </Button>
                </div>
              </div>
            </div>

            <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
              <DialogContent
                className="sm:max-w-md"
                style={{
                  background: "oklch(0.14 0.025 232)",
                  border: "1px solid oklch(0.3 0.04 232 / 0.5)",
                }}
              >
                <DialogHeader>
                  <DialogTitle className="font-display">
                    Book: {pkg.name}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  <Label className="text-xs text-muted-foreground">
                    Full name
                  </Label>
                  <Input
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="bg-white/5 border-white/10"
                  />
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className="bg-white/5 border-white/10"
                  />
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    className="bg-white/5 border-white/10"
                  />
                  <Label className="text-xs text-muted-foreground">
                    Preferred travel date
                  </Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, date: e.target.value }))
                    }
                    className="bg-white/5 border-white/10"
                  />
                  <Button
                    className="w-full font-bold mt-2"
                    disabled={loading}
                    onClick={() => void handlePrivateBook()}
                    style={{
                      background: "oklch(0.85 0.13 192)",
                      color: "oklch(0.13 0.04 195)",
                    }}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Confirm booking"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}

        {isFixed && fixedDisplay && (
          <div
            className="rounded-2xl overflow-hidden border border-white/10"
            style={{
              background: "oklch(0.16 0.025 232 / 0.6)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div className="md:flex">
              <div className="md:w-72 h-48 md:h-auto relative flex-shrink-0">
                <img
                  src={fixedDisplay.image}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 p-6">
                <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
                  <div>
                    <h2 className="font-display font-bold text-2xl mb-1">
                      {fixedDisplay.name}
                    </h2>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{fixedDisplay.duration}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-2xl font-black"
                      style={{ color: "oklch(0.85 0.13 192)" }}
                    >
                      ₹{fixedDisplay.price.toLocaleString("en-IN")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      per person
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                  Choose a date
                </p>
                <div className="flex flex-wrap gap-3">
                  {fixedDisplay.batches.map((batch) => (
                    <div
                      key={`${batch.batchId ?? batch.date}`}
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
                        <div className="text-sm font-medium">{batch.date}</div>
                        <SeatBadge seats={batch.seats} />
                      </div>
                      <Button
                        size="sm"
                        disabled={batch.seats === 0}
                        onClick={() => setBookingTarget({ batch })}
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
                        {batch.seats === 0 ? "Sold out" : "Book"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {!isPrivate && !isFixed && (
          <p className="text-muted-foreground">
            This package cannot be booked online yet. Please contact us.
          </p>
        )}
      </div>

      <Dialog
        open={!!bookingTarget}
        onOpenChange={(o) => !o && setBookingTarget(null)}
      >
        <DialogContent
          className="sm:max-w-md"
          style={{
            background: "oklch(0.14 0.025 232)",
            border: "1px solid oklch(0.3 0.04 232 / 0.5)",
          }}
        >
          <DialogHeader>
            <DialogTitle>
              Book: {fixedDisplay?.name}{" "}
              <span className="text-cyan-400">
                {bookingTarget?.batch.date}
              </span>
            </DialogTitle>
          </DialogHeader>
          {bookingTarget && fixedDisplay && (
            <div className="space-y-3 mt-2">
              <Input
                placeholder="Full name"
                value={fixedForm.name}
                onChange={(e) =>
                  setFixedForm((f) => ({ ...f, name: e.target.value }))
                }
                className="bg-white/5 border-white/10"
              />
              <Input
                type="email"
                placeholder="Email"
                value={fixedForm.email}
                onChange={(e) =>
                  setFixedForm((f) => ({ ...f, email: e.target.value }))
                }
                className="bg-white/5 border-white/10"
              />
              <Input
                placeholder="Phone"
                value={fixedForm.phone}
                onChange={(e) =>
                  setFixedForm((f) => ({ ...f, phone: e.target.value }))
                }
                className="bg-white/5 border-white/10"
              />
              <Button
                className="w-full font-bold"
                disabled={loading}
                onClick={() => void handleFixedBook()}
                style={{
                  background: "oklch(0.85 0.13 192)",
                  color: "oklch(0.13 0.04 195)",
                }}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Confirm booking"
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <footer className="text-center py-8 mt-16 text-xs text-muted-foreground border-t border-white/10 max-w-7xl mx-auto">
        <Mountain className="w-4 h-4 inline mr-1" />
        Mountain Explorers · © {new Date().getFullYear()}
      </footer>
    </div>
  );
}

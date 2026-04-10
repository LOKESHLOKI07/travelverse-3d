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
import { ArrowLeft, Loader2, Mountain, Users } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { PrivateCfg, TourPackage } from "../backend";
import {
  packageForPrivatePage,
  type TourPackageListing,
} from "../utils/catalogListing";
import type { Page } from "../types";

interface Props {
  setPage: (page: Page) => void;
}

const TIERS = [
  {
    id: "standard",
    label: "Standard",
    color: "oklch(0.65 0.12 192)",
    prices: [18000, 15000, 13000, 11000],
  },
  {
    id: "deluxe",
    label: "Deluxe",
    color: "oklch(0.75 0.14 55)",
    prices: [25000, 22000, 19000, 16000],
  },
  {
    id: "super-deluxe",
    label: "Super Deluxe",
    color: "oklch(0.72 0.18 320)",
    prices: [35000, 31000, 27000, 23000],
  },
];

const ADD_ONS = [
  { id: "rafting", label: "River Rafting", price: 800 },
  { id: "paragliding", label: "Paragliding", price: 2500 },
  { id: "skiing", label: "Snow Skiing", price: 1500 },
  { id: "camping", label: "Camping under Stars", price: 600 },
  { id: "photography", label: "Photography Workshop", price: 1200 },
];

const PACKAGES = [
  {
    name: "Manali-Spiti Circuit",
    duration: "10 Days",
    image:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&fit=crop",
    highlights: [
      "Pin Valley",
      "Chandratal Lake",
      "Kunzum Pass",
      "Key Monastery",
    ],
  },
  {
    name: "Leh Ladakh Adventure",
    duration: "12 Days",
    image:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&fit=crop",
    highlights: [
      "Pangong Lake",
      "Nubra Valley",
      "Khardung La",
      "Magnetic Hill",
    ],
  },
];

function getPricePerPerson(tierIndex: number, groupSize: number): number {
  const prices = TIERS[tierIndex].prices;
  if (groupSize <= 2) return prices[0];
  if (groupSize <= 5) return prices[1];
  if (groupSize <= 10) return prices[2];
  return prices[3];
}

const TIER_COLOR_CYCLE = [
  "oklch(0.65 0.12 192)",
  "oklch(0.75 0.14 55)",
  "oklch(0.72 0.18 320)",
];

function privateCfgOf(p: TourPackage): PrivateCfg {
  if (!("private" in p.detail)) {
    throw new Error("Expected private package");
  }
  return p.detail.private;
}

export default function PrivatePackagesPage({ setPage }: Props) {
  const { actor } = useActor();
  const [privatePkgs, setPrivatePkgs] = useState<TourPackage[] | null>(null);
  const [selectedTier, setSelectedTier] = useState(0);
  const [groupSize, setGroupSize] = useState(2);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [bookingPkg, setBookingPkg] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    date: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!actor) return;
    let cancelled = false;
    actor
      .listCatalog()
      .then((cats) => {
        if (cancelled) return;
        const priv: TourPackage[] = [];
        for (const c of cats) {
          for (const p of c.packages) {
            if (packageForPrivatePage(p) && "private" in p.detail) {
              priv.push(p);
            }
          }
        }
        setPrivatePkgs(priv);
      })
      .catch(() => {
        if (!cancelled) setPrivatePkgs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [actor]);

  const catalogMode = !!(privatePkgs && privatePkgs.length > 0);
  const template = catalogMode
    ? (privatePkgs.find((p) => p.name === bookingPkg) ?? privatePkgs[0])
    : null;

  const effectiveTiers = useMemo(() => {
    if (!catalogMode || !template) {
      return TIERS.map((t, i) => ({
        key: t.id,
        label: t.label,
        color: t.color,
        pricePerPerson: (gs: number) => getPricePerPerson(i, gs),
      }));
    }
    const priv = privateCfgOf(template);
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
  }, [catalogMode, template]);

  const effectiveAddOns = useMemo(() => {
    if (!catalogMode || !template) return ADD_ONS;
    return privateCfgOf(template).addOns.map((a) => ({
      id: String(a.addOnId),
      label: a.label,
      price: Number(a.priceINR),
    }));
  }, [catalogMode, template]);

  const groupMin =
    catalogMode && template ? Number(privateCfgOf(template).minGroupSize) : 2;
  const groupMax =
    catalogMode && template ? Number(privateCfgOf(template).maxGroupSize) : 15;

  useEffect(() => {
    setGroupSize((g) => Math.min(Math.max(g, groupMin), groupMax));
  }, [groupMin, groupMax]);

  useEffect(() => {
    setSelectedTier((t) => (t >= effectiveTiers.length ? 0 : t));
  }, [effectiveTiers.length]);

  const displayPackages = useMemo(() => {
    if (catalogMode && privatePkgs) {
      return privatePkgs.map((p) => {
        const tl = p as TourPackageListing;
        const thumb = String(tl.thumbnailUrl ?? "").trim();
        return {
        name: p.name,
        image: thumb || p.heroImageUrl,
        sub: p.shortDescription,
        highlights: [] as string[],
      };
      });
    }
    return PACKAGES.map((p) => ({
      name: p.name,
      image: p.image,
      sub: p.duration,
      highlights: p.highlights,
    }));
  }, [catalogMode, privatePkgs]);

  const pricePerPerson =
    effectiveTiers[selectedTier]!.pricePerPerson(groupSize);
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

  const handleBook = async () => {
    if (!actor) {
      toast.error("Please wait, connecting...");
      return;
    }
    if (!form.name || !form.email || !form.phone || !form.date) {
      toast.error("Please fill all fields");
      return;
    }
    if (!bookingPkg) return;
    setLoading(true);
    try {
      const tierLabel = effectiveTiers[selectedTier]!.label;
      const addOnLabels = selectedAddOns.map(
        (id) => effectiveAddOns.find((a) => a.id === id)?.label ?? id,
      );
      const tourPkg = privatePkgs?.find((p) => p.name === bookingPkg);
      if (catalogMode && tourPkg) {
        const pc = privateCfgOf(tourPkg);
        const tierOpt =
          "multi" in pc.pricing ? BigInt(selectedTier) : undefined;
        await actor.createCatalogBooking(
          tourPkg.id,
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
      } else {
        await actor.createBooking(
          "Private Travel",
          `${bookingPkg} — ${tierLabel}`,
          form.name,
          form.email,
          form.phone,
          form.date,
          BigInt(groupSize),
          addOnLabels,
          BigInt(grandTotal),
        );
      }
      toast.success("Booking confirmed! We'll contact you soon.");
      setBookingPkg(null);
      setForm({ name: "", email: "", phone: "", date: "" });
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
      {/* HEADER */}
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
            Private{" "}
            <span style={{ color: "oklch(0.85 0.13 192)" }}>Packages</span>
          </span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero */}
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
            Tailored for You
          </p>
          <h1 className="font-display text-4xl md:text-6xl font-black text-foreground mb-4">
            Private Travel
            <br />
            <span style={{ color: "oklch(0.75 0.14 55)" }}>Packages</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl">
            Exclusive journeys crafted for your group. Choose your tier,
            customize your experience, and travel on your own terms.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* LEFT: Config panel */}
          <div className="lg:col-span-2 space-y-8">
            {/* Tier Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-2xl p-6 border border-white/10"
              style={{
                background: "oklch(0.16 0.025 232 / 0.6)",
                backdropFilter: "blur(10px)",
              }}
            >
              <h2 className="font-display font-bold text-xl mb-5">
                Select Your Tier
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {effectiveTiers.map((tier, i) => (
                  <button
                    key={tier.key}
                    type="button"
                    data-ocid="private.tier.toggle"
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
                      boxShadow:
                        selectedTier === i
                          ? `0 0 20px ${tier.color}33`
                          : "none",
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
                      from ₹
                      {tier.pricePerPerson(groupSize).toLocaleString("en-IN")}
                      /pp
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Group Size */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="rounded-2xl p-6 border border-white/10"
              style={{
                background: "oklch(0.16 0.025 232 / 0.6)",
                backdropFilter: "blur(10px)",
              }}
            >
              <h2 className="font-display font-bold text-xl mb-2">
                Group Size
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
                data-ocid="private.group_size.input"
                min={groupMin}
                max={groupMax}
                step={1}
                value={[groupSize]}
                onValueChange={(v) => setGroupSize(v[0])}
                className="mb-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{groupMin} people</span>
                <span>{groupMax} people</span>
              </div>
              {!catalogMode && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    [
                      "2 people",
                      `₹${TIERS[selectedTier].prices[0].toLocaleString("en-IN")}/pp`,
                    ],
                    [
                      "3–5 people",
                      `₹${TIERS[selectedTier].prices[1].toLocaleString("en-IN")}/pp`,
                    ],
                    [
                      "6–10 people",
                      `₹${TIERS[selectedTier].prices[2].toLocaleString("en-IN")}/pp`,
                    ],
                    [
                      "11–15 people",
                      `₹${TIERS[selectedTier].prices[3].toLocaleString("en-IN")}/pp`,
                    ],
                  ].map(([label, price]) => (
                    <div
                      key={label}
                      className="rounded-lg p-3 text-sm"
                      style={{ background: "oklch(0.13 0.02 232)" }}
                    >
                      <div className="text-muted-foreground">{label}</div>
                      <div
                        className="font-semibold"
                        style={{ color: "oklch(0.85 0.13 192)" }}
                      >
                        {price}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Add-ons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="rounded-2xl p-6 border border-white/10"
              style={{
                background: "oklch(0.16 0.025 232 / 0.6)",
                backdropFilter: "blur(10px)",
              }}
            >
              <h2 className="font-display font-bold text-xl mb-5">
                Add-On Activities
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {effectiveAddOns.map((addOn) => (
                  <label
                    key={addOn.id}
                    htmlFor={`addon-${addOn.id}`}
                    className="flex items-center gap-3 rounded-xl p-4 cursor-pointer transition-all border"
                    style={{
                      borderColor: selectedAddOns.includes(addOn.id)
                        ? "oklch(0.85 0.13 192 / 0.5)"
                        : "oklch(0.25 0.03 232 / 0.5)",
                      background: selectedAddOns.includes(addOn.id)
                        ? "oklch(0.16 0.04 192 / 0.3)"
                        : "oklch(0.14 0.02 232 / 0.3)",
                    }}
                  >
                    <Checkbox
                      id={`addon-${addOn.id}`}
                      data-ocid="private.addon.checkbox"
                      checked={selectedAddOns.includes(addOn.id)}
                      onCheckedChange={() => toggleAddOn(addOn.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{addOn.label}</div>
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
            </motion.div>

            {/* Packages */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <h2 className="font-display font-bold text-xl mb-5">
                Choose a Package
              </h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {displayPackages.map((pkg) => (
                  <div
                    key={pkg.name}
                    className="rounded-2xl overflow-hidden border border-white/10 group"
                  >
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={pkg.image}
                        alt={pkg.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(to top, oklch(0.13 0.025 232), transparent)",
                        }}
                      />
                    </div>
                    <div
                      className="p-5"
                      style={{ background: "oklch(0.16 0.025 232 / 0.8)" }}
                    >
                      <h3 className="font-display font-bold text-lg mb-1">
                        {pkg.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-3">
                        {pkg.sub}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {pkg.highlights.map((h) => (
                          <span
                            key={h}
                            className="text-xs px-2 py-1 rounded-full"
                            style={{
                              background: "oklch(0.2 0.03 232)",
                              color: "oklch(0.75 0.05 232)",
                            }}
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                      <Button
                        data-ocid="private.package.primary_button"
                        className="w-full"
                        onClick={() => setBookingPkg(pkg.name)}
                        style={{
                          background: "oklch(0.85 0.13 192)",
                          color: "oklch(0.13 0.04 195)",
                          fontWeight: 700,
                        }}
                      >
                        Book This Package
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* RIGHT: Price Summary */}
          <div>
            <div
              className="sticky top-24 rounded-2xl p-6 border border-white/10"
              style={{
                background: "oklch(0.16 0.025 232 / 0.8)",
                backdropFilter: "blur(10px)",
              }}
            >
              <h2 className="font-display font-bold text-xl mb-6">
                Price Summary
              </h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tier</span>
                  <span
                    className="font-medium"
                    style={{ color: effectiveTiers[selectedTier]!.color }}
                  >
                    {effectiveTiers[selectedTier]!.label}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Group</span>
                  <span>{groupSize} people</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base/person</span>
                  <span>₹{pricePerPerson.toLocaleString("en-IN")}</span>
                </div>
                {selectedAddOns.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Add-ons/person
                    </span>
                    <span style={{ color: "oklch(0.75 0.14 55)" }}>
                      +₹{addOnTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                <div className="h-px bg-white/10" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Per person</span>
                  <span className="font-semibold">
                    ₹{totalPerPerson.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
              <div
                className="rounded-xl p-4 mb-6"
                style={{ background: "oklch(0.13 0.025 232)" }}
              >
                <div className="text-xs text-muted-foreground mb-1">
                  Grand Total
                </div>
                <div
                  className="text-3xl font-black"
                  style={{ color: "oklch(0.85 0.13 192)" }}
                >
                  ₹{grandTotal.toLocaleString("en-IN")}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  for {groupSize} people
                </div>
              </div>
              {effectiveAddOns.filter((a) => selectedAddOns.includes(a.id))
                .length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    Selected add-ons:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedAddOns.map((id) => {
                      const a = effectiveAddOns.find((x) => x.id === id);
                      return (
                        <Badge key={id} variant="secondary" className="text-xs">
                          {a?.label}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground text-center">
                Select a package above to book
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Dialog */}
      <Dialog
        open={!!bookingPkg}
        onOpenChange={(o) => !o && setBookingPkg(null)}
      >
        <DialogContent
          data-ocid="private.booking.dialog"
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
                {bookingPkg}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div
              className="rounded-xl p-3 text-sm"
              style={{ background: "oklch(0.11 0.02 232)" }}
            >
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {effectiveTiers[selectedTier]!.label} · {groupSize} people
                </span>
                <span
                  className="font-bold"
                  style={{ color: "oklch(0.85 0.13 192)" }}
                >
                  ₹{grandTotal.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label
                  htmlFor="pk-name"
                  className="text-xs text-muted-foreground mb-1.5 block"
                >
                  Full Name
                </Label>
                <Input
                  id="pk-name"
                  data-ocid="private.booking.input"
                  placeholder="Ravi Kumar"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div>
                <Label
                  htmlFor="pk-email"
                  className="text-xs text-muted-foreground mb-1.5 block"
                >
                  Email
                </Label>
                <Input
                  id="pk-email"
                  data-ocid="private.booking.input"
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
                <Label
                  htmlFor="pk-phone"
                  className="text-xs text-muted-foreground mb-1.5 block"
                >
                  Phone
                </Label>
                <Input
                  id="pk-phone"
                  data-ocid="private.booking.input"
                  placeholder="+91 9876543210"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div>
                <Label
                  htmlFor="pk-date"
                  className="text-xs text-muted-foreground mb-1.5 block"
                >
                  Preferred Travel Date
                </Label>
                <Input
                  id="pk-date"
                  data-ocid="private.booking.input"
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>
            <Button
              data-ocid="private.booking.submit_button"
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

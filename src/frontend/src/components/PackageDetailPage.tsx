import CatalogBookingCheckoutDialog from "@/components/CatalogBookingCheckoutDialog";
import { FixedBatchSeatBadge } from "@/components/FixedBatchSeatBadge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useActor } from "@/hooks/useActor";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Bed,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Dog,
  FileText,
  Flame,
  Gamepad2,
  Globe,
  HardHat,
  Loader2,
  MapPin,
  Mountain,
  Music,
  Phone,
  Plane,
  Sparkles,
  Video,
  Tent,
  Ticket,
  User,
  Users,
  Utensils,
  Wine,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  CategoryView,
  PrivateCfg,
  PrivatePartyBookingBreakdown,
  TourPackage,
} from "../backend";
import type { Page } from "../types";
import {
  effectivePackageInclusions,
  formatSeasonWindow,
  getListingKind,
  isPrivatePartyMatrixConfigured,
  itineraryPlansFromTourPackage,
  packageDetailGalleryUrls,
  stayFullDescriptionText,
  type TourAmenity,
  type TourPackageListing,
} from "../utils/catalogListing";
import {
  findPackageById,
  findPackagesByIds,
  packagePriceHint,
} from "../utils/unifiedCatalog";
import DatePickerField from "./DatePickerField";

const AMENITY_LUCIDE: Record<string, LucideIcon> = {
  bed: Bed,
  tent: Tent,
  wine: Wine,
  "hard-hat": HardHat,
  utensils: Utensils,
  activity: Gamepad2,
  dog: Dog,
  "file-text": FileText,
  plane: Plane,
  users: Users,
  "map-pin": MapPin,
  globe: Globe,
  music: Music,
  flame: Flame,
  mountain: Mountain,
  ticket: Ticket,
};

function AmenityGlyph({ name }: { name: string }) {
  const Icon = AMENITY_LUCIDE[name.toLowerCase()] ?? Sparkles;
  return (
    <Icon
      className="w-4 h-4 shrink-0"
      style={{ color: "oklch(var(--brand-blue))" }}
    />
  );
}

type RazorpayOrderPayload = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
};

type RazorpayVerifyPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type PaymentActorLike = {
  createRazorpayOrderForBooking?: (bookingId: bigint) => Promise<RazorpayOrderPayload>;
  verifyRazorpayPayment?: (
    payload: RazorpayVerifyPayload,
  ) => Promise<{ ok: boolean; bookingId: string }>;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

interface Props {
  packageId: bigint | null;
  setPage: (page: Page) => void;
  onBackToList: () => void;
  /** Navigate to another package from “Related” cards. */
  onOpenPackageDetail?: (id: bigint) => void;
}

const TIER_COLOR_CYCLE = [
  "oklch(0.65 0.12 192)",
  "oklch(var(--brand-coral))",
  "oklch(0.72 0.18 320)",
];

function formatIsoStayLabel(iso: string) {
  if (!iso) return undefined;
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function privateCfgOf(p: TourPackage): PrivateCfg {
  if (!("private" in p.detail)) throw new Error("Expected private package");
  return p.detail.private;
}

function fixedCfgOf(p: TourPackage) {
  if (!("fixed" in p.detail)) throw new Error("Expected fixed package");
  return p.detail.fixed;
}

export default function PackageDetailPage({
  packageId,
  setPage,
  onBackToList,
  onOpenPackageDetail,
}: Props) {
  const { actor } = useActor();
  const [views, setViews] = useState<CategoryView[] | null>(null);
  const [selectedTier, setSelectedTier] = useState(0);
  const [groupSize, setGroupSize] = useState(2);
  const [partyAdults, setPartyAdults] = useState(2);
  const [partyCUnderFree, setPartyCUnderFree] = useState(0);
  const [partyCHalf, setPartyCHalf] = useState(0);
  const [partyCFull, setPartyCFull] = useState(0);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [privateBookingDate, setPrivateBookingDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const [bookingTarget, setBookingTarget] = useState<{
    batch: {
      date: string;
      seats: number;
      seatsTotal: number;
      batchId?: bigint;
    };
  } | null>(null);
  const [selectedFixedAddOns, setSelectedFixedAddOns] = useState<string[]>([]);

  const travelDateMin = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  useEffect(() => {
    setSelectedFixedAddOns([]);
  }, [packageId, bookingTarget?.batch.date]);

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

  const galleryUrls = useMemo(
    () => (pkg ? packageDetailGalleryUrls(pkg) : []),
    [pkg],
  );

  useEffect(() => {
    setGalleryIndex(0);
  }, [packageId, galleryUrls.join("|")]);

  const relatedPackages = useMemo(() => {
    if (!views || !pkg) return [];
    const tl = pkg as TourPackageListing;
    const ids = tl.relatedPackageIds ?? [];
    return findPackagesByIds(views, ids, { excludeId: pkg.id });
  }, [views, pkg]);

  const isPrivate = Boolean(pkg && "private" in pkg.detail);
  const isFixed = Boolean(pkg && "fixed" in pkg.detail);
  const isPrivateTourPackage = Boolean(
    pkg && isPrivate && getListingKind(pkg) === "private",
  );

  const partyMatrixActive = useMemo(
    () =>
      Boolean(
        pkg && isPrivateTourPackage && isPrivatePartyMatrixConfigured(pkg),
      ),
    [pkg, isPrivateTourPackage],
  );

  const privateTourPlan = useMemo(() => {
    if (!pkg || !isPrivateTourPackage) return [];
    return itineraryPlansFromTourPackage(pkg);
  }, [pkg, isPrivateTourPackage]);

  const [openTourDayIndex, setOpenTourDayIndex] = useState(0);

  useEffect(() => {
    setOpenTourDayIndex(0);
  }, [packageId, privateTourPlan.map((d) => d.title + d.description).join("|")]);

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

  useEffect(() => {
    if (!pkg || !partyMatrixActive) return;
    const tl = pkg as TourPackageListing;
    const minO = Math.max(1, Number(tl.minOnlinePartySize ?? 2));
    setPartyAdults(Math.max(minO, 2));
    setPartyCUnderFree(0);
    setPartyCHalf(0);
    setPartyCFull(0);
  }, [packageId, partyMatrixActive, pkg]);

  const matrixHeads = partyMatrixActive
    ? partyAdults + partyCUnderFree + partyCHalf + partyCFull
    : 0;
  const matrixWeighted = partyMatrixActive
    ? partyAdults + 0.5 * partyCHalf + partyCFull
    : 0;
  const minOnlineParty = pkg
    ? Number((pkg as TourPackageListing).minOnlinePartySize ?? 2)
    : 2;
  const maxOnlineParty = pkg
    ? Number((pkg as TourPackageListing).maxOnlinePartySize ?? 12)
    : 12;
  const matrixRow = useMemo(() => {
    if (!partyMatrixActive || !pkg) return null;
    const matrix = (pkg as TourPackageListing).privatePartyPricing ?? [];
    return matrix.find((r) => Number(r.pax) === matrixHeads) ?? null;
  }, [partyMatrixActive, pkg, matrixHeads]);

  const pricePerPerson =
    effectiveTiers[selectedTier]?.pricePerPerson(groupSize) ?? 0;
  const addOnTotal = selectedAddOns.reduce((sum, id) => {
    const a = effectiveAddOns.find((x) => x.id === id);
    return sum + (a ? a.price : 0);
  }, 0);
  const totalPerPerson = pricePerPerson + addOnTotal;
  const matrixPricePP = matrixRow ? Number(matrixRow.pricePerPersonINR) : 0;
  const matrixBookingOk =
    partyMatrixActive &&
    matrixHeads >= minOnlineParty &&
    matrixHeads <= maxOnlineParty &&
    matrixRow !== null &&
    matrixWeighted > 0;
  const grandTotal = partyMatrixActive
    ? matrixBookingOk
      ? Math.round((matrixPricePP + addOnTotal) * matrixWeighted)
      : 0
    : totalPerPerson * groupSize;

  const partyChildLabels = useMemo(() => {
    if (!pkg || !partyMatrixActive) {
      return { free: "", half: "", full: "" };
    }
    const tl = pkg as TourPackageListing;
    const cf = Number(tl.childFreeMaxAge ?? 5);
    const ch = Number(tl.childHalfMaxAge ?? 10);
    const fi = Math.max(ch + 1, Number(tl.childFullMinAge ?? 11));
    return {
      free: `Children ages 0–${cf} (free)`,
      half: `Children ages ${cf + 1}–${ch} (½ unit each)`,
      full: `Children age ${fi}+ (full unit each)`,
    };
  }, [pkg, partyMatrixActive]);

  const meetingLabel = pkg
    ? String((pkg as TourPackageListing).meetingPointLabel ?? "").trim()
    : "";
  const meetingMapsUrl = pkg
    ? String((pkg as TourPackageListing).meetingPointMapsUrl ?? "").trim()
    : "";

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const ensureRazorpayScript = async () => {
    if (window.Razorpay) return true;
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
      );
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("Failed to load Razorpay checkout SDK")),
          { once: true },
        );
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Failed to load Razorpay checkout SDK"));
      document.body.appendChild(script);
    });
    return Boolean(window.Razorpay);
  };

  const launchRazorpayForBooking = async (
    bookingId: bigint,
    prefill: { name: string; email: string; contact: string },
  ) => {
    if (!actor) throw new Error("Booking service unavailable");
    const paymentActor = actor as PaymentActorLike;
    if (
      typeof paymentActor.createRazorpayOrderForBooking !== "function" ||
      typeof paymentActor.verifyRazorpayPayment !== "function"
    ) {
      throw new Error("Payment endpoints are not available in current backend mode");
    }
    const canLoad = await ensureRazorpayScript();
    if (!canLoad || !window.Razorpay) {
      throw new Error("Unable to load Razorpay checkout");
    }
    const order = await paymentActor.createRazorpayOrderForBooking(bookingId);
    await new Promise<void>((resolve, reject) => {
      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "Mountain Explorers",
        description: "Tour package booking",
        prefill,
        handler: async (resp: unknown) => {
          try {
            const payload = resp as RazorpayVerifyPayload;
            await paymentActor.verifyRazorpayPayment?.(payload);
            resolve();
          } catch (e) {
            reject(e);
          }
        },
        modal: {
          ondismiss: () => reject(new Error("Payment was cancelled")),
        },
      });
      razorpay.open();
    });
  };

  const handlePrivateBook = async (payload: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  }) => {
    if (!actor || !pkg) return;
    if (!privateBookingDate.trim()) {
      toast.error("Please choose your preferred travel date.");
      return;
    }
    if (partyMatrixActive && !matrixBookingOk) {
      toast.error(
        matrixHeads > maxOnlineParty
          ? "For larger groups, please contact us to book."
          : "Adjust guest counts so the party size and paying units are valid.",
      );
      return;
    }
    setLoading(true);
    try {
      const pc = privateCfgOf(pkg);
      const tierOpt =
        partyMatrixActive || !("multi" in pc.pricing)
          ? undefined
          : BigInt(selectedTier);
      const heads = partyMatrixActive
        ? matrixHeads
        : groupSize;
      const partyBreakdown: PrivatePartyBookingBreakdown | undefined =
        partyMatrixActive
          ? {
              adults: partyAdults,
              childrenUnder6: partyCUnderFree,
              children6To10: partyCHalf,
              children11Plus: partyCFull,
            }
          : undefined;
      const bookingId = await actor.createCatalogBooking(
        pkg.id,
        undefined,
        tierOpt,
        privateBookingDate,
        BigInt(heads),
        selectedAddOns.map((id) => BigInt(id)),
        payload.customerName,
        payload.customerEmail,
        payload.customerPhone,
        BigInt(grandTotal),
        partyBreakdown,
      );
      await launchRazorpayForBooking(bookingId, {
        name: payload.customerName,
        email: payload.customerEmail,
        contact: payload.customerPhone,
      });
      toast.success("Payment successful! Booking confirmed.");
      setBookingOpen(false);
      setPrivateBookingDate("");
    } catch (e) {
      toast.error(String((e as Error)?.message || "Booking failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const fixedDisplay = useMemo(() => {
    if (!pkg || !isFixed) return null;
    const f = fixedCfgOf(pkg);
    const tl = pkg as TourPackageListing;
    const exclusions = (tl.packageExclusions ?? [])
      .map((s) => String(s).trim())
      .filter(Boolean);
    return {
      name: pkg.name,
      price: Number(f.pricePerPersonINR),
      duration: pkg.shortDescription,
      durationLabel: String(tl.durationLabel ?? "").trim(),
      packageId: pkg.id,
      inclusions: effectivePackageInclusions(pkg, f.inclusions ?? []),
      exclusions,
      addOns: (f.addOns ?? []).map((a) => ({
        id: String(a.addOnId),
        label: a.label,
        price: Number(a.priceINR),
      })),
      batches: f.batches.map((b) => ({
        date: b.dateLabel,
        seats: Number(b.seatsRemaining),
        seatsTotal: Number(b.seatsTotal),
        batchId: b.batchId,
      })),
    };
  }, [pkg, isFixed]);

  const primaryOverview = useMemo(() => {
    if (!pkg) return "";
    const tl = pkg as TourPackageListing;
    const d = String(tl.detailOverview ?? "").trim();
    if (d) return d;
    const lk = getListingKind(pkg);
    if (lk === "hotel" || lk === "villa") return "";
    return String(pkg.shortDescription ?? "").trim();
  }, [pkg]);

  const durationHeroLine = useMemo(() => {
    if (!pkg) return "";
    const tl = pkg as TourPackageListing;
    const a = String(tl.durationLabel ?? "").trim();
    if (a) return a;
    if (isFixed) return String(pkg.shortDescription ?? "").trim();
    return "";
  }, [pkg, isFixed]);

  const tourTypeHeroLine = useMemo(() => {
    if (!pkg) return "";
    return String((pkg as TourPackageListing).tourTypeLabel ?? "").trim();
  }, [pkg]);

  const detailAmenities = useMemo((): TourAmenity[] => {
    if (!pkg) return [];
    const raw = (pkg as TourPackageListing).amenities ?? [];
    return raw.filter((a) => String(a?.label ?? "").trim());
  }, [pkg]);

  const lastMinutePackages = useMemo(() => {
    if (!views || !pkg) return [];
    const ids = (pkg as TourPackageListing).lastMinuteDealPackageIds ?? [];
    return findPackagesByIds(views, ids, { excludeId: pkg.id });
  }, [views, pkg]);

  const listingInclusions = useMemo(() => {
    if (!pkg) return [];
    const tl = pkg as TourPackageListing;
    return (tl.packageInclusions ?? [])
      .map((s) => String(s).trim())
      .filter(Boolean);
  }, [pkg]);

  const listingExclusions = useMemo(() => {
    if (!pkg) return [];
    const tl = pkg as TourPackageListing;
    return (tl.packageExclusions ?? [])
      .map((s) => String(s).trim())
      .filter(Boolean);
  }, [pkg]);

  const fixedAddOnTotal = useMemo(() => {
    if (!fixedDisplay) return 0;
    return fixedDisplay.addOns
      .filter((a) => selectedFixedAddOns.includes(a.id))
      .reduce((s, a) => s + a.price, 0);
  }, [fixedDisplay, selectedFixedAddOns]);

  const fixedClaimedTotal = fixedDisplay
    ? (fixedDisplay.price + fixedAddOnTotal) * 1
    : 0;

  const toggleFixedAddOn = (id: string) => {
    setSelectedFixedAddOns((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const tourMetaLines = useMemo(() => {
    if (!pkg) return [];
    const tl = pkg as TourPackageListing;
    const rows: { icon: LucideIcon; label: string; value: string }[] = [];
    const minA = String(tl.tourMinAge ?? "").trim();
    let maxG = String(tl.tourMaxGuestsDisplay ?? "").trim();
    if (!maxG && isPrivate) {
      maxG = String(privateCfgOf(pkg).maxGroupSize ?? "");
    }
    const seasonTxt = formatSeasonWindow(
      tl.seasonStartMonth,
      tl.seasonEndMonth,
    );
    const loc = String(tl.tourLocation ?? "").trim();
    const langs = String(tl.tourLanguages ?? "").trim();
    if (minA) rows.push({ icon: User, label: "Min age", value: minA });
    if (maxG) rows.push({ icon: Users, label: "Max guests", value: maxG });
    if (isPrivateTourPackage && seasonTxt) {
      rows.push({ icon: Calendar, label: "Season", value: seasonTxt });
    }
    if (loc) {
      const lk = getListingKind(pkg);
      if (lk !== "hotel" && lk !== "villa") {
        rows.push({ icon: MapPin, label: "Tour location", value: loc });
      }
    }
    if (langs)
      rows.push({ icon: Globe, label: "Languages support", value: langs });
    return rows;
  }, [pkg, isPrivate, isPrivateTourPackage]);

  const handleFixedBook = async (payload: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  }) => {
    if (!actor || !pkg || !fixedDisplay) return;
    if (!bookingTarget) return;
    const batch = bookingTarget.batch;
    if (batch.batchId === undefined) {
      toast.error("This departure is not linked for online payment yet.");
      return;
    }
    setLoading(true);
    try {
      const bookingId = await actor.createCatalogBooking(
        fixedDisplay.packageId,
        batch.batchId,
        undefined,
        batch.date,
        BigInt(1),
        selectedFixedAddOns.map((id) => BigInt(id)),
        payload.customerName,
        payload.customerEmail,
        payload.customerPhone,
        BigInt(fixedClaimedTotal),
      );
      await launchRazorpayForBooking(bookingId, {
        name: payload.customerName,
        email: payload.customerEmail,
        contact: payload.customerPhone,
      });
      toast.success("Payment successful! Booking confirmed.");
      setBookingTarget(null);
      setSelectedFixedAddOns([]);
    } catch (e) {
      toast.error(String((e as Error)?.message || "Booking failed. Please try again."));
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
  const listingKindForStay = getListingKind(pkg);
  const propertyMapsUrl = String(tl.propertyMapsUrl ?? "").trim();
  const propertyYoutubeUrl = String(tl.propertyYoutubeUrl ?? "").trim();
  const tourLocationLine = String(tl.tourLocation ?? "").trim();
  const staySubtitle =
    listingKindForStay === "hotel" || listingKindForStay === "villa"
      ? String(pkg.shortDescription ?? "").trim()
      : "";
  const stayLongDescription =
    listingKindForStay === "hotel" || listingKindForStay === "villa"
      ? stayFullDescriptionText(tl.longDescription)
      : "";
  const showStayLocationMedia =
    (listingKindForStay === "hotel" || listingKindForStay === "villa") &&
    (Boolean(tourLocationLine) ||
      Boolean(propertyMapsUrl) ||
      Boolean(propertyYoutubeUrl));
  const mainGallerySrc =
    galleryUrls[galleryIndex] ??
    (String(tl.thumbnailUrl ?? "").trim() || pkg.heroImageUrl);
  const hint = packagePriceHint(pkg);

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
            onClick={onBackToList}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">All packages</span>
          </button>
          <div className="h-5 w-px bg-border" />
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
          className="grid lg:grid-cols-2 gap-10 mb-10"
        >
          <div className="space-y-3">
            <div className="rounded-2xl overflow-hidden border border-border h-64 lg:h-80 bg-muted/30">
              <img
                src={mainGallerySrc}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            {galleryUrls.length > 1 ? (
              <div className="flex gap-2 flex-wrap">
                {galleryUrls.map((url, i) => (
                  <button
                    key={`${url}-${i}`}
                    type="button"
                    onClick={() => setGalleryIndex(i)}
                    className="relative h-16 w-24 shrink-0 rounded-lg overflow-hidden border-2 transition-opacity"
                    style={{
                      borderColor:
                        galleryIndex === i
                          ? "oklch(var(--brand-blue))"
                          : "oklch(0.88 0.02 248 / 0.6)",
                      opacity: galleryIndex === i ? 1 : 0.75,
                    }}
                  >
                    <img
                      src={url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div>
            <h1 className="font-display text-3xl md:text-5xl font-black mb-3">
              {pkg.name}
            </h1>
            {staySubtitle ? (
              <p className="text-base text-muted-foreground max-w-xl -mt-1 mb-3 leading-snug">
                {staySubtitle}
              </p>
            ) : null}
            {hint ? (
              <p
                className="text-xl font-bold mb-3 flex flex-wrap items-center gap-2"
                style={{ color: "oklch(var(--brand-blue))" }}
              >
                <Phone className="w-5 h-5 shrink-0 opacity-80" aria-hidden />
                {hint}
              </p>
            ) : null}
            {durationHeroLine || tourTypeHeroLine ? (
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mb-4">
                {durationHeroLine ? (
                  <span className="inline-flex items-center gap-2">
                    <Clock className="w-4 h-4 shrink-0" aria-hidden />
                    {durationHeroLine}
                  </span>
                ) : null}
                {tourTypeHeroLine ? (
                  <span className="inline-flex items-center gap-2">
                    <Plane className="w-4 h-4 shrink-0" aria-hidden />
                    {tourTypeHeroLine}
                  </span>
                ) : null}
              </div>
            ) : null}
            <p className="text-sm text-muted-foreground max-w-xl">
              {listingKindForStay === "hotel" ? (
                <>
                  Choose a room type and group size below, then book. Prices and
                  add-ons follow your live catalog entry.
                </>
              ) : listingKindForStay === "villa" ? (
                <>
                  Choose your stay option and group size below, then book.
                  Prices and add-ons follow your live catalog entry.
                </>
              ) : (
                <>
                  Configure options below, then book. Pricing and add-ons are
                  set by our team in the catalog — you always see the live
                  totals here.
                </>
              )}
            </p>
          </div>
        </motion.div>

        {primaryOverview ? (
          <div
            className="mb-10 rounded-2xl p-6 md:p-8 border border-border"
            style={{
              background: "oklch(0.98 0.008 248 / 0.72)",
              backdropFilter: "blur(10px)",
            }}
          >
            <h2 className="font-display font-bold text-xl md:text-2xl mb-3 underline underline-offset-4 decoration-foreground/25">
              Overview
            </h2>
            <p className="text-muted-foreground leading-relaxed text-base max-w-3xl whitespace-pre-wrap">
              {primaryOverview}
            </p>
          </div>
        ) : null}

        {(listingInclusions.length > 0 || listingExclusions.length > 0) &&
        !isFixed ? (
          <div
            className="mb-10 rounded-2xl p-6 md:p-8 border border-border"
            style={{
              background: "oklch(0.98 0.008 248 / 0.72)",
              backdropFilter: "blur(10px)",
            }}
          >
            <h2 className="font-display font-bold text-xl md:text-2xl mb-4 underline underline-offset-4 decoration-foreground/25">
              Included / Exclude
            </h2>
            <div className="grid sm:grid-cols-2 gap-6 max-w-3xl">
              <ul className="space-y-2 text-sm">
                {listingInclusions.map((line) => (
                  <li key={line} className="flex gap-2 items-start">
                    <Check
                      className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600"
                      aria-hidden
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <ul className="space-y-2 text-sm">
                {listingExclusions.map((line) => (
                  <li key={line} className="flex gap-2 items-start">
                    <X
                      className="w-4 h-4 shrink-0 mt-0.5 text-red-500"
                      aria-hidden
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {!isFixed && detailAmenities.length > 0 ? (
          <div
            className="mb-10 rounded-2xl p-6 md:p-8 border border-border"
            style={{
              background: "oklch(0.98 0.008 248 / 0.72)",
              backdropFilter: "blur(10px)",
            }}
          >
            <h2 className="font-display font-bold text-xl md:text-2xl mb-4 underline underline-offset-4 decoration-foreground/25">
              Tour amenities
            </h2>
            <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3 max-w-3xl">
              {detailAmenities.map((a) => (
                <li key={`${a.icon}-${a.label}`} className="flex gap-2 items-center text-sm">
                  <AmenityGlyph name={a.icon} />
                  <span>{a.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {stayLongDescription ? (
          <div
            className="mb-10 rounded-2xl p-6 md:p-8 border border-border"
            style={{
              background: "oklch(0.98 0.008 248 / 0.72)",
              backdropFilter: "blur(10px)",
            }}
          >
            <h2 className="font-display font-bold text-xl md:text-2xl mb-4">
              {listingKindForStay === "hotel"
                ? "About this hotel"
                : "About this villa & farm stay"}
            </h2>
            <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm md:text-base max-w-3xl">
              {stayLongDescription}
            </div>
          </div>
        ) : null}

        {showStayLocationMedia ? (
          <div
            className="mb-10 rounded-2xl p-6 md:p-8 border border-border"
            style={{
              background: "oklch(0.98 0.008 248 / 0.72)",
              backdropFilter: "blur(10px)",
            }}
          >
            <h2 className="font-display font-bold text-xl md:text-2xl mb-4 flex items-center gap-2">
              <MapPin
                className="w-6 h-6 shrink-0"
                style={{ color: "oklch(var(--brand-blue))" }}
                aria-hidden
              />
              Location &amp; media
            </h2>
            <div className="space-y-4 max-w-3xl text-sm md:text-base">
              {tourLocationLine ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Destination / region
                  </p>
                  <p className="text-foreground font-medium">{tourLocationLine}</p>
                </div>
              ) : null}
              {propertyMapsUrl ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Google Maps
                  </p>
                  <a
                    href={propertyMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-semibold underline"
                    style={{ color: "oklch(var(--brand-blue))" }}
                  >
                    <Globe className="w-4 h-4 shrink-0" aria-hidden />
                    Open property in Google Maps
                  </a>
                </div>
              ) : null}
              {propertyYoutubeUrl ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Video
                  </p>
                  <a
                    href={propertyYoutubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-semibold underline"
                    style={{ color: "oklch(var(--brand-blue))" }}
                  >
                    <Video className="w-4 h-4 shrink-0" aria-hidden />
                    Watch on YouTube
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {relatedPackages.length > 0 ? (
          <div className="mb-10">
            <h2 className="font-display font-bold text-xl md:text-2xl mb-4">
              Related packages
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedPackages.map((rp) => {
                const rpl = rp as TourPackageListing;
                const thumb =
                  String(rpl.thumbnailUrl ?? "").trim() || rp.heroImageUrl;
                const ph = packagePriceHint(rp);
                return (
                  <button
                    key={String(rp.id)}
                    type="button"
                    className="text-left rounded-2xl border border-border overflow-hidden transition-shadow hover:shadow-md"
                    style={{
                      background: "oklch(0.98 0.008 248 / 0.72)",
                    }}
                    onClick={() => onOpenPackageDetail?.(rp.id)}
                  >
                    <div className="h-36 w-full overflow-hidden">
                      <img
                        src={thumb}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <p className="font-display font-bold text-sm line-clamp-2 mb-1">
                        {rp.name}
                      </p>
                      {ph ? (
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "oklch(var(--brand-blue))" }}
                        >
                          {ph}
                        </p>
                      ) : null}
                      <span className="text-xs text-muted-foreground mt-2 inline-block">
                        View details →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {isPrivate && (
          <>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {isPrivateTourPackage && (meetingLabel || meetingMapsUrl) ? (
                  <div
                    className="rounded-2xl p-6 border border-border"
                    style={{
                      background: "oklch(0.98 0.008 248 / 0.72)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <h2 className="font-display font-bold text-xl mb-3 flex items-center gap-2">
                      <MapPin
                        className="w-5 h-5"
                        style={{ color: "oklch(var(--brand-blue))" }}
                        aria-hidden
                      />
                      Meeting point
                    </h2>
                    {meetingLabel ? (
                      <p className="text-sm text-muted-foreground mb-3">
                        {meetingLabel}
                      </p>
                    ) : null}
                    {meetingMapsUrl ? (
                      <a
                        href={meetingMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-semibold underline"
                        style={{ color: "oklch(var(--brand-blue))" }}
                      >
                        Open in Google Maps
                      </a>
                    ) : null}
                  </div>
                ) : null}

                {!partyMatrixActive ? (
                  <div
                    className="rounded-2xl p-6 border border-border"
                    style={{
                      background: "oklch(0.98 0.008 248 / 0.72)",
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
                          className={`rounded-xl p-4 border text-left transition-all duration-200 ${
                            selectedTier === i
                              ? "select-card-warm-selected"
                              : "select-card-warm"
                          }`}
                          style={{
                            borderColor:
                              selectedTier === i
                                ? tier.color
                                : undefined,
                            boxShadow:
                              selectedTier === i
                                ? "0 0 26px oklch(var(--brand-blue) / 0.2)"
                                : undefined,
                          }}
                        >
                          <div
                            className="font-bold text-lg mb-1"
                            style={{
                              color:
                                selectedTier === i
                                  ? tier.color
                                  : "oklch(0.32 0.05 255)",
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
                ) : (
                  <div
                    className="rounded-2xl p-6 border border-border"
                    style={{
                      background: "oklch(0.98 0.008 248 / 0.72)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <h2 className="font-display font-bold text-xl mb-2">
                      Party pricing
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Total price uses the rate for your exact headcount (see
                      table) times paying units: adults and older children count
                      full, half for the middle age band, and the youngest band is
                      free.
                    </p>
                  </div>
                )}

                {!partyMatrixActive ? (
                  <div
                    className="rounded-2xl p-6 border border-border"
                    style={{
                      background: "oklch(0.98 0.008 248 / 0.72)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <h2 className="font-display font-bold text-xl mb-2">
                      Group size
                    </h2>
                    <div className="flex items-center gap-4 mb-4">
                      <Users
                        className="w-5 h-5"
                        style={{ color: "oklch(var(--brand-blue))" }}
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
                ) : (
                  <div
                    className="rounded-2xl p-6 border border-border space-y-5"
                    style={{
                      background: "oklch(0.98 0.008 248 / 0.72)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <h2 className="font-display font-bold text-xl mb-1">
                      Your party
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Online booking for {minOnlineParty}–{maxOnlineParty} guests
                      total. Add-ons apply per paying unit.
                    </p>
                    {matrixHeads > maxOnlineParty ? (
                      <div
                        className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
                        role="status"
                      >
                        Parties above {maxOnlineParty} guests cannot be booked
                        online. Please contact us for a custom quote.
                      </div>
                    ) : null}
                    {matrixHeads > 0 && matrixHeads < minOnlineParty ? (
                      <p className="text-sm text-muted-foreground">
                        Minimum party size for online booking is{" "}
                        {minOnlineParty}.
                      </p>
                    ) : null}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Adults
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          className="mt-1 bg-muted/70 border-border"
                          value={partyAdults}
                          onChange={(e) =>
                            setPartyAdults(
                              Math.max(0, parseInt(e.target.value, 10) || 0),
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          {partyChildLabels.free || "Young children (free)"}
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          className="mt-1 bg-muted/70 border-border"
                          value={partyCUnderFree}
                          onChange={(e) =>
                            setPartyCUnderFree(
                              Math.max(0, parseInt(e.target.value, 10) || 0),
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          {partyChildLabels.half || "Children (½ rate)"}
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          className="mt-1 bg-muted/70 border-border"
                          value={partyCHalf}
                          onChange={(e) =>
                            setPartyCHalf(
                              Math.max(0, parseInt(e.target.value, 10) || 0),
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          {partyChildLabels.full || "Older children (full)"}
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          className="mt-1 bg-muted/70 border-border"
                          value={partyCFull}
                          onChange={(e) =>
                            setPartyCFull(
                              Math.max(0, parseInt(e.target.value, 10) || 0),
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span>
                        <span className="text-muted-foreground">Total guests:</span>{" "}
                        <strong>{matrixHeads}</strong>
                      </span>
                      <span>
                        <span className="text-muted-foreground">Paying units:</span>{" "}
                        <strong>{matrixWeighted}</strong>
                      </span>
                    </div>
                    {partyMatrixActive &&
                    (pkg as TourPackageListing).privatePartyPricing ? (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">
                          Reference: INR per person by party size
                        </h3>
                        <div className="overflow-x-auto rounded-lg border border-border max-h-48 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50 sticky top-0">
                              <tr>
                                <th className="text-left p-2 font-medium">Guests</th>
                                <th className="text-right p-2 font-medium">
                                  / person
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {(
                                (pkg as TourPackageListing).privatePartyPricing ??
                                []
                              ).map((row) => (
                                <tr
                                  key={row.pax}
                                  className={
                                    Number(row.pax) === matrixHeads
                                      ? "bg-[oklch(var(--brand-blue)/0.12)]"
                                      : ""
                                  }
                                >
                                  <td className="p-2">{row.pax}</td>
                                  <td className="p-2 text-right font-medium">
                                    ₹
                                    {Number(
                                      row.pricePerPersonINR,
                                    ).toLocaleString("en-IN")}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {privateTourPlan.length > 0 ? (
                  <div
                    className="rounded-2xl p-6 border border-border"
                    style={{
                      background: "oklch(0.98 0.008 248 / 0.72)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <h2 className="font-display font-bold text-xl mb-4 underline underline-offset-4 decoration-foreground/25">
                      Tour plan
                    </h2>
                    <div className="space-y-2 max-w-3xl">
                      {privateTourPlan.map((day, i) => {
                        const open = openTourDayIndex === i;
                        const header =
                          day.title.trim() ||
                          `Day ${i + 1}`;
                        return (
                          <Collapsible
                            key={`${i}-${header.slice(0, 32)}`}
                            open={open}
                            onOpenChange={(next) =>
                              setOpenTourDayIndex(next ? i : -1)
                            }
                          >
                            <CollapsibleTrigger asChild>
                              <button
                                type="button"
                                className="w-full flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold text-white border border-transparent transition-colors"
                                style={{
                                  background: open
                                    ? "oklch(0.62 0.12 248)"
                                    : "oklch(0.52 0.14 248)",
                                }}
                              >
                                <span className="leading-snug">{header}</span>
                                {open ? (
                                  <ChevronUp className="w-4 h-4 shrink-0 opacity-90" aria-hidden />
                                ) : (
                                  <ChevronDown className="w-4 h-4 shrink-0 opacity-90" aria-hidden />
                                )}
                              </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div
                                className="mt-1 rounded-b-lg border border-t-0 border-border px-4 py-3 text-sm text-muted-foreground leading-relaxed bg-background/80"
                              >
                                {day.description.trim() ? (
                                  <div className="whitespace-pre-wrap">
                                    {day.description}
                                  </div>
                                ) : (
                                  <span className="text-xs italic">
                                    No extra details for this day.
                                  </span>
                                )}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {effectiveAddOns.length > 0 ? (
                  <div
                    className="rounded-2xl p-6 border border-border"
                    style={{
                      background: "oklch(0.98 0.008 248 / 0.72)",
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
                          className={`flex items-center gap-3 rounded-xl p-4 cursor-pointer border transition-all ${
                            selectedAddOns.includes(addOn.id)
                              ? "select-card-warm-selected"
                              : "select-card-warm"
                          }`}
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
                              style={{ color: "oklch(var(--brand-coral))" }}
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
                  className="sticky top-24 rounded-2xl p-6 border border-border"
                  style={{
                    background: "oklch(0.99 0.006 248 / 0.88)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <h2 className="font-display font-bold text-xl mb-6">
                    Summary
                  </h2>
                  {tourMetaLines.length > 0 ? (
                    <div className="mb-6 pb-6 border-b border-border space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Tour information
                      </p>
                      {tourMetaLines.map((row) => {
                        const RowIcon = row.icon;
                        return (
                        <div
                          key={row.label}
                          className="flex gap-3 text-sm items-start"
                        >
                          <RowIcon
                            className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground"
                            aria-hidden
                          />
                          <div>
                            <div className="text-[11px] text-muted-foreground">
                              {row.label}
                            </div>
                            <div className="font-medium">{row.value}</div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  ) : null}
                  {lastMinutePackages.length > 0 ? (
                    <div className="mb-6 pb-6 border-b border-border">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                        Last minute deals
                      </p>
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                        {lastMinutePackages.map((deal) => {
                          const dl = deal as TourPackageListing;
                          const thumb =
                            String(dl.thumbnailUrl ?? "").trim() ||
                            deal.heroImageUrl;
                          const ph = packagePriceHint(deal);
                          return (
                            <button
                              key={String(deal.id)}
                              type="button"
                              className="w-full text-left flex gap-3 rounded-lg border border-border p-2 hover:bg-muted/40 transition-colors"
                              onClick={() => onOpenPackageDetail?.(deal.id)}
                            >
                              <div className="h-14 w-20 shrink-0 rounded-md overflow-hidden bg-muted">
                                <img
                                  src={thumb}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-xs line-clamp-2 leading-snug">
                                  {deal.name}
                                </p>
                                {ph ? (
                                  <p
                                    className="text-[11px] font-semibold mt-1"
                                    style={{
                                      color: "oklch(var(--brand-blue))",
                                    }}
                                  >
                                    {ph}
                                  </p>
                                ) : null}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  <div className="space-y-3 mb-6 text-sm">
                    {partyMatrixActive ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pricing</span>
                          <span>Party-size rates</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total guests</span>
                          <span>{matrixHeads}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Paying units</span>
                          <span>{matrixWeighted}</span>
                        </div>
                        {matrixRow ? (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Base / person</span>
                            <span>
                              ₹{matrixPricePP.toLocaleString("en-IN")}
                            </span>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Option</span>
                          <span>{effectiveTiers[selectedTier]?.label}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Group</span>
                          <span>{groupSize} people</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-bold text-lg">
                        {partyMatrixActive && !matrixBookingOk
                          ? "—"
                          : `₹${grandTotal.toLocaleString("en-IN")}`}
                      </span>
                    </div>
                  </div>
                  <Button
                    className="w-full font-bold"
                    disabled={partyMatrixActive && !matrixBookingOk}
                    onClick={() => setBookingOpen(true)}
                    style={{
                      background: "oklch(var(--brand-blue))",
                      color: "oklch(0.985 0.005 85)",
                    }}
                  >
                    Book now
                  </Button>
                </div>
              </div>
            </div>

            <CatalogBookingCheckoutDialog
              open={bookingOpen}
              onOpenChange={setBookingOpen}
              productTitle={pkg.name}
              categoryLine="Private tour"
              summaryImageUrl={mainGallerySrc}
              dateFromLabel={formatIsoStayLabel(privateBookingDate)}
              guestsLine={`${partyMatrixActive ? matrixHeads : groupSize} guest${
                (partyMatrixActive ? matrixHeads : groupSize) > 1 ? "s" : ""
              }`}
              extraSummaryRows={[
                {
                  label: "Tier",
                  value: effectiveTiers[selectedTier]!.label,
                },
              ]}
              subtotalINR={grandTotal}
              gstPercent={0}
              loading={loading}
              submitDisabled={partyMatrixActive && !matrixBookingOk}
              extraGuestSlots={Math.max(
                0,
                (partyMatrixActive ? matrixHeads : groupSize) - 1,
              )}
              formTop={
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Preferred travel date
                  </Label>
                  <DatePickerField
                    value={privateBookingDate}
                    onChange={setPrivateBookingDate}
                    placeholder="Pick a date"
                    fromDate={travelDateMin}
                    triggerClassName="bg-muted/70 border-border w-full"
                  />
                </div>
              }
              onSubmit={(p) => void handlePrivateBook(p)}
            />
          </>
        )}

        {isFixed && fixedDisplay && (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {(meetingLabel || meetingMapsUrl) ? (
                <div
                  className="rounded-2xl p-6 border border-border"
                  style={{
                    background: "oklch(0.98 0.008 248 / 0.72)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <h2 className="font-display font-bold text-xl mb-3 flex items-center gap-2">
                    <MapPin
                      className="w-5 h-5"
                      style={{ color: "oklch(var(--brand-blue))" }}
                      aria-hidden
                    />
                    Meeting point
                  </h2>
                  {meetingLabel ? (
                    <p className="text-sm text-muted-foreground mb-3">
                      {meetingLabel}
                    </p>
                  ) : null}
                  {meetingMapsUrl ? (
                    <a
                      href={meetingMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-semibold underline"
                      style={{ color: "oklch(var(--brand-blue))" }}
                    >
                      Open in Google Maps
                    </a>
                  ) : null}
                </div>
              ) : null}
              {(fixedDisplay.inclusions.length > 0 ||
                fixedDisplay.exclusions.length > 0) && (
                <div
                  className="rounded-2xl p-6 md:p-8 border border-border"
                  style={{
                    background: "oklch(0.98 0.008 248 / 0.72)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <h2 className="font-display font-bold text-xl md:text-2xl mb-4 underline underline-offset-4 decoration-foreground/25">
                    Included / Exclude
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <ul className="space-y-2 text-sm">
                      {fixedDisplay.inclusions.map((line) => (
                        <li key={line} className="flex gap-2 items-start">
                          <Check
                            className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600"
                            aria-hidden
                          />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                    <ul className="space-y-2 text-sm">
                      {fixedDisplay.exclusions.map((line) => (
                        <li key={line} className="flex gap-2 items-start">
                          <X
                            className="w-4 h-4 shrink-0 mt-0.5 text-red-500"
                            aria-hidden
                          />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {detailAmenities.length > 0 ? (
                <div
                  className="rounded-2xl p-6 md:p-8 border border-border"
                  style={{
                    background: "oklch(0.98 0.008 248 / 0.72)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <h2 className="font-display font-bold text-xl md:text-2xl mb-4 underline underline-offset-4 decoration-foreground/25">
                    Tour amenities
                  </h2>
                  <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                    {detailAmenities.map((a) => (
                      <li
                        key={`${a.icon}-${a.label}`}
                        className="flex gap-2 items-center text-sm"
                      >
                        <AmenityGlyph name={a.icon} />
                        <span>{a.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div
                className="rounded-2xl overflow-hidden border border-border"
                style={{
                  background: "oklch(0.98 0.008 248 / 0.72)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
                    <div>
                      <h2 className="font-display font-bold text-2xl mb-1">
                        Departures
                      </h2>
                      {fixedDisplay.durationLabel || fixedDisplay.duration ? (
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {fixedDisplay.durationLabel || fixedDisplay.duration}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <div
                        className="text-2xl font-black"
                        style={{ color: "oklch(var(--brand-blue))" }}
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
                          <div className="text-sm font-medium">{batch.date}</div>
                          <div className="mt-1">
                            <FixedBatchSeatBadge
                              remaining={batch.seats}
                              total={batch.seatsTotal}
                            />
                          </div>
                        </div>
                        <Button
                          size="sm"
                          disabled={batch.seats === 0}
                          onClick={() => setBookingTarget({ batch })}
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
                          {batch.seats === 0 ? "Sold out" : "Book"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div
                className="sticky top-24 rounded-2xl p-6 border border-border space-y-6"
                style={{
                  background: "oklch(0.99 0.006 248 / 0.88)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <div
                  className="rounded-lg border border-dashed border-border px-3 py-2 text-center text-sm font-medium text-muted-foreground"
                >
                  Booking tour
                </div>
                {tourMetaLines.length > 0 ? (
                  <div>
                    <h3 className="font-display font-bold text-lg mb-3">
                      Tour information
                    </h3>
                    <div className="space-y-3 text-sm">
                      {tourMetaLines.map((row) => {
                        const RowIcon = row.icon;
                        return (
                        <div key={row.label} className="flex gap-3 items-start">
                          <RowIcon
                            className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground"
                            aria-hidden
                          />
                          <div>
                            <div className="text-[11px] text-muted-foreground">
                              {row.label}
                            </div>
                            <div className="font-medium">{row.value}</div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                {lastMinutePackages.length > 0 ? (
                  <div>
                    <h3 className="font-display font-bold text-lg mb-3">
                      Last minute deals
                    </h3>
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {lastMinutePackages.map((deal) => {
                        const dl = deal as TourPackageListing;
                        const thumb =
                          String(dl.thumbnailUrl ?? "").trim() ||
                          deal.heroImageUrl;
                        const ph = packagePriceHint(deal);
                        return (
                          <button
                            key={String(deal.id)}
                            type="button"
                            className="w-full text-left flex gap-3 rounded-xl border border-border p-2 hover:bg-muted/50 transition-colors"
                            onClick={() => onOpenPackageDetail?.(deal.id)}
                          >
                            <div className="h-14 w-20 shrink-0 rounded-lg overflow-hidden bg-muted">
                              <img
                                src={thumb}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-xs line-clamp-2 leading-snug">
                                {deal.name}
                              </p>
                              {ph ? (
                                <p
                                  className="text-[11px] font-semibold mt-1"
                                  style={{
                                    color: "oklch(var(--brand-blue))",
                                  }}
                                >
                                  {ph}
                                </p>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </aside>
          </div>
        )}

        {!isPrivate && !isFixed && (
          <p className="text-muted-foreground">
            This package cannot be booked online yet. Please contact us.
          </p>
        )}
      </div>

      {bookingTarget && fixedDisplay ? (
        <CatalogBookingCheckoutDialog
          open
          onOpenChange={(o) => !o && setBookingTarget(null)}
          productTitle={`${fixedDisplay.name} · ${bookingTarget.batch.date}`}
          categoryLine="Fixed departure tour"
          summaryImageUrl={mainGallerySrc}
          dateFromLabel={bookingTarget.batch.date}
          guestsLine="1 paying guest (per online booking)"
          subtotalINR={fixedClaimedTotal}
          gstPercent={0}
          loading={loading}
          addonSection={
            fixedDisplay.addOns.length > 0 ? (
              <div className="space-y-2 rounded-xl border p-4 select-card-warm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Optional add-ons
                </p>
                {fixedDisplay.addOns.map((addOn) => (
                  <label
                    key={addOn.id}
                    htmlFor={`fx-addon-${addOn.id}`}
                    className="flex items-start gap-3 cursor-pointer text-sm"
                  >
                    <Checkbox
                      id={`fx-addon-${addOn.id}`}
                      checked={selectedFixedAddOns.includes(addOn.id)}
                      onCheckedChange={() => toggleFixedAddOn(addOn.id)}
                    />
                    <span className="flex-1">
                      <span className="font-medium">{addOn.label}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        (+₹{addOn.price.toLocaleString("en-IN")}/person)
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            ) : null
          }
          onSubmit={(p) => void handleFixedBook(p)}
        />
      ) : null}

      <footer className="text-center py-8 mt-16 text-xs text-muted-foreground border-t border-border max-w-7xl mx-auto">
        <Mountain className="w-4 h-4 inline mr-1" />
        Mountain Explorers · © {new Date().getFullYear()}
      </footer>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import CatalogBookingCheckoutDialog from "@/components/CatalogBookingCheckoutDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActor } from "@/hooks/useActor";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Moon,
  Mountain,
  Star,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { CatalogBookingExtras, TourPackage } from "../backend";
import DatePickerField, {
  parseIsoDateLocal,
  toIsoDateLocal,
} from "./DatePickerField";
import {
  firstIsoDateFromTravelField,
  getListingKind,
  isWeekendIsoDate,
  packageForHotelsTab,
  packageForVillasPage,
  parseHotelRating,
  stayFullDescriptionText,
  stayTouchesBookingBlackout,
  villaCatalogPricePerPersonForStay,
  type TourPackageListing,
} from "../utils/catalogListing";
import type { Page } from "../types";

interface Props {
  setPage: (page: Page) => void;
  /** Which tab is selected when the page opens (e.g. nav “Hotels” vs “Farmhouses & Villas”). */
  initialTab?: "hotels" | "villas";
  /** Opens the shared package detail page (admin-backed catalog fields). */
  openCatalogPackageDetail?: (packageId: bigint) => void;
}

const HOTELS = [
  {
    name: "The Himalayan Retreat",
    image:
      "https://images.unsplash.com/photo-1455587734955-081b22074882?w=600&fit=crop",
    location: "Manali, Himachal Pradesh",
    rating: 4.8,
    about: "",
    rooms: [
      { type: "Standard", price: 3500 },
      { type: "Deluxe", price: 5500 },
      { type: "Suite", price: 9000 },
    ],
  },
  {
    name: "The Valley View Resort",
    image:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&fit=crop",
    location: "Shimla, Himachal Pradesh",
    rating: 4.6,
    about: "",
    rooms: [
      { type: "Standard", price: 4000 },
      { type: "Deluxe", price: 6500 },
      { type: "Suite", price: 11000 },
    ],
  },
];

const VILLAS = [
  {
    name: "Pine Forest Villa",
    image:
      "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=600&fit=crop",
    location: "Kasauli, Himachal Pradesh",
    pricePerPerson: 1200,
    weekdayMin: 8,
    weekendMin: 15,
    about: "",
    amenities: ["Private Pool", "BBQ Deck", "Mountain View", "Chef on Request"],
  },
  {
    name: "Riverside Farmhouse",
    image:
      "https://images.unsplash.com/photo-1544124499-58912cbddaad?w=600&fit=crop",
    location: "Rishikesh, Uttarakhand",
    pricePerPerson: 900,
    weekdayMin: 10,
    weekendMin: 20,
    about: "",
    amenities: ["River View", "Bonfire Area", "Organic Garden", "Yoga Space"],
  },
];

function startOfToday(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

function formatIsoStayLabel(iso: string) {
  if (!iso) return undefined;
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function blackoutDayMatcher(blackouts: string[] | undefined) {
  const set = new Set((blackouts ?? []).map((x) => String(x).slice(0, 10)));
  return (d: Date) => set.has(toIsoDateLocal(d));
}

type HotelDisplay = {
  key: string;
  name: string;
  image: string;
  location: string;
  rating: number;
  /** Guest-facing narrative (hotels only in catalog). */
  about: string;
  rooms: {
    type: string;
    price: number;
    tierIndex?: number;
    imageUrl?: string;
  }[];
  catalogPackageId?: bigint;
  bookingBlackoutDates?: string[];
  propertyYoutubeUrl?: string;
  propertyMapsUrl?: string;
};

function tourPackageToHotelDisplay(p: TourPackage): HotelDisplay {
  if (!("private" in p.detail)) {
    throw new Error("Hotel catalog expects private pricing (tiers = room types)");
  }
  const tl = p as TourPackageListing;
  const pr = p.detail.private.pricing;
  const rooms =
    "multi" in pr
      ? pr.multi.tiers.map((t, i) => ({
          type: t.label,
          price: Number(t.pricePerPersonINR),
          tierIndex: i,
          imageUrl: String(tl.hotelRoomTierImageUrls?.[i] ?? "").trim(),
        }))
      : [
          {
            type: "Room",
            price: Number(pr.single.pricePerPersonINR),
            tierIndex: undefined,
            imageUrl: "",
          },
        ];
  const thumb = String(tl.thumbnailUrl ?? "").trim();
  return {
    key: `c-h-${p.id}`,
    catalogPackageId: p.id,
    bookingBlackoutDates: tl.bookingBlackoutDates ?? [],
    propertyYoutubeUrl: String(tl.propertyYoutubeUrl ?? "").trim(),
    propertyMapsUrl: String(tl.propertyMapsUrl ?? "").trim(),
    name: p.name,
    image: thumb || p.heroImageUrl,
    location: p.shortDescription,
    rating: parseHotelRating(tl.longDescription),
    about: stayFullDescriptionText(tl.longDescription),
    rooms,
  };
}

type VillaDisplay = {
  key: string;
  name: string;
  image: string;
  location: string;
  pricePerPerson: number;
  pricePerPersonWeekday: number;
  pricePerPersonWeekend: number;
  weekdayMin: number;
  weekendMin: number;
  /** Long-form copy when set; otherwise amenity chips are used. */
  about: string;
  amenities: string[];
  catalogPackageId?: bigint;
  bookingBlackoutDates?: string[];
  propertyYoutubeUrl?: string;
  propertyMapsUrl?: string;
};

function tourPackageToVillaDisplay(p: TourPackage): VillaDisplay {
  if (!("private" in p.detail)) {
    throw new Error("Villa catalog entry expects private-style pricing");
  }
  const tl = p as TourPackageListing;
  const pc = p.detail.private;
  const pr = pc.pricing;
  const ppp =
    "single" in pr
      ? Number(pr.single.pricePerPersonINR)
      : Number(pr.multi.tiers[0]?.pricePerPersonINR ?? 0);
  const wdEff =
    Number(tl.villaWeekdayPricePerPersonINR ?? 0) > 0
      ? Number(tl.villaWeekdayPricePerPersonINR)
      : ppp;
  const weEff =
    Number(tl.villaWeekendPricePerPersonINR ?? 0) > 0
      ? Number(tl.villaWeekendPricePerPersonINR)
      : ppp;
  const minG = Number(pc.minGroupSize);
  const maxG = Number(pc.maxGroupSize);
  const narrative = stayFullDescriptionText(tl.longDescription);
  const useProse =
    narrative.length > 100 ||
    narrative.includes("\n") ||
    (narrative.includes(".") && narrative.length > 72);
  const raw = String(tl.longDescription ?? "");
  const rawAmenities = raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^\s*rating:\s*[\d.]+/i.test(s));
  const amenities = useProse
    ? []
    : rawAmenities.length > 0
      ? rawAmenities.slice(0, 12)
      : ["Private stay"];
  const img = String(tl.thumbnailUrl ?? "").trim() || p.heroImageUrl;
  return {
    key: `c-${p.id}`,
    name: p.name,
    image: img,
    location: p.shortDescription,
    pricePerPerson: Math.min(wdEff, weEff),
    pricePerPersonWeekday: wdEff,
    pricePerPersonWeekend: weEff,
    weekdayMin: minG,
    weekendMin: maxG > minG ? maxG : minG,
    about: useProse ? narrative : "",
    amenities,
    catalogPackageId: p.id,
    bookingBlackoutDates: tl.bookingBlackoutDates ?? [],
    propertyYoutubeUrl: String(tl.propertyYoutubeUrl ?? "").trim(),
    propertyMapsUrl: String(tl.propertyMapsUrl ?? "").trim(),
  };
}

type BookingTargetHotel = {
  hotel: HotelDisplay;
  roomType: string;
  roomPrice: number;
  tierIndex?: number;
};
type BookingTargetVilla = { row: VillaDisplay };

function isWeekend(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d.getDay() === 0 || d.getDay() === 6;
}

export default function HotelsPage({
  setPage,
  initialTab = "hotels",
  openCatalogPackageDetail,
}: Props) {
  const { actor } = useActor();
  const [accommodationTab, setAccommodationTab] = useState<"hotels" | "villas">(
    initialTab,
  );
  const [villaCatalogPkgs, setVillaCatalogPkgs] = useState<
    TourPackage[] | null
  >(null);
  const [hotelCatalogPkgs, setHotelCatalogPkgs] = useState<
    TourPackage[] | null
  >(null);
  const [hotelBooking, setHotelBooking] = useState<BookingTargetHotel | null>(
    null,
  );
  const [villaBooking, setVillaBooking] = useState<BookingTargetVilla | null>(
    null,
  );
  const [selectedRooms, setSelectedRooms] = useState<
    Record<
      string,
      { type: string; price: number; tierIndex?: number; imageUrl?: string }
    >
  >({});
  const [hotelForm, setHotelForm] = useState({
    checkin: "",
    checkout: "",
    rooms: 1,
  });
  const [villaForm, setVillaForm] = useState({
    checkin: "",
    checkout: "",
    persons: 2,
  });
  const [villaMealIncluded, setVillaMealIncluded] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!villaBooking) setVillaMealIncluded(true);
  }, [villaBooking]);

  useEffect(() => {
    setAccommodationTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!actor) return;
    let cancelled = false;
    actor
      .listCatalog()
      .then((cats) => {
        if (cancelled) return;
        const villas: TourPackage[] = [];
        const hotels: TourPackage[] = [];
        for (const c of cats) {
          for (const p of c.packages) {
            if (packageForVillasPage(p) && "private" in p.detail) {
              villas.push(p);
            }
            if (packageForHotelsTab(p) && "private" in p.detail) {
              hotels.push(p);
            }
          }
        }
        setVillaCatalogPkgs(villas);
        setHotelCatalogPkgs(hotels);
      })
      .catch(() => {
        if (!cancelled) {
          setVillaCatalogPkgs([]);
          setHotelCatalogPkgs([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [actor]);

  const staticHotelRows: HotelDisplay[] = useMemo(
    () =>
      HOTELS.map((h, i) => ({
        key: `s-h-${i}`,
        name: h.name,
        image: h.image,
        location: h.location,
        rating: h.rating,
        about: h.about,
        bookingBlackoutDates: [],
        propertyYoutubeUrl: "",
        propertyMapsUrl: "",
        rooms: h.rooms.map((r) => ({
          type: r.type,
          price: r.price,
          tierIndex: undefined,
          imageUrl: undefined,
        })),
      })),
    [],
  );

  const displayHotelRows = useMemo((): HotelDisplay[] => {
    if (!hotelCatalogPkgs || hotelCatalogPkgs.length === 0) {
      return staticHotelRows;
    }
    const fromCat = hotelCatalogPkgs.map((p) => tourPackageToHotelDisplay(p));
    const catNames = new Set(fromCat.map((r) => r.name));
    const fallback = staticHotelRows.filter((r) => !catNames.has(r.name));
    return [...fromCat, ...fallback];
  }, [hotelCatalogPkgs, staticHotelRows]);

  const staticVillaRows: VillaDisplay[] = useMemo(
    () =>
      VILLAS.map((v, i) => ({
        key: `s-${i}`,
        name: v.name,
        image: v.image,
        location: v.location,
        pricePerPerson: v.pricePerPerson,
        pricePerPersonWeekday: v.pricePerPerson,
        pricePerPersonWeekend: v.pricePerPerson,
        weekdayMin: v.weekdayMin,
        weekendMin: v.weekendMin,
        about: v.about,
        amenities: v.amenities,
        bookingBlackoutDates: [],
        propertyYoutubeUrl: "",
        propertyMapsUrl: "",
      })),
    [],
  );

  const displayVillaRows = useMemo((): VillaDisplay[] => {
    if (!villaCatalogPkgs || villaCatalogPkgs.length === 0) {
      return staticVillaRows;
    }
    const fromCat = villaCatalogPkgs.map((p) => tourPackageToVillaDisplay(p));
    const catNames = new Set(fromCat.map((r) => r.name));
    const fallback = staticVillaRows.filter((r) => !catNames.has(r.name));
    return [...fromCat, ...fallback];
  }, [villaCatalogPkgs, staticVillaRows]);

  const calcNights = (checkin: string, checkout: string) => {
    if (!checkin || !checkout) return 0;
    const diff = new Date(checkout).getTime() - new Date(checkin).getTime();
    return Math.max(0, Math.floor(diff / 86400000));
  };

  const hotelNights = calcNights(hotelForm.checkin, hotelForm.checkout);
  const hotelTotal = hotelBooking
    ? hotelBooking.roomPrice * hotelForm.rooms * Math.max(1, hotelNights)
    : 0;

  const villaNights = calcNights(villaForm.checkin, villaForm.checkout);

  const villaCatalogPkg = useMemo(() => {
    if (!villaBooking?.row.catalogPackageId || !villaCatalogPkgs?.length) {
      return undefined;
    }
    return villaCatalogPkgs.find(
      (p) => p.id === villaBooking.row.catalogPackageId,
    );
  }, [villaBooking, villaCatalogPkgs]);

  const villaTotal = useMemo(() => {
    if (!villaBooking) return 0;
    const nts = Math.max(1, villaNights);
    let ppp = villaBooking.row.pricePerPerson;
    const pkg = villaCatalogPkg;
    if (pkg && getListingKind(pkg) === "villa" && "private" in pkg.detail) {
      const travel = `${villaForm.checkin} → ${villaForm.checkout}`;
      const pr = pkg.detail.private.pricing;
      const tierIdx = "multi" in pr ? 0 : null;
      const live = villaCatalogPricePerPersonForStay(
        pkg,
        travel,
        villaMealIncluded,
        tierIdx,
      );
      if (live > 0) ppp = live;
    } else {
      const iso = firstIsoDateFromTravelField(villaForm.checkin);
      const wknd = iso
        ? isWeekendIsoDate(iso)
        : isWeekend(villaForm.checkin);
      ppp = wknd
        ? villaBooking.row.pricePerPersonWeekend
        : villaBooking.row.pricePerPersonWeekday;
    }
    return ppp * villaForm.persons * nts;
  }, [
    villaBooking,
    villaCatalogPkg,
    villaNights,
    villaForm.persons,
    villaForm.checkin,
    villaForm.checkout,
    villaMealIncluded,
  ]);

  const checkInIso = firstIsoDateFromTravelField(villaForm.checkin);
  const isCheckInWeekend = checkInIso
    ? isWeekendIsoDate(checkInIso)
    : isWeekend(villaForm.checkin);
  const minPersons = villaBooking
    ? isCheckInWeekend
      ? villaBooking.row.weekendMin
      : villaBooking.row.weekdayMin
    : 0;
  const belowMin = villaBooking && villaForm.persons < minPersons;

  const hotelStayPickerOpts = useMemo(() => {
    if (!hotelBooking) return null;
    return {
      today0: startOfToday(),
      disableBl: blackoutDayMatcher(hotelBooking.hotel.bookingBlackoutDates),
      checkinMaxD: (() => {
        const co = parseIsoDateLocal(hotelForm.checkout);
        return co
          ? new Date(co.getFullYear(), co.getMonth(), co.getDate() - 1)
          : undefined;
      })(),
      checkoutMinD: (() => {
        const ci = parseIsoDateLocal(hotelForm.checkin);
        return ci
          ? new Date(ci.getFullYear(), ci.getMonth(), ci.getDate() + 1)
          : undefined;
      })(),
    };
  }, [hotelBooking, hotelForm.checkin, hotelForm.checkout]);

  const villaStayPickerOpts = useMemo(() => {
    if (!villaBooking) return null;
    return {
      today0: startOfToday(),
      disableBl: blackoutDayMatcher(villaBooking.row.bookingBlackoutDates),
      checkinMaxD: (() => {
        const co = parseIsoDateLocal(villaForm.checkout);
        return co
          ? new Date(co.getFullYear(), co.getMonth(), co.getDate() - 1)
          : undefined;
      })(),
      checkoutMinD: (() => {
        const ci = parseIsoDateLocal(villaForm.checkin);
        return ci
          ? new Date(ci.getFullYear(), ci.getMonth(), ci.getDate() + 1)
          : undefined;
      })(),
    };
  }, [villaBooking, villaForm.checkin, villaForm.checkout]);

  const handleHotelBook = async (payload: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  }) => {
    if (!actor) {
      toast.error("Connecting...");
      return;
    }
    if (
      !hotelForm.checkin ||
      !hotelForm.checkout
    ) {
      toast.error("Please select check-in and check-out dates");
      return;
    }
    if (!hotelBooking) return;
    if (
      stayTouchesBookingBlackout(
        hotelForm.checkin,
        hotelForm.checkout,
        hotelBooking.hotel.bookingBlackoutDates,
      )
    ) {
      toast.error("Those dates include a blackout. Please pick other nights.");
      return;
    }
    setLoading(true);
    try {
      const catalogPkg =
        hotelBooking.hotel.catalogPackageId !== undefined
          ? hotelCatalogPkgs?.find(
              (p) => p.id === hotelBooking.hotel.catalogPackageId,
            )
          : undefined;
      if (catalogPkg && "private" in catalogPkg.detail) {
        const pc = catalogPkg.detail.private;
        const tierOpt =
          "multi" in pc.pricing && hotelBooking.tierIndex !== undefined
            ? BigInt(hotelBooking.tierIndex)
            : undefined;
        const travel = `${hotelForm.checkin} → ${hotelForm.checkout}`;
        await actor.createCatalogBooking(
          catalogPkg.id,
          undefined,
          tierOpt,
          travel,
          BigInt(hotelForm.rooms),
          [],
          payload.customerName,
          payload.customerEmail,
          payload.customerPhone,
          BigInt(hotelTotal),
        );
      } else {
        await actor.createBooking(
          "Hotel",
          `${hotelBooking.hotel.name} — ${hotelBooking.roomType}`,
          payload.customerName,
          payload.customerEmail,
          payload.customerPhone,
          hotelForm.checkin,
          BigInt(hotelForm.rooms),
          [],
          BigInt(hotelTotal),
        );
      }
      toast.success("Hotel booking confirmed!");
      setHotelBooking(null);
      setHotelForm({
        checkin: "",
        checkout: "",
        rooms: 1,
      });
    } catch {
      toast.error("Booking failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleVillaBook = async (payload: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  }) => {
    if (!actor) {
      toast.error("Connecting...");
      return;
    }
    if (
      !villaForm.checkin ||
      !villaForm.checkout
    ) {
      toast.error("Please fill all fields");
      return;
    }
    if (!villaBooking) return;
    if (
      stayTouchesBookingBlackout(
        villaForm.checkin,
        villaForm.checkout,
        villaBooking.row.bookingBlackoutDates,
      )
    ) {
      toast.error("Those dates include a blackout. Please pick other nights.");
      return;
    }
    setLoading(true);
    try {
      const { row } = villaBooking;
      const catalogPkg =
        row.catalogPackageId !== undefined
          ? villaCatalogPkgs?.find((p) => p.id === row.catalogPackageId)
          : undefined;
      const extras: CatalogBookingExtras = { villaMealIncluded };
      if (catalogPkg && "private" in catalogPkg.detail) {
        const pc = catalogPkg.detail.private;
        const tierOpt =
          "multi" in pc.pricing ? BigInt(0) : undefined;
        await actor.createCatalogBooking(
          catalogPkg.id,
          undefined,
          tierOpt,
          `${villaForm.checkin} → ${villaForm.checkout}`,
          BigInt(villaForm.persons),
          [],
          payload.customerName,
          payload.customerEmail,
          payload.customerPhone,
          BigInt(villaTotal),
          undefined,
          extras,
        );
      } else {
        await actor.createBooking(
          "Villa/Farmhouse",
          row.name,
          payload.customerName,
          payload.customerEmail,
          payload.customerPhone,
          villaForm.checkin,
          BigInt(villaForm.persons),
          [],
          BigInt(villaTotal),
        );
      }
      toast.success("Villa booking confirmed!");
      setVillaBooking(null);
      setVillaForm({
        checkin: "",
        checkout: "",
        persons: 2,
      });
    } catch {
      toast.error("Booking failed.");
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
            Hotels &{" "}
            <span style={{ color: "oklch(var(--brand-coral))" }}>Villas</span>
          </span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <p
            className="text-sm uppercase tracking-widest mb-3"
            style={{ color: "oklch(var(--brand-blue))" }}
          >
            Rest & Recharge
          </p>
          <h1 className="font-display text-4xl md:text-6xl font-black text-foreground mb-4">
            Hotels &<br />
            <span style={{ color: "oklch(var(--brand-coral))" }}>Villas</span>
          </h1>
        </motion.div>

        <Tabs
          value={accommodationTab}
          onValueChange={(v) =>
            setAccommodationTab(v === "villas" ? "villas" : "hotels")
          }
          data-ocid="hotels.tab"
        >
          <TabsList
            className="mb-8"
            style={{ background: "oklch(0.98 0.009 248)" }}
          >
            <TabsTrigger data-ocid="hotels.hotels.tab" value="hotels">
              Hotels
            </TabsTrigger>
            <TabsTrigger data-ocid="hotels.villas.tab" value="villas">
              Villas & Farmhouses
            </TabsTrigger>
          </TabsList>

          {/* HOTELS TAB */}
          <TabsContent value="hotels">
            <div className="grid gap-8">
              {displayHotelRows.map((hotel, idx) => {
                const sel = selectedRooms[hotel.name];
                return (
                  <motion.div
                    key={hotel.key}
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
                          src={hotel.image}
                          alt={hotel.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h2
                              className={`font-display font-bold text-2xl mb-1 ${
                                hotel.catalogPackageId !== undefined &&
                                openCatalogPackageDetail
                                  ? "cursor-pointer hover:underline decoration-[color:oklch(var(--brand-blue))]"
                                  : ""
                              }`}
                              onClick={() => {
                                if (
                                  hotel.catalogPackageId !== undefined &&
                                  openCatalogPackageDetail
                                ) {
                                  openCatalogPackageDetail(hotel.catalogPackageId);
                                }
                              }}
                            >
                              {hotel.name}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                              {hotel.location}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              <Star
                                className="w-3.5 h-3.5"
                                style={{ color: "oklch(var(--brand-coral))" }}
                              />
                              <span className="text-sm font-medium">
                                {hotel.rating}
                              </span>
                            </div>
                            {hotel.about ? (
                              <p className="text-sm text-muted-foreground leading-relaxed mt-3 whitespace-pre-wrap">
                                {hotel.about}
                              </p>
                            ) : null}
                            {(hotel.propertyMapsUrl || hotel.propertyYoutubeUrl) ? (
                              <div className="flex flex-wrap gap-3 mt-3 text-xs font-semibold">
                                {hotel.propertyMapsUrl ? (
                                  <a
                                    href={hotel.propertyMapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline"
                                    style={{ color: "oklch(var(--brand-blue))" }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Property map
                                  </a>
                                ) : null}
                                {hotel.propertyYoutubeUrl ? (
                                  <a
                                    href={hotel.propertyYoutubeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline"
                                    style={{ color: "oklch(var(--brand-blue))" }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    YouTube
                                  </a>
                                ) : null}
                              </div>
                            ) : null}
                            {hotel.catalogPackageId !== undefined &&
                            openCatalogPackageDetail ? (
                              <button
                                type="button"
                                className="mt-3 text-sm font-semibold underline text-left"
                                style={{ color: "oklch(var(--brand-blue))" }}
                                data-ocid="hotels.hotel.view_details"
                                onClick={() =>
                                  openCatalogPackageDetail(hotel.catalogPackageId!)
                                }
                              >
                                View full details →
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <div className="mb-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                            Select Room Type
                          </p>
                          <div className="flex flex-wrap gap-3">
                            {hotel.rooms.map((room) => (
                              <button
                                key={`${room.type}-${room.tierIndex ?? "x"}`}
                                type="button"
                                data-ocid="hotels.room.toggle"
                                onClick={() =>
                                  setSelectedRooms((prev) => ({
                                    ...prev,
                                    [hotel.name]: {
                                      type: room.type,
                                      price: room.price,
                                      tierIndex: room.tierIndex,
                                      imageUrl: room.imageUrl,
                                    },
                                  }))
                                }
                                className={`rounded-xl px-4 py-3 border text-left transition-all max-w-[11rem] ${
                                  sel?.type === room.type &&
                                  (sel?.tierIndex ?? -1) ===
                                    (room.tierIndex ?? -1)
                                    ? "select-card-warm-selected"
                                    : "select-card-warm"
                                }`}
                                style={{
                                  borderColor:
                                    sel?.type === room.type &&
                                    (sel?.tierIndex ?? -1) ===
                                      (room.tierIndex ?? -1)
                                      ? "oklch(var(--brand-blue) / 0.65)"
                                      : undefined,
                                }}
                              >
                                {room.imageUrl ? (
                                  <img
                                    src={room.imageUrl}
                                    alt=""
                                    className="w-full h-16 object-cover rounded-md mb-2"
                                  />
                                ) : null}
                                <div className="font-medium text-sm">
                                  {room.type}
                                </div>
                                <div
                                  className="text-xs mt-0.5"
                                  style={{ color: "oklch(var(--brand-blue))" }}
                                >
                                  ₹{room.price.toLocaleString("en-IN")}/night
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                        <Button
                          data-ocid="hotels.hotel.primary_button"
                          disabled={!sel}
                          onClick={() =>
                            sel &&
                            setHotelBooking({
                              hotel,
                              roomType: sel.type,
                              roomPrice: sel.price,
                              tierIndex: sel.tierIndex,
                            })
                          }
                          style={{
                            background: sel
                              ? "oklch(var(--brand-blue))"
                              : "oklch(0.26 0.038 228)",
                            color: sel
                              ? "oklch(0.985 0.005 85)"
                              : "oklch(0.52 0.04 228)",
                            fontWeight: 700,
                          }}
                        >
                          Book Now
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>

          {/* VILLAS TAB */}
          <TabsContent value="villas">
            <div className="grid md:grid-cols-2 gap-8">
              {displayVillaRows.map((villa, idx) => (
                <motion.div
                  key={villa.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="rounded-2xl overflow-hidden border border-border"
                  style={{
                    background: "oklch(0.98 0.008 248 / 0.72)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <div className="h-48 relative">
                    <img
                      src={villa.image}
                      alt={villa.name}
                      className="w-full h-full object-cover"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to top, oklch(0.22 0.07 248 / 0.82), transparent)",
                      }}
                    />
                    <div className="absolute bottom-3 left-4">
                      <div
                        className="text-2xl font-black"
                        style={{ color: "oklch(var(--brand-blue))" }}
                      >
                        ₹{villa.pricePerPerson.toLocaleString("en-IN")}
                      </div>
                      {villa.pricePerPersonWeekday !==
                      villa.pricePerPersonWeekend ? (
                        <div className="text-[11px] text-white/85 mt-0.5 max-w-[14rem]">
                          Weekday ₹
                          {villa.pricePerPersonWeekday.toLocaleString("en-IN")}{" "}
                          · Weekend ₹
                          {villa.pricePerPersonWeekend.toLocaleString("en-IN")}
                        </div>
                      ) : null}
                      <div className="text-xs text-white/70">
                        per person / night
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <h2
                      className={`font-display font-bold text-xl mb-1 ${
                        villa.catalogPackageId !== undefined &&
                        openCatalogPackageDetail
                          ? "cursor-pointer hover:underline decoration-[color:oklch(var(--brand-blue))]"
                          : ""
                      }`}
                      onClick={() => {
                        if (
                          villa.catalogPackageId !== undefined &&
                          openCatalogPackageDetail
                        ) {
                          openCatalogPackageDetail(villa.catalogPackageId);
                        }
                      }}
                    >
                      {villa.name}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-3">
                      {villa.location}
                    </p>
                    {(villa.propertyMapsUrl || villa.propertyYoutubeUrl) ? (
                      <div className="flex flex-wrap gap-3 text-xs font-semibold mb-3">
                        {villa.propertyMapsUrl ? (
                          <a
                            href={villa.propertyMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                            style={{ color: "oklch(var(--brand-blue))" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Property map
                          </a>
                        ) : null}
                        {villa.propertyYoutubeUrl ? (
                          <a
                            href={villa.propertyYoutubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                            style={{ color: "oklch(var(--brand-blue))" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            YouTube
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                    {villa.about ? (
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4 whitespace-pre-wrap">
                        {villa.about}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {villa.amenities.map((a) => (
                          <span
                            key={a}
                            className="text-xs px-2 py-1 rounded-full chip-airy"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="rounded-xl p-3 mb-4 text-xs meta-hint-strip">
                      <div className="flex justify-between mb-1">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Users className="w-3 h-3" />
                          Weekday min
                        </span>
                        <span className="font-medium">
                          {villa.weekdayMin} people
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Moon className="w-3 h-3" />
                          Weekend min
                        </span>
                        <span className="font-medium">
                          {villa.weekendMin} people
                        </span>
                      </div>
                    </div>
                    {villa.catalogPackageId !== undefined &&
                    openCatalogPackageDetail ? (
                      <button
                        type="button"
                        className="mb-3 text-sm font-semibold underline text-left w-full"
                        style={{ color: "oklch(var(--brand-blue))" }}
                        data-ocid="hotels.villa.view_details"
                        onClick={() =>
                          openCatalogPackageDetail(villa.catalogPackageId!)
                        }
                      >
                        View full details →
                      </button>
                    ) : null}
                    <Button
                      data-ocid="hotels.villa.primary_button"
                      className="w-full font-bold"
                      onClick={() => setVillaBooking({ row: villa })}
                      style={{
                        background: "oklch(var(--brand-blue))",
                        color: "oklch(0.985 0.005 85)",
                      }}
                    >
                      Book Villa
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Hotel booking checkout */}
      {hotelBooking && hotelStayPickerOpts ? (
        <CatalogBookingCheckoutDialog
          open
          onOpenChange={(o) => !o && setHotelBooking(null)}
          productTitle={`${hotelBooking.hotel.name} — ${hotelBooking.roomType}`}
          categoryLine="Hotel stay"
          summaryImageUrl={hotelBooking.hotel.image}
          dateFromLabel={formatIsoStayLabel(hotelForm.checkin)}
          dateToLabel={formatIsoStayLabel(hotelForm.checkout)}
          guestsLine={`${hotelForm.rooms} room(s)${hotelNights > 0 ? ` · ${hotelNights} night(s)` : ""}`}
          extraSummaryRows={[
            { label: "Location", value: hotelBooking.hotel.location },
          ]}
          subtotalINR={hotelTotal}
          gstPercent={0}
          loading={loading}
          submitDisabled={Boolean(
            hotelForm.checkin &&
              hotelForm.checkout &&
              stayTouchesBookingBlackout(
                hotelForm.checkin,
                hotelForm.checkout,
                hotelBooking.hotel.bookingBlackoutDates,
              ),
          )}
          formTop={
            <>
              <div className="grid grid-cols-2 gap-3">
                <div data-ocid="hotels.hotel.input">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Check-in
                  </Label>
                  <DatePickerField
                    value={hotelForm.checkin}
                    onChange={(v) =>
                      setHotelForm((f) => ({
                        ...f,
                        checkin: v,
                        checkout:
                          f.checkout && v && f.checkout <= v ? "" : f.checkout,
                      }))
                    }
                    placeholder="Check-in"
                    fromDate={hotelStayPickerOpts.today0}
                    toDate={hotelStayPickerOpts.checkinMaxD}
                    disableDate={hotelStayPickerOpts.disableBl}
                    triggerClassName="bg-muted/70 border-border"
                  />
                </div>
                <div data-ocid="hotels.hotel.input">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Check-out
                  </Label>
                  <DatePickerField
                    value={hotelForm.checkout}
                    onChange={(v) =>
                      setHotelForm((f) => ({ ...f, checkout: v }))
                    }
                    placeholder="Check-out"
                    fromDate={hotelStayPickerOpts.checkoutMinD}
                    disableDate={hotelStayPickerOpts.disableBl}
                    triggerClassName="bg-muted/70 border-border"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Number of Rooms
                </Label>
                <Input
                  data-ocid="hotels.hotel.input"
                  type="number"
                  min={1}
                  max={10}
                  value={hotelForm.rooms}
                  onChange={(e) =>
                    setHotelForm((f) => ({
                      ...f,
                      rooms: Math.max(1, Number.parseInt(e.target.value) || 1),
                    }))
                  }
                  className="bg-muted/70 border-border"
                />
              </div>
              {hotelForm.checkin &&
              hotelForm.checkout &&
              stayTouchesBookingBlackout(
                hotelForm.checkin,
                hotelForm.checkout,
                hotelBooking.hotel.bookingBlackoutDates,
              ) ? (
                <div className="flex items-start gap-2 rounded-xl border border-amber-300/90 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-600/50 dark:bg-amber-950/40 dark:text-amber-50">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
                  <span>
                    Selected nights include a blackout for this property.
                  </span>
                </div>
              ) : null}
              {hotelNights > 0 ? (
                <div className="rounded-xl p-3 text-sm meta-hint-strip">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {hotelNights} night{hotelNights > 1 ? "s" : ""} ×{" "}
                      {hotelForm.rooms} room{hotelForm.rooms > 1 ? "s" : ""} × ₹
                      {hotelBooking.roomPrice.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="font-semibold">Stay total</span>
                    <span
                      className="font-bold"
                      style={{ color: "oklch(var(--brand-blue))" }}
                    >
                      ₹{hotelTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              ) : null}
            </>
          }
          onSubmit={(p) => void handleHotelBook(p)}
        />
      ) : null}

      {villaBooking && villaStayPickerOpts ? (
        <CatalogBookingCheckoutDialog
          open
          onOpenChange={(o) => !o && setVillaBooking(null)}
          productTitle={villaBooking.row.name}
          categoryLine="Villa / farmhouse"
          summaryImageUrl={villaBooking.row.image}
          dateFromLabel={formatIsoStayLabel(villaForm.checkin)}
          dateToLabel={formatIsoStayLabel(villaForm.checkout)}
          guestsLine={`${villaForm.persons} person${villaForm.persons > 1 ? "s" : ""}${villaNights > 0 ? ` · ${villaNights} night(s)` : ""}`}
          extraSummaryRows={[
            { label: "Location", value: villaBooking.row.location },
          ]}
          subtotalINR={villaTotal}
          gstPercent={0}
          loading={loading}
          extraGuestSlots={Math.max(0, villaForm.persons - 1)}
          submitDisabled={Boolean(
            villaForm.checkin &&
              villaForm.checkout &&
              stayTouchesBookingBlackout(
                villaForm.checkin,
                villaForm.checkout,
                villaBooking.row.bookingBlackoutDates,
              ),
          )}
          formTop={
            <>
              <div className="grid grid-cols-2 gap-3">
                <div data-ocid="hotels.villa.input">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Check-in
                  </Label>
                  <DatePickerField
                    value={villaForm.checkin}
                    onChange={(v) =>
                      setVillaForm((f) => ({
                        ...f,
                        checkin: v,
                        checkout:
                          f.checkout && v && f.checkout <= v ? "" : f.checkout,
                      }))
                    }
                    placeholder="Check-in"
                    fromDate={villaStayPickerOpts.today0}
                    toDate={villaStayPickerOpts.checkinMaxD}
                    disableDate={villaStayPickerOpts.disableBl}
                    triggerClassName="bg-muted/70 border-border"
                  />
                </div>
                <div data-ocid="hotels.villa.input">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Check-out
                  </Label>
                  <DatePickerField
                    value={villaForm.checkout}
                    onChange={(v) =>
                      setVillaForm((f) => ({ ...f, checkout: v }))
                    }
                    placeholder="Check-out"
                    fromDate={villaStayPickerOpts.checkoutMinD}
                    disableDate={villaStayPickerOpts.disableBl}
                    triggerClassName="bg-muted/70 border-border"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Number of Persons
                </Label>
                <Input
                  data-ocid="hotels.villa.input"
                  type="number"
                  min={1}
                  value={villaForm.persons}
                  onChange={(e) =>
                    setVillaForm((f) => ({
                      ...f,
                      persons: Math.max(
                        1,
                        Number.parseInt(e.target.value) || 1,
                      ),
                    }))
                  }
                  className="bg-muted/70 border-border"
                />
              </div>
              {villaCatalogPkg &&
              getListingKind(villaCatalogPkg) === "villa" ? (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={villaMealIncluded}
                    onCheckedChange={(c) =>
                      setVillaMealIncluded(Boolean(c))
                    }
                  />
                  <span title="Uses published villa meal vs no-meal rates when set on the package">
                    Include meals
                  </span>
                </label>
              ) : null}
              {villaForm.checkin &&
              villaForm.checkout &&
              stayTouchesBookingBlackout(
                villaForm.checkin,
                villaForm.checkout,
                villaBooking.row.bookingBlackoutDates,
              ) ? (
                <div className="flex items-start gap-2 rounded-xl border border-amber-300/90 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-600/50 dark:bg-amber-950/40 dark:text-amber-50">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
                  <span>
                    Selected nights include a blackout for this stay.
                  </span>
                </div>
              ) : null}
              {belowMin ? (
                <div
                  data-ocid="hotels.villa.error_state"
                  className="flex items-start gap-2 rounded-xl border border-amber-300/90 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-600/50 dark:bg-amber-950/40 dark:text-amber-50"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
                  <span>
                    {isCheckInWeekend ? "Weekend" : "Weekday"} stays at this
                    property usually need at least {minPersons} guests. You can
                    still submit — we will confirm availability.
                  </span>
                </div>
              ) : null}
              {villaNights > 0 ? (
                <div className="rounded-xl p-3 text-sm meta-hint-strip">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {villaForm.persons} persons × {villaNights} night
                      {villaNights > 1 ? "s" : ""} × ₹
                      {Math.round(
                        villaTotal /
                          Math.max(
                            1,
                            villaForm.persons * Math.max(1, villaNights),
                          ),
                      ).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="font-semibold">Stay total</span>
                    <span
                      className="font-bold"
                      style={{ color: "oklch(var(--brand-blue))" }}
                    >
                      ₹{villaTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              ) : null}
            </>
          }
          onSubmit={(p) => void handleVillaBook(p)}
        />
      ) : null}

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

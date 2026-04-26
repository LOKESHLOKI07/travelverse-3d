import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { TourPackage } from "../backend";
import {
  packageForHotelsTab,
  packageForVillasPage,
  parseHotelRating,
  stayFullDescriptionText,
  type TourPackageListing,
} from "../utils/catalogListing";
import type { Page } from "../types";

interface Props {
  setPage: (page: Page) => void;
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

type HotelDisplay = {
  key: string;
  name: string;
  image: string;
  location: string;
  rating: number;
  /** Guest-facing narrative (hotels only in catalog). */
  about: string;
  rooms: { type: string; price: number }[];
};

function tourPackageToHotelDisplay(p: TourPackage): HotelDisplay {
  if (!("private" in p.detail)) {
    throw new Error("Hotel catalog expects private pricing (tiers = room types)");
  }
  const pr = p.detail.private.pricing;
  const rooms =
    "multi" in pr
      ? pr.multi.tiers.map((t) => ({
          type: t.label,
          price: Number(t.pricePerPersonINR),
        }))
      : [
          {
            type: "Room",
            price: Number(pr.single.pricePerPersonINR),
          },
        ];
  const tl = p as TourPackageListing;
  const thumb = String(tl.thumbnailUrl ?? "").trim();
  return {
    key: `c-h-${p.id}`,
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
  weekdayMin: number;
  weekendMin: number;
  /** Long-form copy when set; otherwise amenity chips are used. */
  about: string;
  amenities: string[];
  catalogPackageId?: bigint;
};

function tourPackageToVillaDisplay(p: TourPackage): VillaDisplay {
  if (!("private" in p.detail)) {
    throw new Error("Villa catalog entry expects private-style pricing");
  }
  const pc = p.detail.private;
  const pr = pc.pricing;
  const ppp =
    "single" in pr
      ? Number(pr.single.pricePerPersonINR)
      : Number(pr.multi.tiers[0]?.pricePerPersonINR ?? 0);
  const minG = Number(pc.minGroupSize);
  const maxG = Number(pc.maxGroupSize);
  const tl = p as TourPackageListing;
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
    pricePerPerson: ppp,
    weekdayMin: minG,
    weekendMin: maxG > minG ? maxG : minG,
    about: useProse ? narrative : "",
    amenities,
    catalogPackageId: p.id,
  };
}

type BookingTargetHotel = {
  hotel: HotelDisplay;
  roomType: string;
  roomPrice: number;
};
type BookingTargetVilla = { row: VillaDisplay };

function isWeekend(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d.getDay() === 0 || d.getDay() === 6;
}

export default function HotelsPage({ setPage }: Props) {
  const { actor } = useActor();
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
    Record<string, { type: string; price: number }>
  >({});
  const [hotelForm, setHotelForm] = useState({
    name: "",
    email: "",
    phone: "",
    checkin: "",
    checkout: "",
    rooms: 1,
  });
  const [villaForm, setVillaForm] = useState({
    name: "",
    email: "",
    phone: "",
    checkin: "",
    checkout: "",
    persons: 2,
  });
  const [loading, setLoading] = useState(false);

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
        rooms: h.rooms.map((r) => ({ type: r.type, price: r.price })),
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
        weekdayMin: v.weekdayMin,
        weekendMin: v.weekendMin,
        about: v.about,
        amenities: v.amenities,
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
  const villaTotal = villaBooking
    ? villaBooking.row.pricePerPerson *
      villaForm.persons *
      Math.max(1, villaNights)
    : 0;
  const isCheckInWeekend = isWeekend(villaForm.checkin);
  const minPersons = villaBooking
    ? isCheckInWeekend
      ? villaBooking.row.weekendMin
      : villaBooking.row.weekdayMin
    : 0;
  const belowMin = villaBooking && villaForm.persons < minPersons;

  const handleHotelBook = async () => {
    if (!actor) {
      toast.error("Connecting...");
      return;
    }
    if (
      !hotelForm.name ||
      !hotelForm.email ||
      !hotelForm.phone ||
      !hotelForm.checkin ||
      !hotelForm.checkout
    ) {
      toast.error("Please fill all fields");
      return;
    }
    if (!hotelBooking) return;
    setLoading(true);
    try {
      await actor.createBooking(
        "Hotel",
        `${hotelBooking.hotel.name} — ${hotelBooking.roomType}`,
        hotelForm.name,
        hotelForm.email,
        hotelForm.phone,
        hotelForm.checkin,
        BigInt(hotelForm.rooms),
        [],
        BigInt(hotelTotal),
      );
      toast.success("Hotel booking confirmed!");
      setHotelBooking(null);
      setHotelForm({
        name: "",
        email: "",
        phone: "",
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

  const handleVillaBook = async () => {
    if (!actor) {
      toast.error("Connecting...");
      return;
    }
    if (
      !villaForm.name ||
      !villaForm.email ||
      !villaForm.phone ||
      !villaForm.checkin ||
      !villaForm.checkout
    ) {
      toast.error("Please fill all fields");
      return;
    }
    if (!villaBooking) return;
    setLoading(true);
    try {
      const { row } = villaBooking;
      const catalogPkg =
        row.catalogPackageId !== undefined
          ? villaCatalogPkgs?.find((p) => p.id === row.catalogPackageId)
          : undefined;
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
          villaForm.name,
          villaForm.email,
          villaForm.phone,
          BigInt(villaTotal),
        );
      } else {
        await actor.createBooking(
          "Villa/Farmhouse",
          row.name,
          villaForm.name,
          villaForm.email,
          villaForm.phone,
          villaForm.checkin,
          BigInt(villaForm.persons),
          [],
          BigInt(villaTotal),
        );
      }
      toast.success("Villa booking confirmed!");
      setVillaBooking(null);
      setVillaForm({
        name: "",
        email: "",
        phone: "",
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

        <Tabs defaultValue="hotels" data-ocid="hotels.tab">
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
                            <h2 className="font-display font-bold text-2xl mb-1">
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
                          </div>
                        </div>
                        <div className="mb-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                            Select Room Type
                          </p>
                          <div className="flex flex-wrap gap-3">
                            {hotel.rooms.map((room) => (
                              <button
                                key={room.type}
                                type="button"
                                data-ocid="hotels.room.toggle"
                                onClick={() =>
                                  setSelectedRooms((prev) => ({
                                    ...prev,
                                    [hotel.name]: {
                                      type: room.type,
                                      price: room.price,
                                    },
                                  }))
                                }
                                className="rounded-xl px-4 py-3 border text-left transition-all"
                                style={{
                                  borderColor:
                                    sel?.type === room.type
                                      ? "oklch(var(--brand-blue) / 0.7)"
                                      : "oklch(0.26 0.04 228 / 0.5)",
                                  background:
                                    sel?.type === room.type
                                      ? "oklch(0.16 0.04 192 / 0.3)"
                                      : "oklch(0.15 0.04 228)",
                                }}
                              >
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
                      <div className="text-xs text-white/70">
                        per person / night
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <h2 className="font-display font-bold text-xl mb-1">
                      {villa.name}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-3">
                      {villa.location}
                    </p>
                    {villa.about ? (
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4 whitespace-pre-wrap">
                        {villa.about}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {villa.amenities.map((a) => (
                          <span
                            key={a}
                            className="text-xs px-2 py-1 rounded-full"
                            style={{
                              background: "oklch(0.22 0.04 228)",
                              color: "oklch(0.74 0.04 228)",
                            }}
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                    <div
                      className="rounded-xl p-3 mb-4 text-xs"
                      style={{ background: "oklch(0.15 0.04 228)" }}
                    >
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

      {/* Hotel Booking Dialog */}
      <Dialog
        open={!!hotelBooking}
        onOpenChange={(o) => !o && setHotelBooking(null)}
      >
        <DialogContent
          data-ocid="hotels.hotel.dialog"
          className="sm:max-w-md"
          style={{
            background: "oklch(0.99 0.006 248)",
            border: "1px solid oklch(0.88 0.02 248 / 0.6)",
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              {hotelBooking?.hotel.name} —{" "}
              <span style={{ color: "oklch(var(--brand-blue))" }}>
                {hotelBooking?.roomType}
              </span>
            </DialogTitle>
          </DialogHeader>
          {hotelBooking && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Check-in
                  </Label>
                  <Input
                    data-ocid="hotels.hotel.input"
                    type="date"
                    value={hotelForm.checkin}
                    onChange={(e) =>
                      setHotelForm((f) => ({ ...f, checkin: e.target.value }))
                    }
                    className="bg-muted/70 border-border"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Check-out
                  </Label>
                  <Input
                    data-ocid="hotels.hotel.input"
                    type="date"
                    value={hotelForm.checkout}
                    onChange={(e) =>
                      setHotelForm((f) => ({ ...f, checkout: e.target.value }))
                    }
                    className="bg-muted/70 border-border"
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
              {hotelNights > 0 && (
                <div
                  className="rounded-xl p-3 text-sm"
                  style={{ background: "oklch(0.13 0.036 228)" }}
                >
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {hotelNights} night{hotelNights > 1 ? "s" : ""} ×{" "}
                      {hotelForm.rooms} room{hotelForm.rooms > 1 ? "s" : ""} × ₹
                      {hotelBooking.roomPrice.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="font-semibold">Total</span>
                    <span
                      className="font-bold"
                      style={{ color: "oklch(var(--brand-blue))" }}
                    >
                      ₹{hotelTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Full Name
                  </Label>
                  <Input
                    data-ocid="hotels.hotel.input"
                    placeholder="Ravi Kumar"
                    value={hotelForm.name}
                    onChange={(e) =>
                      setHotelForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="bg-muted/70 border-border"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Email
                  </Label>
                  <Input
                    data-ocid="hotels.hotel.input"
                    type="email"
                    placeholder="ravi@email.com"
                    value={hotelForm.email}
                    onChange={(e) =>
                      setHotelForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className="bg-muted/70 border-border"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Phone
                  </Label>
                  <Input
                    data-ocid="hotels.hotel.input"
                    placeholder="+91 9876543210"
                    value={hotelForm.phone}
                    onChange={(e) =>
                      setHotelForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    className="bg-muted/70 border-border"
                  />
                </div>
              </div>
              <Button
                data-ocid="hotels.hotel.submit_button"
                onClick={handleHotelBook}
                disabled={loading}
                className="w-full font-bold"
                style={{
                  background: "oklch(var(--brand-blue))",
                  color: "oklch(0.985 0.005 85)",
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

      {/* Villa Booking Dialog */}
      <Dialog
        open={!!villaBooking}
        onOpenChange={(o) => !o && setVillaBooking(null)}
      >
        <DialogContent
          data-ocid="hotels.villa.dialog"
          className="sm:max-w-md"
          style={{
            background: "oklch(0.99 0.006 248)",
            border: "1px solid oklch(0.88 0.02 248 / 0.6)",
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              <span style={{ color: "oklch(var(--brand-blue))" }}>
                {villaBooking?.row.name}
              </span>
            </DialogTitle>
          </DialogHeader>
          {villaBooking && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Check-in
                  </Label>
                  <Input
                    data-ocid="hotels.villa.input"
                    type="date"
                    value={villaForm.checkin}
                    onChange={(e) =>
                      setVillaForm((f) => ({ ...f, checkin: e.target.value }))
                    }
                    className="bg-muted/70 border-border"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Check-out
                  </Label>
                  <Input
                    data-ocid="hotels.villa.input"
                    type="date"
                    value={villaForm.checkout}
                    onChange={(e) =>
                      setVillaForm((f) => ({ ...f, checkout: e.target.value }))
                    }
                    className="bg-muted/70 border-border"
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
              {belowMin && (
                <div
                  data-ocid="hotels.villa.error_state"
                  className="flex items-start gap-2 rounded-xl p-3 text-sm"
                  style={{
                    background: "oklch(0.18 0.06 55 / 0.3)",
                    border: "1px solid oklch(0.55 0.11 36 / 0.4)",
                  }}
                >
                  <AlertTriangle
                    className="w-4 h-4 mt-0.5 shrink-0"
                    style={{ color: "oklch(var(--brand-coral))" }}
                  />
                  <span style={{ color: "oklch(0.8 0.1 55)" }}>
                    {isCheckInWeekend ? "Weekend" : "Weekday"} minimum is{" "}
                    {minPersons} people. You can still book, but please confirm
                    with our team.
                  </span>
                </div>
              )}
              {villaNights > 0 && (
                <div
                  className="rounded-xl p-3 text-sm"
                  style={{ background: "oklch(0.13 0.036 228)" }}
                >
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {villaForm.persons} persons × {villaNights} night
                      {villaNights > 1 ? "s" : ""} × ₹
                      {villaBooking.row.pricePerPerson.toLocaleString(
                        "en-IN",
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="font-semibold">Total</span>
                    <span
                      className="font-bold"
                      style={{ color: "oklch(var(--brand-blue))" }}
                    >
                      ₹{villaTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Full Name
                  </Label>
                  <Input
                    data-ocid="hotels.villa.input"
                    placeholder="Ravi Kumar"
                    value={villaForm.name}
                    onChange={(e) =>
                      setVillaForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="bg-muted/70 border-border"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Email
                  </Label>
                  <Input
                    data-ocid="hotels.villa.input"
                    type="email"
                    placeholder="ravi@email.com"
                    value={villaForm.email}
                    onChange={(e) =>
                      setVillaForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className="bg-muted/70 border-border"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Phone
                  </Label>
                  <Input
                    data-ocid="hotels.villa.input"
                    placeholder="+91 9876543210"
                    value={villaForm.phone}
                    onChange={(e) =>
                      setVillaForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    className="bg-muted/70 border-border"
                  />
                </div>
              </div>
              <Button
                data-ocid="hotels.villa.submit_button"
                onClick={handleVillaBook}
                disabled={loading}
                className="w-full font-bold"
                style={{
                  background: "oklch(var(--brand-blue))",
                  color: "oklch(0.985 0.005 85)",
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

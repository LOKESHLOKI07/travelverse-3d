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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getActorQueryOptions,
  useActor,
} from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useQueryClient } from "@tanstack/react-query";
import { Principal } from "@icp-sdk/core/principal";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { backendInterface, CategoryView, TourPackage } from "../backend";
import { getStaticDemoCatalogViews } from "../data/staticDemoCatalog";
import { viteEnvIsTrue } from "../utils/viteEnv";
import { debugCatalogClient } from "../utils/catalogDebug";
import { uploadCatalogImage } from "../utils/catalogImageUpload";
import {
  AMENITY_ICON_KEYS,
  type ListingKind,
  getListingKind,
  listingKindFromCategoryName,
  isPrivatePartyMatrixConfigured,
  itineraryPlansFromTourPackage,
  type TourPackageListing,
} from "../utils/catalogListing";

type DetailKind = "private" | "fixed";
type PricingKind = "single" | "multi";

type TierRow = { rowKey: string; label: string; price: string };
type BatchRow = {
  rowKey: string;
  batchId?: string;
  date: string;
  total: string;
  remaining: string;
};
type AddOnRow = { rowKey: string; id: string; label: string; price: string };
type ItineraryDayRow = { rowKey: string; title: string; description: string };
type GalleryUrlRow = { rowKey: string; url: string };
type AmenityRow = { rowKey: string; icon: string; label: string };

const SEASON_MONTH_OPTIONS: { value: string; label: string }[] = [
  { value: "0", label: "—" },
  { value: "1", label: "Jan" },
  { value: "2", label: "Feb" },
  { value: "3", label: "Mar" },
  { value: "4", label: "Apr" },
  { value: "5", label: "May" },
  { value: "6", label: "Jun" },
  { value: "7", label: "Jul" },
  { value: "8", label: "Aug" },
  { value: "9", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

function newRowKey(): string {
  return globalThis.crypto.randomUUID();
}

function toastCatalogMutationError(action: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (
    lower.includes("unauthorized") ||
    lower.includes("403") ||
    lower.includes("forbidden")
  ) {
    toast.error(
      `${action}: admin access denied. With the Node dev API, open /admin, sign in (dev user admin / admin), and ensure VITE_APP_ADMIN_TOKEN matches APP_ADMIN_TOKEN (default dev-admin).`,
    );
    return;
  }
  toast.error(`${action}: ${msg}`);
}

export default function AdminCatalogPanel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();

  const heroFileRef = useRef<HTMLInputElement>(null);
  const thumbFileRef = useRef<HTMLInputElement>(null);
  const galleryFileRef = useRef<HTMLInputElement>(null);
  const pendingGalleryRowKeyRef = useRef<string | null>(null);
  const [uploadingHeroImg, setUploadingHeroImg] = useState(false);
  const [uploadingThumbImg, setUploadingThumbImg] = useState(false);
  const [uploadingGalleryRowKey, setUploadingGalleryRowKey] = useState<
    string | null
  >(null);

  const handleCatalogImageUpload = useCallback(
    async (
      file: File | undefined,
      setUrl: (s: string) => void,
      setBusy: (b: boolean) => void,
    ) => {
      if (!file) return;
      setBusy(true);
      try {
        const getPrincipalText = () =>
          identity?.getPrincipal()?.toText() ??
          Principal.anonymous().toText();
        const url = await uploadCatalogImage(file, getPrincipalText);
        if (debugCatalogClient()) {
          console.log(
            "[tourist-debug][admin] image field set from upload (save package to persist):",
            url,
          );
        }
        setUrl(url);
        toast.success("Image uploaded");
      } catch (e) {
        toastCatalogMutationError("Upload image", e);
      } finally {
        setBusy(false);
      }
    },
    [identity],
  );

  /** Backend handle for mutations when React Query has not committed `actor` yet. */
  const resolveActor =
    useCallback(async (): Promise<backendInterface | null> => {
      if (actor) return actor;
      try {
        return await queryClient.fetchQuery(getActorQueryOptions(identity));
      } catch {
        return null;
      }
    }, [actor, identity, queryClient]);

  /** Start with bundled demo rows so the panel is never empty if the API is down. */
  const [views, setViews] = useState<CategoryView[]>(() =>
    getStaticDemoCatalogViews(),
  );
  const [loading, setLoading] = useState(false);
  const [seedingCatalog, setSeedingCatalog] = useState(false);

  const load = useCallback(async () => {
    const applyStatic = () => {
      setViews(getStaticDemoCatalogViews());
    };
    const backend = await resolveActor();
    if (!backend) {
      applyStatic();
      return;
    }
    setLoading(true);
    try {
      const v = await backend.listCatalog();
      const rows = (v ?? []) as CategoryView[];
      if (rows.length === 0) {
        applyStatic();
      } else {
        setViews(rows);
      }
    } catch {
      toast.error(
        "Catalog API unreachable — showing bundled sample data until Refresh works.",
      );
      applyStatic();
    } finally {
      setLoading(false);
    }
  }, [resolveActor]);

  useEffect(() => {
    load();
  }, [load]);

  const flatPackages = useMemo(() => {
    const rows: { pkg: TourPackage; categoryName: string }[] = [];
    for (const v of views) {
      for (const p of v.packages) {
        rows.push({ pkg: p, categoryName: v.category.name });
      }
    }
    return rows;
  }, [views]);

  // --- Category form ---
  const [catId, setCatId] = useState<bigint | undefined>(undefined);
  const [catName, setCatName] = useState("");
  const [catSort, setCatSort] = useState("1");
  const [catActive, setCatActive] = useState(true);

  const resetCatForm = () => {
    setCatId(undefined);
    setCatName("");
    setCatSort("1");
    setCatActive(true);
  };

  const saveCategory = async () => {
    if (!catName.trim()) {
      toast.error("Enter a category name");
      return;
    }
    const backend = await resolveActor();
    if (!backend) {
      toast.error(
        "Not connected to the catalog backend — wait a few seconds or refresh the page.",
      );
      return;
    }
    try {
      const idArg =
        catId !== undefined ? BigInt(String(catId)) : undefined;
      await backend.adminUpsertCategory(
        idArg,
        catName.trim(),
        BigInt(catSort || "1"),
        catActive,
      );
      toast.success(catId ? "Category updated" : "Category created");
      resetCatForm();
      await load();
    } catch (e) {
      toastCatalogMutationError("Save category", e);
    }
  };

  const deleteCategory = async (id: bigint | number | string) => {
    if (!confirm("Delete this category? Packages still pointing at it may break."))
      return;
    const backend = await resolveActor();
    if (!backend) {
      toast.error("Not connected — refresh the page or check your login.");
      return;
    }
    try {
      await backend.adminDeleteCategory(BigInt(String(id)));
      toast.success("Category deleted");
      await load();
    } catch (e) {
      toastCatalogMutationError("Delete category", e);
    }
  };

  // --- Package dialog ---
  const [dlgOpen, setDlgOpen] = useState(false);
  const [pkgId, setPkgId] = useState<bigint>(0n);
  const [pkgCatId, setPkgCatId] = useState("");
  const [pkgName, setPkgName] = useState("");
  const [pkgDesc, setPkgDesc] = useState("");
  const [pkgImg, setPkgImg] = useState("");
  const [pkgThumbnail, setPkgThumbnail] = useState("");
  /** Full narrative: hotels, villas & farm stays only (Node catalog). */
  const [pkgLongDesc, setPkgLongDesc] = useState("");
  /** Trek card accent line, e.g. difficultyColor:oklch(...). */
  const [trekListingMeta, setTrekListingMeta] = useState("");
  const [pkgActive, setPkgActive] = useState(true);
  /** Where the package appears in the main nav (Private / Fixed / Villas). */
  const [listingKind, setListingKind] = useState<ListingKind>("private");
  const [priceKind, setPriceKind] = useState<PricingKind>("multi");
  const [minG, setMinG] = useState("1");
  const [maxG, setMaxG] = useState("20");
  const [singlePrice, setSinglePrice] = useState("15000");
  const [tiers, setTiers] = useState<TierRow[]>([
    { rowKey: newRowKey(), label: "Standard", price: "15000" },
    { rowKey: newRowKey(), label: "Deluxe", price: "22000" },
    { rowKey: newRowKey(), label: "Super Deluxe", price: "31000" },
  ]);
  const [addOns, setAddOns] = useState<AddOnRow[]>([
    { rowKey: newRowKey(), id: "1", label: "River Rafting", price: "800" },
    { rowKey: newRowKey(), id: "2", label: "Paragliding", price: "2500" },
  ]);
  const [fixedPrice, setFixedPrice] = useState("12500");
  const [fixedInclusions, setFixedInclusions] = useState("");
  const [batches, setBatches] = useState<BatchRow[]>([
    { rowKey: newRowKey(), date: "", total: "10", remaining: "10" },
  ]);
  const [itineraryDays, setItineraryDays] = useState<ItineraryDayRow[]>([
    { rowKey: newRowKey(), title: "", description: "" },
  ]);
  /** Extra detail-page photos (Node catalog); hero/thumbnail are always shown first on the site. */
  const [galleryRows, setGalleryRows] = useState<GalleryUrlRow[]>([]);
  /** Package ids (strings) shown as “Related” on the public detail page. */
  const [relatedSelectedIds, setRelatedSelectedIds] = useState<string[]>([]);
  /** Detail page (Node): long overview, duration/type line, incl/excl, amenities, sidebar, deals. */
  const [pkgDetailOverview, setPkgDetailOverview] = useState("");
  const [pkgDurationLabel, setPkgDurationLabel] = useState("");
  const [pkgTourTypeLabel, setPkgTourTypeLabel] = useState("");
  const [pkgPackageInclusions, setPkgPackageInclusions] = useState("");
  const [pkgPackageExclusions, setPkgPackageExclusions] = useState("");
  const [amenityRows, setAmenityRows] = useState<AmenityRow[]>([]);
  const [pkgTourMinAge, setPkgTourMinAge] = useState("");
  const [pkgTourMaxGuestsDisplay, setPkgTourMaxGuestsDisplay] = useState("");
  const [pkgTourLocation, setPkgTourLocation] = useState("");
  const [pkgTourLanguages, setPkgTourLanguages] = useState("");
  const [lastMinuteDealIds, setLastMinuteDealIds] = useState<string[]>([]);
  const [savingPkg, setSavingPkg] = useState(false);
  /** Node + listingKind private: optional season, meeting, per-pax 2–12 matrix. */
  const [seasonStartMonth, setSeasonStartMonth] = useState("0");
  const [seasonEndMonth, setSeasonEndMonth] = useState("0");
  const [meetingPointLabel, setMeetingPointLabel] = useState("");
  const [meetingPointMapsUrl, setMeetingPointMapsUrl] = useState("");
  const [usePrivatePartyMatrix, setUsePrivatePartyMatrix] = useState(false);
  const [partyMinOnline, setPartyMinOnline] = useState("2");
  const [partyMaxOnline, setPartyMaxOnline] = useState("12");
  const [partyMatrixPrices, setPartyMatrixPrices] = useState<string[]>(() =>
    Array.from({ length: 11 }, () => ""),
  );
  const [childFreeMaxAge, setChildFreeMaxAge] = useState("5");
  const [childHalfMaxAge, setChildHalfMaxAge] = useState("10");
  const [childFullMinAge, setChildFullMinAge] = useState("11");
  const [hideItineraryOnDetail, setHideItineraryOnDetail] = useState(false);
  const [bookingBlackoutText, setBookingBlackoutText] = useState("");
  const [propertyYoutubeUrl, setPropertyYoutubeUrl] = useState("");
  const [propertyMapsUrl, setPropertyMapsUrl] = useState("");
  const [villaWeekdayPrice, setVillaWeekdayPrice] = useState("");
  const [villaWeekendPrice, setVillaWeekendPrice] = useState("");
  const [villaWeekdayMax, setVillaWeekdayMax] = useState("");
  const [villaWeekendMax, setVillaWeekendMax] = useState("");
  const [villaNoMealWeekday, setVillaNoMealWeekday] = useState("");
  const [villaNoMealWeekend, setVillaNoMealWeekend] = useState("");
  const [hotelTierImageUrls, setHotelTierImageUrls] = useState<string[]>([]);

  useEffect(() => {
    if (listingKind !== "hotel" || priceKind !== "multi") return;
    setHotelTierImageUrls((prev) =>
      tiers.map((_, i) => (prev[i] ?? "").trim()),
    );
  }, [listingKind, priceKind, tiers.length]);

  const openNewPackage = () => {
    setPkgId(0n);
    setPkgCatId(views[0] ? String(views[0].category.id) : "");
    setPkgName("");
    setPkgDesc("");
    setPkgImg("");
    setPkgThumbnail("");
    setPkgLongDesc("");
    setPkgActive(true);
    setListingKind(
      views[0]
        ? listingKindFromCategoryName(views[0].category.name)
        : "private",
    );
    setPriceKind("multi");
    setMinG("1");
    setMaxG("20");
    setSinglePrice("15000");
    setTiers([
      { rowKey: newRowKey(), label: "Standard", price: "15000" },
      { rowKey: newRowKey(), label: "Deluxe", price: "22000" },
    ]);
    setAddOns([
      { rowKey: newRowKey(), id: "1", label: "Add-on", price: "500" },
    ]);
    setFixedPrice("12500");
    setFixedInclusions("");
    setPkgLongDesc("");
    setTrekListingMeta("");
    setItineraryDays([{ rowKey: newRowKey(), title: "", description: "" }]);
    setBatches([{ rowKey: newRowKey(), date: "", total: "8", remaining: "8" }]);
    setGalleryRows([]);
    setRelatedSelectedIds([]);
    setPkgDetailOverview("");
    setPkgDurationLabel("");
    setPkgTourTypeLabel("");
    setPkgPackageInclusions("");
    setPkgPackageExclusions("");
    setAmenityRows([]);
    setPkgTourMinAge("");
    setPkgTourMaxGuestsDisplay("");
    setPkgTourLocation("");
    setPkgTourLanguages("");
    setLastMinuteDealIds([]);
    setSeasonStartMonth("0");
    setSeasonEndMonth("0");
    setMeetingPointLabel("");
    setMeetingPointMapsUrl("");
    setUsePrivatePartyMatrix(false);
    setPartyMinOnline("2");
    setPartyMaxOnline("12");
    setPartyMatrixPrices(Array.from({ length: 11 }, () => ""));
    setChildFreeMaxAge("5");
    setChildHalfMaxAge("10");
    setChildFullMinAge("11");
    setHideItineraryOnDetail(false);
    setBookingBlackoutText("");
    setPropertyYoutubeUrl("");
    setPropertyMapsUrl("");
    setVillaWeekdayPrice("");
    setVillaWeekendPrice("");
    setVillaWeekdayMax("");
    setVillaWeekendMax("");
    setVillaNoMealWeekday("");
    setVillaNoMealWeekend("");
    setHotelTierImageUrls([]);
    setDlgOpen(true);
  };

  /** JSON catalog uses number ids; static demo uses bigint — compare coerced. */
  function packageIdsEqual(a: unknown, b: unknown): boolean {
    try {
      return BigInt(String(a)) === BigInt(String(b));
    } catch {
      return false;
    }
  }

  const findPackageInViews = (packageId: bigint | number | string): TourPackage | null => {
    for (const v of views) {
      const f = v.packages.find((p) => packageIdsEqual(p.id, packageId));
      if (f) return f;
    }
    return null;
  };

  const openEditPackage = async (id: bigint | number | string) => {
    const pid = BigInt(String(id));
    try {
      let tp: TourPackage | null = null;
      const backend = await resolveActor();
      if (backend) {
        try {
          const p = await backend.getPackage(pid);
          if (p && typeof p === "object") tp = p as TourPackage;
        } catch {
          /* fall through to table lookup */
        }
      }
      if (!tp) tp = findPackageInViews(pid);
      if (!tp) {
        toast.error(
          backend
            ? "Package not found"
            : "Still connecting — wait a moment, or refresh if this persists.",
        );
        return;
      }
      setPkgId(BigInt(String(tp.id)));
      setPkgCatId(String(tp.categoryId));
      setPkgName(tp.name);
      setPkgDesc(tp.shortDescription);
      setPkgImg(tp.heroImageUrl);
      const tl = tp as TourPackageListing;
      setPkgThumbnail(String(tl.thumbnailUrl ?? ""));
      setPkgActive(tp.active);
      const catRow = views.find(
        (v) => String(v.category.id) === String(tp.categoryId),
      );
      const lk = catRow
        ? listingKindFromCategoryName(catRow.category.name)
        : getListingKind(tp);
      setListingKind(lk);
      setPkgLongDesc(
        lk === "hotel" || lk === "villa" ? (tl.longDescription ?? "") : "",
      );
      setTrekListingMeta(lk === "trek" ? (tl.longDescription ?? "") : "");
      const extraGallery = (tl.galleryImageUrls ?? [])
        .map((u) => String(u ?? "").trim())
        .filter(Boolean);
      setGalleryRows(
        extraGallery.map((url) => ({ rowKey: newRowKey(), url })),
      );
      const rel = tl.relatedPackageIds ?? [];
      setRelatedSelectedIds(
        rel
          .map((x) => {
            try {
              return String(BigInt(String(x)));
            } catch {
              return "";
            }
          })
          .filter(Boolean),
      );
      setPkgDetailOverview(String(tl.detailOverview ?? ""));
      setPkgDurationLabel(String(tl.durationLabel ?? ""));
      setPkgTourTypeLabel(String(tl.tourTypeLabel ?? ""));
      setPkgPackageInclusions((tl.packageInclusions ?? []).join("\n"));
      setPkgPackageExclusions((tl.packageExclusions ?? []).join("\n"));
      const am = tl.amenities ?? [];
      setAmenityRows(
        am.length > 0
          ? am.map((a) => ({
              rowKey: newRowKey(),
              icon: String(a.icon ?? "bed").toLowerCase(),
              label: String(a.label ?? ""),
            }))
          : [],
      );
      setPkgTourMinAge(String(tl.tourMinAge ?? ""));
      setPkgTourMaxGuestsDisplay(String(tl.tourMaxGuestsDisplay ?? ""));
      setPkgTourLocation(String(tl.tourLocation ?? ""));
      setPkgTourLanguages(String(tl.tourLanguages ?? ""));
      const deals = tl.lastMinuteDealPackageIds ?? [];
      setLastMinuteDealIds(
        deals
          .map((x) => {
            try {
              return String(BigInt(String(x)));
            } catch {
              return "";
            }
          })
          .filter(Boolean),
      );
      if (lk === "private") {
        setSeasonStartMonth(String(tl.seasonStartMonth ?? 0));
        setSeasonEndMonth(String(tl.seasonEndMonth ?? 0));
        setUsePrivatePartyMatrix(isPrivatePartyMatrixConfigured(tp));
        setPartyMinOnline(String(tl.minOnlinePartySize ?? 2));
        setPartyMaxOnline(String(tl.maxOnlinePartySize ?? 12));
        setChildFreeMaxAge(String(tl.childFreeMaxAge ?? 5));
        setChildHalfMaxAge(String(tl.childHalfMaxAge ?? 10));
        setChildFullMinAge(String(tl.childFullMinAge ?? 11));
        const nextPrices = Array.from({ length: 11 }, () => "");
        for (const row of tl.privatePartyPricing ?? []) {
          const p = Number(row.pax);
          if (p >= 2 && p <= 12) nextPrices[p - 2] = String(row.pricePerPersonINR ?? "");
        }
        setPartyMatrixPrices(nextPrices);
      } else {
        setSeasonStartMonth("0");
        setSeasonEndMonth("0");
        setUsePrivatePartyMatrix(false);
        setPartyMinOnline("2");
        setPartyMaxOnline("12");
        setPartyMatrixPrices(Array.from({ length: 11 }, () => ""));
        setChildFreeMaxAge("5");
        setChildHalfMaxAge("10");
        setChildFullMinAge("11");
      }
      if (lk === "private" || lk === "trek" || lk === "fixed") {
        setMeetingPointLabel(String(tl.meetingPointLabel ?? ""));
        setMeetingPointMapsUrl(String(tl.meetingPointMapsUrl ?? ""));
      } else {
        setMeetingPointLabel("");
        setMeetingPointMapsUrl("");
      }
      if ("private" in tp.detail) {
        setFixedPrice("12500");
        setFixedInclusions("");
        setBatches([
          { rowKey: newRowKey(), date: "", total: "8", remaining: "8" },
        ]);
        const pr = tp.detail.private.pricing;
        if ("multi" in pr) {
          setPriceKind("multi");
          setTiers(
            pr.multi.tiers.map((t) => ({
              rowKey: newRowKey(),
              label: t.label,
              price: String(t.pricePerPersonINR),
            })),
          );
        } else {
          setPriceKind("single");
          setSinglePrice(String(pr.single.pricePerPersonINR));
        }
        setMinG(String(tp.detail.private.minGroupSize));
        setMaxG(String(tp.detail.private.maxGroupSize));
        setAddOns(
          tp.detail.private.addOns.map((a) => ({
            rowKey: newRowKey(),
            id: String(a.addOnId),
            label: a.label,
            price: String(a.priceINR),
          })),
        );
        if (lk === "private") {
          const plans = itineraryPlansFromTourPackage(tp);
          setItineraryDays(
            plans.length > 0
              ? plans.map((d) => ({
                  rowKey: newRowKey(),
                  title: d.title,
                  description: d.description,
                }))
              : [{ rowKey: newRowKey(), title: "", description: "" }],
          );
        } else {
          setItineraryDays([
            { rowKey: newRowKey(), title: "", description: "" },
          ]);
        }
      } else {
        setPriceKind("multi");
        setMinG("1");
        setMaxG("20");
        setSinglePrice("15000");
        setTiers([
          { rowKey: newRowKey(), label: "Standard", price: "15000" },
          { rowKey: newRowKey(), label: "Deluxe", price: "22000" },
        ]);
        setFixedPrice(String(tp.detail.fixed.pricePerPersonINR));
        setAddOns(
          tp.detail.fixed.addOns.map((a) => ({
            rowKey: newRowKey(),
            id: String(a.addOnId),
            label: a.label,
            price: String(a.priceINR),
          })),
        );
        setBatches(
          tp.detail.fixed.batches.map((b) => ({
            rowKey: newRowKey(),
            batchId: String(b.batchId),
            date: b.dateLabel,
            total: String(b.seatsTotal),
            remaining: String(b.seatsRemaining),
          })),
        );
        setFixedInclusions(
          (tp.detail.fixed.inclusions ?? []).join("\n"),
        );
        setItineraryDays([{ rowKey: newRowKey(), title: "", description: "" }]);
      }
      const tlx = tp as TourPackageListing;
      setHideItineraryOnDetail(Boolean(tlx.hideItineraryOnDetail));
      setBookingBlackoutText((tlx.bookingBlackoutDates ?? []).join("\n"));
      setPropertyYoutubeUrl(String(tlx.propertyYoutubeUrl ?? ""));
      setPropertyMapsUrl(String(tlx.propertyMapsUrl ?? ""));
      setVillaWeekdayPrice(
        tlx.villaWeekdayPricePerPersonINR
          ? String(tlx.villaWeekdayPricePerPersonINR)
          : "",
      );
      setVillaWeekendPrice(
        tlx.villaWeekendPricePerPersonINR
          ? String(tlx.villaWeekendPricePerPersonINR)
          : "",
      );
      setVillaWeekdayMax(
        tlx.villaWeekdayMaxGuests ? String(tlx.villaWeekdayMaxGuests) : "",
      );
      setVillaWeekendMax(
        tlx.villaWeekendMaxGuests ? String(tlx.villaWeekendMaxGuests) : "",
      );
      setVillaNoMealWeekday(
        tlx.villaWeekdayPriceNoMealINR
          ? String(tlx.villaWeekdayPriceNoMealINR)
          : "",
      );
      setVillaNoMealWeekend(
        tlx.villaWeekendPriceNoMealINR
          ? String(tlx.villaWeekendPriceNoMealINR)
          : "",
      );
      if (
        "private" in tp.detail &&
        lk === "hotel" &&
        "multi" in tp.detail.private.pricing
      ) {
        const rawUrls = tlx.hotelRoomTierImageUrls ?? [];
        const len = tp.detail.private.pricing.multi.tiers.length;
        setHotelTierImageUrls(
          Array.from({ length: len }, (_, i) => String(rawUrls[i] ?? "")),
        );
      } else {
        setHotelTierImageUrls([]);
      }
      setDlgOpen(true);
    } catch {
      toast.error("Failed to load package");
    }
  };

  const savePackage = async () => {
    const backend = await resolveActor();
    if (!backend) {
      toast.error("Not connected — refresh the page or check your login.");
      return;
    }
    if (!pkgName.trim() || !pkgCatId) {
      toast.error("Name and category required");
      return;
    }
    if (
      (listingKind === "hotel" || listingKind === "villa") &&
      !pkgLongDesc.trim()
    ) {
      toast.error(
        "Full description is required for hotels, villas, and farm stays.",
      );
      return;
    }
    setSavingPkg(true);
    try {
      const stablePkgId = BigInt(String(pkgId));
      let effectiveId = stablePkgId;
      if (stablePkgId !== 0n) {
        try {
          const existing = await backend.getPackage(stablePkgId);
          if (!existing) effectiveId = 0n;
        } catch {
          effectiveId = 0n;
        }
      }
      const cat = BigInt(String(pkgCatId).trim());
      const detailKind: DetailKind =
        listingKind === "fixed" || listingKind === "trek" ? "fixed" : "private";
      let detail: TourPackage["detail"];
      /** Used for Node `itineraryPlan` payload (private packages only). */
      let itineraryRowsPrivateForNode: { title: string; description: string }[] =
        [];
      if (detailKind === "private") {
        const ao = addOns.map((a) => ({
          addOnId: BigInt(a.id),
          label: a.label,
          priceINR: BigInt(a.price || "0"),
        }));
        const pricing =
          priceKind === "single"
            ? { single: { pricePerPersonINR: BigInt(singlePrice || "0") } }
            : {
                multi: {
                  tiers: tiers.map((t) => ({
                    label: t.label,
                    pricePerPersonINR: BigInt(t.price || "0"),
                  })),
                },
              };
        const itineraryRowsPrivate = itineraryDays.filter(
          (r) => r.title.trim() || r.description.trim(),
        );
        itineraryRowsPrivateForNode = itineraryRowsPrivate.map((r) => ({
          title: r.title.trim(),
          description: r.description.trim(),
        }));
        const itineraryForSave =
          listingKind === "private"
            ? itineraryRowsPrivate.map((r) => {
                const t = r.title.trim();
                const d = r.description.trim();
                if (t && d) return `${t}\n\n${d}`;
                return t || d;
              })
            : [];
        detail = {
          private: {
            minGroupSize: BigInt(minG || "1"),
            maxGroupSize: BigInt(maxG || "1"),
            pricing,
            addOns: ao,
            itineraryDays: itineraryForSave,
          },
        };
      } else {
        const validBatches = batches.filter((b) => b.date.trim());
        if (validBatches.length === 0) {
          toast.error("Add at least one batch with a date");
          setSavingPkg(false);
          return;
        }
        let batchTuples: {
          batchId: bigint;
          dateLabel: string;
          seatsTotal: bigint;
          seatsRemaining: bigint;
        }[];
        if (effectiveId === 0n) {
          const ids = await backend.adminReserveBatchIds(
            BigInt(validBatches.length),
          );
          batchTuples = validBatches.map((b, i) => ({
            batchId: ids[i]!,
            dateLabel: b.date.trim(),
            seatsTotal: BigInt(b.total || "0"),
            seatsRemaining: BigInt(b.remaining || b.total || "0"),
          }));
        } else {
          batchTuples = validBatches.map((b) => ({
            batchId: BigInt(b.batchId || "0"),
            dateLabel: b.date.trim(),
            seatsTotal: BigInt(b.total || "0"),
            seatsRemaining: BigInt(b.remaining || "0"),
          }));
        }
        const ao = addOns.map((a) => ({
          addOnId: BigInt(a.id),
          label: a.label,
          priceINR: BigInt(a.price || "0"),
        }));
        const inclusionLines = fixedInclusions
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        detail = {
          fixed: {
            pricePerPersonINR: BigInt(fixedPrice || "0"),
            batches: batchTuples,
            addOns: ao,
            inclusions: inclusionLines,
          },
        };
      }
      const tour: TourPackage = {
        id: effectiveId,
        categoryId: cat,
        name: pkgName.trim(),
        shortDescription: pkgDesc.trim(),
        heroImageUrl: pkgImg.trim(),
        active: pkgActive,
        detail,
      };
      const longDescriptionForSave =
        listingKind === "hotel" || listingKind === "villa"
          ? pkgLongDesc.trim()
          : listingKind === "trek"
            ? trekListingMeta.trim()
            : "";

      const useNodeBackend = viteEnvIsTrue(import.meta.env.VITE_USE_NODE_BACKEND);
      if (useNodeBackend) {
        const thumb = pkgThumbnail.trim();
        const galleryImageUrls = galleryRows
          .map((r) => r.url.trim())
          .filter(Boolean);
        const relatedPackageIds = relatedSelectedIds
          .map((s) => Number(s))
          .filter(
            (n) =>
              Number.isFinite(n) &&
              n > 0 &&
              String(BigInt(n)) !== String(effectiveId),
          );
        if (debugCatalogClient()) {
          console.log("[tourist-debug][admin] adminPutPackage payload (Node)", {
            effectiveId: String(effectiveId),
            heroImageUrl: tour.heroImageUrl,
            thumbnailUrl: thumb || "(empty — field omitted in JSON)",
            listingKind,
            galleryCount: galleryImageUrls.length,
            relatedCount: relatedPackageIds.length,
          });
        }
        const packageInclusions = pkgPackageInclusions
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        const packageExclusions = pkgPackageExclusions
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        const amenities = amenityRows
          .filter((r) => r.label.trim())
          .map((r) => ({
            icon: (r.icon || "bed").toLowerCase(),
            label: r.label.trim(),
          }));
        const lastMinuteDealPackageIds = lastMinuteDealIds
          .map((s) => Number(s))
          .filter(
            (n) =>
              Number.isFinite(n) &&
              n > 0 &&
              String(BigInt(n)) !== String(effectiveId),
          );
        const seasonSm = Math.max(0, Math.min(12, parseInt(seasonStartMonth, 10) || 0));
        const seasonEm = Math.max(0, Math.min(12, parseInt(seasonEndMonth, 10) || 0));
        const mapsTrim = meetingPointMapsUrl.trim();
        if (
          (listingKind === "private" ||
            listingKind === "trek" ||
            listingKind === "fixed") &&
          mapsTrim &&
          !/^https:\/\//i.test(mapsTrim)
        ) {
          toast.error("Meeting / trailhead map link must start with https://");
          setSavingPkg(false);
          return;
        }
        const mapsProp = propertyMapsUrl.trim();
        if (
          (listingKind === "hotel" || listingKind === "villa") &&
          mapsProp &&
          !/^https:\/\//i.test(mapsProp)
        ) {
          toast.error("Property map link must start with https://");
          setSavingPkg(false);
          return;
        }
        const ytTrim = propertyYoutubeUrl.trim();
        if (ytTrim && !/^https:\/\//i.test(ytTrim)) {
          toast.error("YouTube link must start with https://");
          setSavingPkg(false);
          return;
        }
        const blackoutParsed = bookingBlackoutText
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));
        const commonNodeListingMeta = {
          hideItineraryOnDetail,
          bookingBlackoutDates: blackoutParsed,
          meetingPointLabel: meetingPointLabel.trim(),
          meetingPointMapsUrl: mapsTrim,
          propertyYoutubeUrl: propertyYoutubeUrl.trim(),
          propertyMapsUrl: mapsProp,
          villaWeekdayPricePerPersonINR: Math.max(
            0,
            parseInt(villaWeekdayPrice, 10) || 0,
          ),
          villaWeekendPricePerPersonINR: Math.max(
            0,
            parseInt(villaWeekendPrice, 10) || 0,
          ),
          villaWeekdayMaxGuests: Math.max(0, parseInt(villaWeekdayMax, 10) || 0),
          villaWeekendMaxGuests: Math.max(0, parseInt(villaWeekendMax, 10) || 0),
          villaWeekdayPriceNoMealINR: Math.max(
            0,
            parseInt(villaNoMealWeekday, 10) || 0,
          ),
          villaWeekendPriceNoMealINR: Math.max(
            0,
            parseInt(villaNoMealWeekend, 10) || 0,
          ),
          ...(listingKind === "hotel" && priceKind === "multi"
            ? {
                hotelRoomTierImageUrls: tiers.map((_, i) =>
                  (hotelTierImageUrls[i] ?? "").trim(),
                ),
              }
            : {}),
        };
        let privatePartyPricingOut: { pax: number; pricePerPersonINR: number }[] =
          [];
        let minOnlineOut = 2;
        let maxOnlineOut = 12;
        if (listingKind === "private") {
          minOnlineOut = Math.max(1, parseInt(partyMinOnline, 10) || 2);
          maxOnlineOut = Math.min(
            50,
            Math.max(minOnlineOut, parseInt(partyMaxOnline, 10) || 12),
          );
          if (usePrivatePartyMatrix) {
            for (let pax = minOnlineOut; pax <= maxOnlineOut; pax++) {
              const raw = partyMatrixPrices[pax - 2] ?? "";
              const price = parseInt(String(raw).replace(/\s/g, ""), 10);
              if (!Number.isFinite(price) || price <= 0) {
                toast.error(`Enter a positive INR rate for party size ${pax}`);
                setSavingPkg(false);
                return;
              }
              privatePartyPricingOut.push({ pax, pricePerPersonINR: price });
            }
          }
        }
        const cfa = Math.max(0, Math.min(17, parseInt(childFreeMaxAge, 10) || 5));
        let cha = Math.max(0, Math.min(17, parseInt(childHalfMaxAge, 10) || 10));
        if (cha < cfa) cha = cfa;
        let cfi = Math.max(1, Math.min(21, parseInt(childFullMinAge, 10) || 11));
        if (cfi <= cha) cfi = cha + 1;
        await backend.adminPutPackage({
          ...tour,
          listingKind,
          longDescription: longDescriptionForSave,
          ...(thumb ? { thumbnailUrl: thumb } : {}),
          galleryImageUrls,
          relatedPackageIds,
          detailOverview: pkgDetailOverview.trim(),
          durationLabel: pkgDurationLabel.trim(),
          tourTypeLabel: pkgTourTypeLabel.trim(),
          packageInclusions,
          packageExclusions,
          amenities,
          tourMinAge: pkgTourMinAge.trim(),
          tourMaxGuestsDisplay: pkgTourMaxGuestsDisplay.trim(),
          tourLocation: pkgTourLocation.trim(),
          tourLanguages: pkgTourLanguages.trim(),
          lastMinuteDealPackageIds,
          ...commonNodeListingMeta,
          ...(listingKind === "private"
            ? {
                itineraryPlan: itineraryRowsPrivateForNode,
                seasonStartMonth: seasonSm,
                seasonEndMonth: seasonEm,
                minOnlinePartySize: minOnlineOut,
                maxOnlinePartySize: maxOnlineOut,
                childFreeMaxAge: cfa,
                childHalfMaxAge: cha,
                childFullMinAge: cfi,
                privatePartyPricing: privatePartyPricingOut,
              }
            : {}),
        } as TourPackage);
      } else {
        await backend.adminPutPackage(tour);
      }
      toast.success(effectiveId === 0n ? "Package created" : "Package saved");
      setDlgOpen(false);
      await load();
    } catch (e) {
      toastCatalogMutationError("Save package", e);
    } finally {
      setSavingPkg(false);
    }
  };

  const deletePackage = async (id: bigint | number | string) => {
    if (!confirm("Delete this package?")) return;
    const backend = await resolveActor();
    if (!backend) {
      toast.error("Not connected — refresh the page or check your login.");
      return;
    }
    try {
      await backend.adminDeletePackage(BigInt(String(id)));
      toast.success("Package deleted");
      await load();
    } catch (e) {
      toastCatalogMutationError("Delete package", e);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-border bg-muted/70"
          disabled={seedingCatalog}
          onClick={async () => {
            const backend = await resolveActor();
            if (!backend) {
              toast.error("Not connected — refresh the page or check your login.");
              return;
            }
            setSeedingCatalog(true);
            try {
              await backend.adminSeedDemoCatalog();
              toast.success("Demo catalog is loaded.");
              await load();
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              if (msg.startsWith("SEED_SKIPPED")) {
                toast.message("Nothing was added", {
                  description:
                    "The catalog already had categories. The first seed only fills an empty catalog. Use “Replace with demo catalog” below to wipe and reload the full demo (Node dev API), or add rows manually.",
                });
                await load();
              } else {
                toast.error(
                  "Could not seed catalog — use dev admin login (/admin) and matching VITE_APP_ADMIN_TOKEN, or sign in as admin.",
                );
              }
            } finally {
              setSeedingCatalog(false);
            }
          }}
        >
          {seedingCatalog ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Seed demo (empty catalog only)
        </Button>
        {viteEnvIsTrue(import.meta.env.VITE_USE_NODE_BACKEND) ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-amber-500/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
            disabled={seedingCatalog}
            onClick={async () => {
              const backend = await resolveActor();
              if (!backend?.adminReplaceDemoCatalog) {
                toast.error("Not connected — refresh the page or check your login.");
                return;
              }
              if (
                !confirm(
                  "Delete ALL categories and packages and replace them with the full demo catalog? This cannot be undone.",
                )
              ) {
                return;
              }
              setSeedingCatalog(true);
              try {
                await backend.adminReplaceDemoCatalog();
                toast.success("Catalog replaced with full demo data.");
                await load();
              } catch {
                toast.error(
                  "Replace failed — you must be logged in as admin on the Node API.",
                );
              } finally {
                setSeedingCatalog(false);
              }
            }}
          >
            Replace with demo catalog
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          onClick={openNewPackage}
          disabled={!Array.isArray(views) || views.length === 0}
          title={
            !Array.isArray(views) || views.length === 0
              ? "Create a category first — each package belongs to one category."
              : undefined
          }
          style={{
            background: "oklch(var(--brand-blue))",
            color: "oklch(0.985 0.005 85)",
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          New package
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => load()}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      <section
        className="rounded-2xl border border-border p-6"
        style={{ background: "oklch(0.98 0.008 248 / 0.72)" }}
      >
        <h2 className="font-display text-xl font-bold mb-4">Categories</h2>
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin opacity-50" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Sort</TableHead>
                <TableHead>Active</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {views.map((v) => (
                <TableRow
                  key={String(v.category.id)}
                  className="border-border"
                >
                  <TableCell className="font-mono text-xs">
                    {String(v.category.id)}
                  </TableCell>
                  <TableCell>{v.category.name}</TableCell>
                  <TableCell>{String(v.category.sortOrder)}</TableCell>
                  <TableCell>{v.category.active ? "yes" : "no"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCatId(BigInt(String(v.category.id)));
                        setCatName(v.category.name);
                        setCatSort(String(v.category.sortOrder));
                        setCatActive(v.category.active);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCategory(v.category.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
          <div>
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              className="bg-muted/70 border-border mt-1"
              placeholder="Himalayan Circuits"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Sort order</Label>
            <Input
              value={catSort}
              onChange={(e) => setCatSort(e.target.value)}
              className="bg-muted/70 border-border mt-1"
            />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Checkbox
              id="cat-active"
              checked={catActive}
              onCheckedChange={(c) => setCatActive(c === true)}
            />
            <Label htmlFor="cat-active" className="text-sm">
              Active
            </Label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void saveCategory()}>
              {catId ? "Update category" : "Add category"}
            </Button>
            {catId ? (
              <Button type="button" variant="ghost" onClick={resetCatForm}>
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <section
        className="rounded-2xl border border-border p-6"
        style={{ background: "oklch(0.98 0.008 248 / 0.72)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-display text-xl font-bold">Packages</h2>
          <Button
            type="button"
            size="sm"
            onClick={openNewPackage}
            disabled={!Array.isArray(views) || views.length === 0}
            title={
              !Array.isArray(views) || views.length === 0
                ? "Create a category first — each package belongs to one category."
                : undefined
            }
            style={{
              background: "oklch(var(--brand-blue))",
              color: "oklch(0.985 0.005 85)",
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add package
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="w-16">Image</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {flatPackages.map(({ pkg, categoryName }) => {
              const pl = pkg as TourPackageListing;
              const thumb =
                String(pl.thumbnailUrl ?? "").trim() || pkg.heroImageUrl;
              return (
              <TableRow key={String(pkg.id)} className="border-border">
                <TableCell className="p-2">
                  <img
                    src={thumb}
                    alt=""
                    className="h-11 w-16 rounded-md object-cover border border-border bg-black/20"
                  />
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {String(pkg.id)}
                </TableCell>
                <TableCell>{pkg.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {categoryName}
                </TableCell>
                <TableCell className="text-sm">
                  {getListingKind(pkg) === "private"
                    ? "Private"
                    : getListingKind(pkg) === "fixed"
                      ? "Fixed date"
                      : getListingKind(pkg) === "villa"
                        ? "Villa"
                        : getListingKind(pkg) === "trek"
                          ? "Trek"
                          : "Hotel"}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void openEditPackage(pkg.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePackage(pkg.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </TableCell>
              </TableRow>
            );
            })}
          </TableBody>
        </Table>
      </section>

      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
          style={{
            background: "oklch(0.99 0.006 248)",
            border: "1px solid oklch(0.88 0.02 248 / 0.6)",
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              {pkgId === 0n ? "New package" : `Edit package #${pkgId}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs">Category</Label>
              <Select
                value={pkgCatId}
                onValueChange={(id) => {
                  setPkgCatId(id);
                  const row = views.find((v) => String(v.category.id) === id);
                  setListingKind(
                    listingKindFromCategoryName(row?.category.name ?? ""),
                  );
                }}
              >
                <SelectTrigger className="mt-1 bg-muted/70 border-border">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {views.map((v) => (
                    <SelectItem
                      key={String(v.category.id)}
                      value={String(v.category.id)}
                    >
                      {v.category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Also sets package type for the site (private, fixed, trek, hotel,
                villa) from the category name — e.g. &quot;Villas &amp;
                Farmhouses&quot; → villas. Custom names without those keywords
                default to private tours.
              </p>
            </div>
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                value={pkgName}
                onChange={(e) => setPkgName(e.target.value)}
                className="mt-1 bg-muted/70 border-border"
              />
            </div>
            <div>
              <Label className="text-xs">Short overview</Label>
              <Input
                value={pkgDesc}
                onChange={(e) => setPkgDesc(e.target.value)}
                className="mt-1 bg-muted/70 border-border"
                placeholder="One or two lines — listings and detail “Overview”"
              />
            </div>
            <div>
              <Label className="text-xs">Hero image URL</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={pkgImg}
                  onChange={(e) => setPkgImg(e.target.value)}
                  className="flex-1 min-w-0 bg-muted/70 border-border"
                />
                {viteEnvIsTrue(import.meta.env.VITE_USE_NODE_BACKEND) ? (
                  <>
                    <input
                      ref={heroFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        void handleCatalogImageUpload(
                          f,
                          setPkgImg,
                          setUploadingHeroImg,
                        );
                        e.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 border-border bg-muted/70"
                      disabled={uploadingHeroImg}
                      onClick={() => heroFileRef.current?.click()}
                    >
                      {uploadingHeroImg ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Upload"
                      )}
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
            <div>
              <Label className="text-xs">Thumbnail URL (optional)</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={pkgThumbnail}
                  onChange={(e) => setPkgThumbnail(e.target.value)}
                  className="flex-1 min-w-0 bg-muted/70 border-border"
                  placeholder="Smaller image for cards; defaults to hero"
                />
                {viteEnvIsTrue(import.meta.env.VITE_USE_NODE_BACKEND) ? (
                  <>
                    <input
                      ref={thumbFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        void handleCatalogImageUpload(
                          f,
                          setPkgThumbnail,
                          setUploadingThumbImg,
                        );
                        e.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 border-border bg-muted/70"
                      disabled={uploadingThumbImg}
                      onClick={() => thumbFileRef.current?.click()}
                    >
                      {uploadingThumbImg ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Upload"
                      )}
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
            {viteEnvIsTrue(import.meta.env.VITE_USE_NODE_BACKEND) ? (
              <div>
                <Label className="text-xs">
                  Extra gallery photos (optional)
                </Label>
                <p className="text-[11px] text-muted-foreground mt-1 mb-2">
                  Hero and thumbnail are always used first on the public detail
                  page; add more URLs for a carousel.
                </p>
                <input
                  ref={galleryFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    const rowKey = pendingGalleryRowKeyRef.current;
                    e.target.value = "";
                    if (!f || !rowKey) return;
                    void handleCatalogImageUpload(
                      f,
                      (url) => {
                        setGalleryRows((rows) =>
                          rows.map((r) =>
                            r.rowKey === rowKey ? { ...r, url } : r,
                          ),
                        );
                        pendingGalleryRowKeyRef.current = null;
                        setUploadingGalleryRowKey(null);
                      },
                      (busy) => {
                        if (busy) setUploadingGalleryRowKey(rowKey);
                        else setUploadingGalleryRowKey(null);
                      },
                    );
                  }}
                />
                <div className="space-y-2">
                  {galleryRows.map((row) => (
                    <div
                      key={row.rowKey}
                      className="flex gap-2 items-center flex-wrap"
                    >
                      <Input
                        value={row.url}
                        onChange={(e) =>
                          setGalleryRows((rows) =>
                            rows.map((r) =>
                              r.rowKey === row.rowKey
                                ? { ...r, url: e.target.value }
                                : r,
                            ),
                          )
                        }
                        className="flex-1 min-w-[12rem] bg-muted/70 border-border"
                        placeholder="Image URL"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 border-border bg-muted/70"
                        disabled={uploadingGalleryRowKey === row.rowKey}
                        onClick={() => {
                          pendingGalleryRowKeyRef.current = row.rowKey;
                          galleryFileRef.current?.click();
                        }}
                      >
                        {uploadingGalleryRowKey === row.rowKey ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Upload"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-400 shrink-0"
                        onClick={() =>
                          setGalleryRows((rows) =>
                            rows.filter((r) => r.rowKey !== row.rowKey),
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-border bg-muted/70"
                    onClick={() =>
                      setGalleryRows((rows) => [
                        ...rows,
                        { rowKey: newRowKey(), url: "" },
                      ])
                    }
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add gallery row
                  </Button>
                </div>
                <div className="pt-2">
                  <Label className="text-xs">Related packages</Label>
                  <p className="text-[11px] text-muted-foreground mt-1 mb-2">
                    Shown on the public package detail page (stored with the Node
                    catalog API).
                  </p>
                  <div className="max-h-52 overflow-y-auto rounded-md border border-border p-3 space-y-2 bg-muted/30">
                    {flatPackages
                      .filter(
                        ({ pkg: p }) =>
                          !(pkgId !== 0n && packageIdsEqual(p.id, pkgId)),
                      )
                      .map(({ pkg: p, categoryName }) => {
                        const idStr = String(p.id);
                        const checked = relatedSelectedIds.includes(idStr);
                        return (
                          <label
                            key={idStr}
                            className="flex items-start gap-2 text-sm cursor-pointer"
                          >
                            <Checkbox
                              className="mt-0.5"
                              checked={checked}
                              onCheckedChange={() =>
                                setRelatedSelectedIds((prev) =>
                                  checked
                                    ? prev.filter((x) => x !== idStr)
                                    : [...prev, idStr],
                                )
                              }
                            />
                            <span className="leading-snug">
                              <span className="font-mono text-xs text-muted-foreground">
                                #{idStr}
                              </span>{" "}
                              {p.name}
                              <span className="text-muted-foreground text-xs block">
                                {categoryName}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-border space-y-4">
                  <div>
                    <p className="text-sm font-semibold font-display">
                      Tour detail page content
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Overview, included/excluded, amenities, tour sidebar, and
                      last-minute deal cards on the public package page.
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs">Detail overview</Label>
                    <Textarea
                      value={pkgDetailOverview}
                      onChange={(e) => setPkgDetailOverview(e.target.value)}
                      className="mt-1 bg-muted/70 border-border min-h-[100px]"
                      placeholder="Long description under “Overview” (leave empty to use Short overview for non-hotel listings)"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Duration label</Label>
                      <Input
                        value={pkgDurationLabel}
                        onChange={(e) => setPkgDurationLabel(e.target.value)}
                        className="mt-1 bg-muted/70 border-border"
                        placeholder="e.g. 2 Days / 1 Night"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tour type label</Label>
                      <Input
                        value={pkgTourTypeLabel}
                        onChange={(e) => setPkgTourTypeLabel(e.target.value)}
                        className="mt-1 bg-muted/70 border-border"
                        placeholder="e.g. Camping"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Included (one per line)</Label>
                      <Textarea
                        value={pkgPackageInclusions}
                        onChange={(e) =>
                          setPkgPackageInclusions(e.target.value)
                        }
                        className="mt-1 bg-muted/70 border-border min-h-[88px]"
                        placeholder="Overrides fixed-date “inclusions” when non-empty"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Excluded (one per line)</Label>
                      <Textarea
                        value={pkgPackageExclusions}
                        onChange={(e) =>
                          setPkgPackageExclusions(e.target.value)
                        }
                        className="mt-1 bg-muted/70 border-border min-h-[88px]"
                      />
                    </div>
                  </div>
                {viteEnvIsTrue(import.meta.env.VITE_USE_NODE_BACKEND) ? (
                  <div className="rounded-lg border border-dashed border-border p-3 space-y-3 bg-muted/10">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Node catalog — itinerary, blackouts, maps and media
                    </p>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={hideItineraryOnDetail}
                        onCheckedChange={(c) =>
                          setHideItineraryOnDetail(Boolean(c))
                        }
                      />
                      <span>Hide day-by-day itinerary on the public detail page</span>
                    </label>
                    <div>
                      <Label className="text-xs">
                        Blackout dates (YYYY-MM-DD, one per line)
                      </Label>
                      <Textarea
                        value={bookingBlackoutText}
                        onChange={(e) => setBookingBlackoutText(e.target.value)}
                        rows={3}
                        className="mt-1 bg-muted/70 border-border text-sm"
                        placeholder={"2026-12-25\n2026-12-31"}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">YouTube video URL</Label>
                      <Input
                        value={propertyYoutubeUrl}
                        onChange={(e) =>
                          setPropertyYoutubeUrl(e.target.value)
                        }
                        className="mt-1 bg-muted/70 border-border text-sm"
                        placeholder="https://www.youtube.com/watch?v=…"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Optional promo or walkthrough; treks and hotels/villas
                        can surface this on listing pages when set (https only).
                      </p>
                    </div>
                    {(listingKind === "hotel" || listingKind === "villa") && (
                      <div>
                        <Label className="text-xs">
                          Property Google Maps URL (https)
                        </Label>
                        <Input
                          value={propertyMapsUrl}
                          onChange={(e) => setPropertyMapsUrl(e.target.value)}
                          className="mt-1 bg-muted/70 border-border text-sm"
                          placeholder="https://maps.google.com/…"
                        />
                      </div>
                    )}
                    {listingKind === "villa" ? (
                      <div className="grid sm:grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Weekday price / person (INR)</Label>
                          <Input
                            value={villaWeekdayPrice}
                            onChange={(e) =>
                              setVillaWeekdayPrice(e.target.value)
                            }
                            className="mt-1 bg-muted/70 border-border text-sm"
                            placeholder="Overrides catalog tier when set"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Weekend price / person (INR)</Label>
                          <Input
                            value={villaWeekendPrice}
                            onChange={(e) =>
                              setVillaWeekendPrice(e.target.value)
                            }
                            className="mt-1 bg-muted/70 border-border text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Weekday max guests (0 = use max group)</Label>
                          <Input
                            value={villaWeekdayMax}
                            onChange={(e) => setVillaWeekdayMax(e.target.value)}
                            className="mt-1 bg-muted/70 border-border text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Weekend max guests (0 = use max group)</Label>
                          <Input
                            value={villaWeekendMax}
                            onChange={(e) => setVillaWeekendMax(e.target.value)}
                            className="mt-1 bg-muted/70 border-border text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Weekday without meals / person</Label>
                          <Input
                            value={villaNoMealWeekday}
                            onChange={(e) =>
                              setVillaNoMealWeekday(e.target.value)
                            }
                            className="mt-1 bg-muted/70 border-border text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Weekend without meals / person</Label>
                          <Input
                            value={villaNoMealWeekend}
                            onChange={(e) =>
                              setVillaNoMealWeekend(e.target.value)
                            }
                            className="mt-1 bg-muted/70 border-border text-sm"
                          />
                        </div>
                      </div>
                    ) : null}
                    {listingKind === "hotel" && priceKind === "multi" ? (
                      <div className="space-y-2">
                        <p className="text-[11px] text-muted-foreground">
                          Optional image URL per room tier (same order as tiers
                          below).
                        </p>
                        {tiers.map((t, i) => (
                          <div key={`img-${t.rowKey}`}>
                            <Label className="text-[11px] text-muted-foreground">
                              Photo URL — {t.label || `Tier ${i + 1}`}
                            </Label>
                            <Input
                              value={hotelTierImageUrls[i] ?? ""}
                              onChange={(e) => {
                                const next = [...hotelTierImageUrls];
                                next[i] = e.target.value;
                                setHotelTierImageUrls(next);
                              }}
                              className="mt-1 bg-muted/70 border-border text-sm"
                              placeholder="https://…"
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                  <div>
                    <Label className="text-xs">Tour amenities</Label>
                    <p className="text-[11px] text-muted-foreground mt-1 mb-2">
                      Icon + label pairs shown in the amenities list.
                    </p>
                    <div className="space-y-2">
                      {amenityRows.map((row) => (
                        <div
                          key={row.rowKey}
                          className="flex flex-wrap gap-2 items-center"
                        >
                          <Select
                            value={
                              AMENITY_ICON_KEYS.includes(
                                row.icon as (typeof AMENITY_ICON_KEYS)[number],
                              )
                                ? row.icon
                                : "bed"
                            }
                            onValueChange={(v) =>
                              setAmenityRows((rows) =>
                                rows.map((r) =>
                                  r.rowKey === row.rowKey
                                    ? { ...r, icon: v }
                                    : r,
                                ),
                              )
                            }
                          >
                            <SelectTrigger className="w-[9.5rem] bg-muted/70 border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {AMENITY_ICON_KEYS.map((k) => (
                                <SelectItem key={k} value={k}>
                                  {k}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={row.label}
                            onChange={(e) =>
                              setAmenityRows((rows) =>
                                rows.map((r) =>
                                  r.rowKey === row.rowKey
                                    ? { ...r, label: e.target.value }
                                    : r,
                                ),
                              )
                            }
                            className="flex-1 min-w-[10rem] bg-muted/70 border-border"
                            placeholder="Label"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-400 shrink-0"
                            onClick={() =>
                              setAmenityRows((rows) =>
                                rows.filter((r) => r.rowKey !== row.rowKey),
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-border bg-muted/70"
                        onClick={() =>
                          setAmenityRows((rows) => [
                            ...rows,
                            {
                              rowKey: newRowKey(),
                              icon: "bed",
                              label: "",
                            },
                          ])
                        }
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add amenity
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Min age (display)</Label>
                      <Input
                        value={pkgTourMinAge}
                        onChange={(e) => setPkgTourMinAge(e.target.value)}
                        className="mt-1 bg-muted/70 border-border"
                        placeholder="e.g. 8+"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Max guests (display)</Label>
                      <Input
                        value={pkgTourMaxGuestsDisplay}
                        onChange={(e) =>
                          setPkgTourMaxGuestsDisplay(e.target.value)
                        }
                        className="mt-1 bg-muted/70 border-border"
                        placeholder="e.g. 40"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tour location</Label>
                      <Input
                        value={pkgTourLocation}
                        onChange={(e) => setPkgTourLocation(e.target.value)}
                        className="mt-1 bg-muted/70 border-border"
                        placeholder="e.g. Maharashtra"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Languages</Label>
                      <Input
                        value={pkgTourLanguages}
                        onChange={(e) => setPkgTourLanguages(e.target.value)}
                        className="mt-1 bg-muted/70 border-border"
                        placeholder="e.g. English, Hindi"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Last minute deals</Label>
                    <p className="text-[11px] text-muted-foreground mt-1 mb-2">
                      Sidebar cards linking to other packages.
                    </p>
                    <div className="max-h-52 overflow-y-auto rounded-md border border-border p-3 space-y-2 bg-muted/30">
                      {flatPackages
                        .filter(
                          ({ pkg: p }) =>
                            !(pkgId !== 0n && packageIdsEqual(p.id, pkgId)),
                        )
                        .map(({ pkg: p, categoryName }) => {
                          const idStr = String(p.id);
                          const checked = lastMinuteDealIds.includes(idStr);
                          return (
                            <label
                              key={`deal-${idStr}`}
                              className="flex items-start gap-2 text-sm cursor-pointer"
                            >
                              <Checkbox
                                className="mt-0.5"
                                checked={checked}
                                onCheckedChange={() =>
                                  setLastMinuteDealIds((prev) =>
                                    checked
                                      ? prev.filter((x) => x !== idStr)
                                      : [...prev, idStr],
                                  )
                                }
                              />
                              <span className="leading-snug">
                                <span className="font-mono text-xs text-muted-foreground">
                                  #{idStr}
                                </span>{" "}
                                {p.name}
                                <span className="text-muted-foreground text-xs block">
                                  {categoryName}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <Checkbox
                id="pkg-act"
                checked={pkgActive}
                onCheckedChange={(c) => setPkgActive(c === true)}
              />
              <Label htmlFor="pkg-act">Active (visible on site)</Label>
            </div>
            {listingKind === "hotel" || listingKind === "villa" ? (
              <div>
                <Label className="text-xs">Full description (required)</Label>
                <Textarea
                  value={pkgLongDesc}
                  onChange={(e) => setPkgLongDesc(e.target.value)}
                  className="mt-1 bg-muted/70 border-border min-h-[120px]"
                  placeholder="Describe the property, rooms, meals, and what guests can expect. Hotels: optional first line rating:4.8"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Shown on the Hotels &amp; Villas page and on the package detail
                  screen. Not used for private, fixed, or trek listings.
                </p>
              </div>
            ) : listingKind === "trek" ? (
              <div>
                <Label className="text-xs">Trek card accent (optional)</Label>
                <Input
                  value={trekListingMeta}
                  onChange={(e) => setTrekListingMeta(e.target.value)}
                  className="mt-1 bg-muted/70 border-border font-mono text-xs"
                  placeholder="difficultyColor:oklch(var(--brand-coral))"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Controls the difficulty badge colour on trek cards — not a
                  guest-facing story.
                </p>
              </div>
            ) : null}

            {listingKind === "fixed" || listingKind === "trek" ? (
              <>
                <div>
                  <Label className="text-xs">Price (INR / person)</Label>
                  <Input
                    value={fixedPrice}
                    onChange={(e) => setFixedPrice(e.target.value)}
                    className="mt-1 bg-muted/70 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Batches</Label>
                  {batches.map((b, i) => (
                    <div
                      key={b.rowKey}
                      className="grid gap-2 border border-border rounded-lg p-2"
                    >
                      {b.batchId ? (
                        <p className="text-xs text-muted-foreground">
                          Batch id: {b.batchId}
                        </p>
                      ) : null}
                      <Input
                        type={
                          viteEnvIsTrue(import.meta.env.VITE_USE_NODE_BACKEND)
                            ? "date"
                            : "text"
                        }
                        placeholder={
                          viteEnvIsTrue(import.meta.env.VITE_USE_NODE_BACKEND)
                            ? "Departure date"
                            : "Date label (e.g. Apr 10, 2026)"
                        }
                        value={b.date}
                        onChange={(e) => {
                          const n = [...batches];
                          n[i] = { ...n[i]!, date: e.target.value };
                          setBatches(n);
                        }}
                        className="bg-muted/70 border-border"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Total seats"
                          value={b.total}
                          onChange={(e) => {
                            const n = [...batches];
                            n[i] = { ...n[i]!, total: e.target.value };
                            setBatches(n);
                          }}
                          className="bg-muted/70 border-border"
                        />
                        <Input
                          placeholder="Remaining"
                          value={b.remaining}
                          onChange={(e) => {
                            const n = [...batches];
                            n[i] = { ...n[i]!, remaining: e.target.value };
                            setBatches(n);
                          }}
                          className="bg-muted/70 border-border"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setBatches(batches.filter((_, j) => j !== i))
                        }
                      >
                        Remove batch
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setBatches([
                        ...batches,
                        {
                          rowKey: newRowKey(),
                          date: "",
                          total: "10",
                          remaining: "10",
                        },
                      ])
                    }
                  >
                    Add batch
                  </Button>
                </div>
                <div>
                  <Label className="text-xs">Inclusions (one per line)</Label>
                  <Textarea
                    value={fixedInclusions}
                    onChange={(e) => setFixedInclusions(e.target.value)}
                    placeholder={
                      "Hotel stay (twin sharing)\nDaily breakfast\nAC transport"
                    }
                    rows={5}
                    className="mt-1 bg-muted/70 border-border text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Shown to guests: what is included (stay, meals, travel,
                    etc.).
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Min group</Label>
                    <Input
                      value={minG}
                      onChange={(e) => setMinG(e.target.value)}
                      className="mt-1 bg-muted/70 border-border"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max group</Label>
                    <Input
                      value={maxG}
                      onChange={(e) => setMaxG(e.target.value)}
                      className="mt-1 bg-muted/70 border-border"
                    />
                  </div>
                </div>
                {listingKind === "private" &&
                viteEnvIsTrue(import.meta.env.VITE_USE_NODE_BACKEND) ? (
                  <div className="space-y-4 rounded-lg border border-border p-3 bg-muted/15">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Private tour (Node catalog)
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Season start</Label>
                        <Select
                          value={seasonStartMonth}
                          onValueChange={setSeasonStartMonth}
                        >
                          <SelectTrigger className="mt-1 bg-muted/70 border-border h-9 text-sm">
                            <SelectValue placeholder="Month" />
                          </SelectTrigger>
                          <SelectContent>
                            {SEASON_MONTH_OPTIONS.map((m) => (
                              <SelectItem key={m.value} value={m.value}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Season end</Label>
                        <Select
                          value={seasonEndMonth}
                          onValueChange={setSeasonEndMonth}
                        >
                          <SelectTrigger className="mt-1 bg-muted/70 border-border h-9 text-sm">
                            <SelectValue placeholder="Month" />
                          </SelectTrigger>
                          <SelectContent>
                            {SEASON_MONTH_OPTIONS.map((m) => (
                              <SelectItem key={`e-${m.value}`} value={m.value}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Meeting point label</Label>
                      <Input
                        value={meetingPointLabel}
                        onChange={(e) => setMeetingPointLabel(e.target.value)}
                        className="mt-1 bg-muted/70 border-border text-sm"
                        placeholder="e.g. Manali bus stand — main gate"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Google Maps URL (https)</Label>
                      <Input
                        value={meetingPointMapsUrl}
                        onChange={(e) => setMeetingPointMapsUrl(e.target.value)}
                        className="mt-1 bg-muted/70 border-border text-sm"
                        placeholder="https://maps.google.com/..."
                      />
                    </div>
                    <>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={usePrivatePartyMatrix}
                        onCheckedChange={(c) =>
                          setUsePrivatePartyMatrix(Boolean(c))
                        }
                      />
                      <span>
                        Per–party-size rates for online booking (weighted child
                        pricing on the site)
                      </span>
                    </label>
                    {usePrivatePartyMatrix ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Min online party</Label>
                            <Input
                              value={partyMinOnline}
                              onChange={(e) =>
                                setPartyMinOnline(e.target.value)
                              }
                              className="mt-1 bg-muted/70 border-border"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Max online party</Label>
                            <Input
                              value={partyMaxOnline}
                              onChange={(e) =>
                                setPartyMaxOnline(e.target.value)
                              }
                              className="mt-1 bg-muted/70 border-border"
                            />
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Enter INR / person for each total headcount (adults +
                          all children). Under-6 bucket is free, 6–10 is half
                          unit, 11+ full unit — age labels use the fields below.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <div>
                            <Label className="text-[11px]">Free through age</Label>
                            <Input
                              value={childFreeMaxAge}
                              onChange={(e) =>
                                setChildFreeMaxAge(e.target.value)
                              }
                              className="mt-1 bg-muted/70 border-border h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-[11px]">Half rate max age</Label>
                            <Input
                              value={childHalfMaxAge}
                              onChange={(e) =>
                                setChildHalfMaxAge(e.target.value)
                              }
                              className="mt-1 bg-muted/70 border-border h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-[11px]">Full rate from age</Label>
                            <Input
                              value={childFullMinAge}
                              onChange={(e) =>
                                setChildFullMinAge(e.target.value)
                              }
                              className="mt-1 bg-muted/70 border-border h-8 text-sm"
                            />
                          </div>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-24">Guests</TableHead>
                              <TableHead>INR / person</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Array.from({ length: 11 }, (_, i) => i + 2).map(
                              (pax) => (
                                <TableRow key={pax}>
                                  <TableCell className="font-medium text-sm">
                                    {pax}
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      value={partyMatrixPrices[pax - 2] ?? ""}
                                      onChange={(e) => {
                                        const next = [...partyMatrixPrices];
                                        next[pax - 2] = e.target.value;
                                        setPartyMatrixPrices(next);
                                      }}
                                      className="h-8 bg-muted/70 border-border text-sm"
                                      placeholder="—"
                                    />
                                  </TableCell>
                                </TableRow>
                              ),
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    ) : null}
                    </>
                  </div>
                ) : null}
                <div>
                  <Label className="text-xs">Pricing</Label>
                  <Select
                    value={priceKind}
                    onValueChange={(v) => setPriceKind(v as PricingKind)}
                  >
                    <SelectTrigger className="mt-1 bg-muted/70 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">
                        Single price / person
                      </SelectItem>
                      <SelectItem value="multi">Multi-tier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {priceKind === "single" ? (
                  <div>
                    <Label className="text-xs">Price (INR / person)</Label>
                    <Input
                      value={singlePrice}
                      onChange={(e) => setSinglePrice(e.target.value)}
                      className="mt-1 bg-muted/70 border-border"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs">Tiers</Label>
                    {tiers.map((t, i) => (
                      <div key={t.rowKey} className="flex gap-2">
                        <Input
                          value={t.label}
                          onChange={(e) => {
                            const n = [...tiers];
                            n[i] = { ...n[i]!, label: e.target.value };
                            setTiers(n);
                          }}
                          className="bg-muted/70 border-border"
                          placeholder="Label"
                        />
                        <Input
                          value={t.price}
                          onChange={(e) => {
                            const n = [...tiers];
                            n[i] = { ...n[i]!, price: e.target.value };
                            setTiers(n);
                          }}
                          className="bg-muted/70 border-border w-28"
                          placeholder="INR"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setTiers(tiers.filter((_, j) => j !== i))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setTiers([
                          ...tiers,
                          { rowKey: newRowKey(), label: "Tier", price: "0" },
                        ])
                      }
                    >
                      Add tier
                    </Button>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label className="text-xs">Add-ons (optional)</Label>
              {addOns.map((a, i) => (
                <div key={a.rowKey} className="flex gap-2">
                  <Input
                    value={a.id}
                    onChange={(e) => {
                      const n = [...addOns];
                      n[i] = { ...n[i]!, id: e.target.value };
                      setAddOns(n);
                    }}
                    className="bg-muted/70 border-border w-16"
                    placeholder="id"
                  />
                  <Input
                    value={a.label}
                    onChange={(e) => {
                      const n = [...addOns];
                      n[i] = { ...n[i]!, label: e.target.value };
                      setAddOns(n);
                    }}
                    className="bg-muted/70 border-border flex-1"
                    placeholder="Label"
                  />
                  <Input
                    value={a.price}
                    onChange={(e) => {
                      const n = [...addOns];
                      n[i] = { ...n[i]!, price: e.target.value };
                      setAddOns(n);
                    }}
                    className="bg-muted/70 border-border w-24"
                    placeholder="INR"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAddOns(addOns.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setAddOns([
                    ...addOns,
                    {
                      rowKey: newRowKey(),
                      id: String(addOns.length + 1),
                      label: "",
                      price: "0",
                    },
                  ])
                }
              >
                Add add-on
              </Button>
            </div>

            {listingKind === "private" ? (
              <div className="space-y-3">
                <Label className="text-xs">
                  Day-by-day tour plan (optional)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Short line = accordion header (e.g. Day 1: Delhi to Shimla).
                  Long description = details inside the expanded panel. With the
                  Node API, both are stored; on-chain saves combine them into one
                  field per day.
                </p>
                {itineraryDays.map((row, i) => (
                  <div
                    key={row.rowKey}
                    className="rounded-lg border border-border p-3 space-y-2 bg-muted/20"
                  >
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Day {i + 1}
                    </span>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">
                        Short description (header)
                      </Label>
                      <Input
                        value={row.title}
                        onChange={(e) => {
                          const n = [...itineraryDays];
                          n[i] = { ...n[i]!, title: e.target.value };
                          setItineraryDays(n);
                        }}
                        className="mt-1 bg-muted/70 border-border text-sm"
                        placeholder="e.g. Day 1: Departure from Delhi to Shimla"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">
                        Long description (expanded)
                      </Label>
                      <Textarea
                        value={row.description}
                        onChange={(e) => {
                          const n = [...itineraryDays];
                          n[i] = { ...n[i]!, description: e.target.value };
                          setItineraryDays(n);
                        }}
                        rows={4}
                        className="mt-1 bg-muted/70 border-border text-sm"
                        placeholder="Bullets, timings, links, meals — what appears when the day is opened…"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="self-start h-7 text-xs"
                      onClick={() => {
                        if (itineraryDays.length <= 1) {
                          setItineraryDays([
                            {
                              rowKey: newRowKey(),
                              title: "",
                              description: "",
                            },
                          ]);
                        } else {
                          setItineraryDays(
                            itineraryDays.filter((_, j) => j !== i),
                          );
                        }
                      }}
                    >
                      Remove day
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setItineraryDays([
                      ...itineraryDays,
                      { rowKey: newRowKey(), title: "", description: "" },
                    ])
                  }
                >
                  Add day
                </Button>
              </div>
            ) : null}

            <Button
              type="button"
              className="w-full font-bold"
              disabled={savingPkg}
              onClick={() => void savePackage()}
              style={{
                background: "oklch(var(--brand-blue))",
                color: "oklch(0.985 0.005 85)",
              }}
            >
              {savingPkg ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
              ) : null}
              Save package
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

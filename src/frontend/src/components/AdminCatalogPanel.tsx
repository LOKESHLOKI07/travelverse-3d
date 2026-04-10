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
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { backendInterface, CategoryView, TourPackage } from "../backend";
import { getStaticDemoCatalogViews } from "../data/staticDemoCatalog";
import { viteEnvIsTrue } from "../utils/viteEnv";
import {
  type ListingKind,
  getListingKind,
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
  const [pkgLongDesc, setPkgLongDesc] = useState("");
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
  const [batches, setBatches] = useState<BatchRow[]>([
    { rowKey: newRowKey(), date: "", total: "10", remaining: "10" },
  ]);
  const [savingPkg, setSavingPkg] = useState(false);

  const openNewPackage = () => {
    setPkgId(0n);
    setPkgCatId(views[0] ? String(views[0].category.id) : "");
    setPkgName("");
    setPkgDesc("");
    setPkgImg("");
    setPkgThumbnail("");
    setPkgLongDesc("");
    setPkgActive(true);
    setListingKind("private");
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
    setBatches([{ rowKey: newRowKey(), date: "", total: "8", remaining: "8" }]);
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
      setPkgLongDesc(tl.longDescription ?? "");
      setPkgActive(tp.active);
      setListingKind(getListingKind(tp));
      if ("private" in tp.detail) {
        setFixedPrice("12500");
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
        detail = {
          private: {
            minGroupSize: BigInt(minG || "1"),
            maxGroupSize: BigInt(maxG || "1"),
            pricing,
            addOns: ao,
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
        detail = {
          fixed: {
            pricePerPersonINR: BigInt(fixedPrice || "0"),
            batches: batchTuples,
            addOns: ao,
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
      const useNodeBackend = viteEnvIsTrue(import.meta.env.VITE_USE_NODE_BACKEND);
      if (useNodeBackend) {
        const thumb = pkgThumbnail.trim();
        await backend.adminPutPackage({
          ...tour,
          listingKind,
          longDescription: pkgLongDesc,
          ...(thumb ? { thumbnailUrl: thumb } : {}),
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
          className="border-white/20 bg-white/5"
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
            background: "oklch(0.85 0.13 192)",
            color: "oklch(0.13 0.04 195)",
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
        className="rounded-2xl border border-white/10 p-6"
        style={{ background: "oklch(0.16 0.025 232 / 0.6)" }}
      >
        <h2 className="font-display text-xl font-bold mb-4">Categories</h2>
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin opacity-50" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
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
                  className="border-white/10"
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
              className="bg-white/5 border-white/10 mt-1"
              placeholder="Himalayan Circuits"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Sort order</Label>
            <Input
              value={catSort}
              onChange={(e) => setCatSort(e.target.value)}
              className="bg-white/5 border-white/10 mt-1"
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex gap-2">
              <Button type="button" onClick={() => void saveCategory()}>
                {catId ? "Update category" : "Add category"}
              </Button>
              {catId ? (
                <Button type="button" variant="ghost" onClick={resetCatForm}>
                  Cancel
                </Button>
              ) : null}
            </div>
            <p className="text-[11px] text-muted-foreground max-w-md leading-snug">
              Saving categories and packages calls the catalog API as admin. Node
              dev: run <code className="text-foreground/70">pnpm dev:api</code>,
              use <code className="text-foreground/70">/admin</code> (admin /
              admin) so your session matches{" "}
              <code className="text-foreground/70">VITE_APP_ADMIN_TOKEN</code>.
            </p>
          </div>
        </div>
      </section>

      <section
        className="rounded-2xl border border-white/10 p-6"
        style={{ background: "oklch(0.16 0.025 232 / 0.6)" }}
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
              background: "oklch(0.85 0.13 192)",
              color: "oklch(0.13 0.04 195)",
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add package
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-white/10">
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
              <TableRow key={String(pkg.id)} className="border-white/10">
                <TableCell className="p-2">
                  <img
                    src={thumb}
                    alt=""
                    className="h-11 w-16 rounded-md object-cover border border-white/15 bg-black/20"
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
          className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
          style={{
            background: "oklch(0.14 0.025 232)",
            border: "1px solid oklch(0.3 0.04 232 / 0.5)",
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
              <Select value={pkgCatId} onValueChange={setPkgCatId}>
                <SelectTrigger className="mt-1 bg-white/5 border-white/10">
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
            </div>
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                value={pkgName}
                onChange={(e) => setPkgName(e.target.value)}
                className="mt-1 bg-white/5 border-white/10"
              />
            </div>
            <div>
              <Label className="text-xs">Short description</Label>
              <Input
                value={pkgDesc}
                onChange={(e) => setPkgDesc(e.target.value)}
                className="mt-1 bg-white/5 border-white/10"
              />
            </div>
            <div>
              <Label className="text-xs">Hero image URL</Label>
              <Input
                value={pkgImg}
                onChange={(e) => setPkgImg(e.target.value)}
                className="mt-1 bg-white/5 border-white/10"
              />
            </div>
            <div>
              <Label className="text-xs">Thumbnail URL (optional)</Label>
              <Input
                value={pkgThumbnail}
                onChange={(e) => setPkgThumbnail(e.target.value)}
                className="mt-1 bg-white/5 border-white/10"
                placeholder="Smaller image for cards; defaults to hero"
              />
            </div>
            <div>
              <Label className="text-xs">Long description (optional)</Label>
              <Textarea
                value={pkgLongDesc}
                onChange={(e) => setPkgLongDesc(e.target.value)}
                className="mt-1 bg-white/5 border-white/10 min-h-[88px]"
                placeholder="Full details, amenities (comma or newline separated for villa chips)"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="pkg-act"
                checked={pkgActive}
                onCheckedChange={(c) => setPkgActive(c === true)}
              />
              <Label htmlFor="pkg-act">Active (visible on site)</Label>
            </div>
            <div>
              <Label className="text-xs">Where it appears on the site</Label>
              <Select
                value={listingKind}
                onValueChange={(v) => setListingKind(v as ListingKind)}
              >
                <SelectTrigger className="mt-1 bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private packages</SelectItem>
                  <SelectItem value="fixed">Fixed date packages</SelectItem>
                  <SelectItem value="villa">Villas &amp; farmhouses</SelectItem>
                  <SelectItem value="trek">Treks &amp; expeditions</SelectItem>
                  <SelectItem value="hotel">Hotels (tiers = room types)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Fixed date and treks use batches; private, villa, and hotels use
                group pricing (hotels: each tier = a room type).
              </p>
            </div>

            {listingKind === "fixed" || listingKind === "trek" ? (
              <>
                <div>
                  <Label className="text-xs">Price (INR / person)</Label>
                  <Input
                    value={fixedPrice}
                    onChange={(e) => setFixedPrice(e.target.value)}
                    className="mt-1 bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Batches</Label>
                  {batches.map((b, i) => (
                    <div
                      key={b.rowKey}
                      className="grid gap-2 border border-white/10 rounded-lg p-2"
                    >
                      {b.batchId ? (
                        <p className="text-xs text-muted-foreground">
                          Batch id: {b.batchId}
                        </p>
                      ) : null}
                      <Input
                        placeholder="Date label (e.g. Apr 10, 2026)"
                        value={b.date}
                        onChange={(e) => {
                          const n = [...batches];
                          n[i] = { ...n[i]!, date: e.target.value };
                          setBatches(n);
                        }}
                        className="bg-white/5 border-white/10"
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
                          className="bg-white/5 border-white/10"
                        />
                        <Input
                          placeholder="Remaining"
                          value={b.remaining}
                          onChange={(e) => {
                            const n = [...batches];
                            n[i] = { ...n[i]!, remaining: e.target.value };
                            setBatches(n);
                          }}
                          className="bg-white/5 border-white/10"
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
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Min group</Label>
                    <Input
                      value={minG}
                      onChange={(e) => setMinG(e.target.value)}
                      className="mt-1 bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max group</Label>
                    <Input
                      value={maxG}
                      onChange={(e) => setMaxG(e.target.value)}
                      className="mt-1 bg-white/5 border-white/10"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Pricing</Label>
                  <Select
                    value={priceKind}
                    onValueChange={(v) => setPriceKind(v as PricingKind)}
                  >
                    <SelectTrigger className="mt-1 bg-white/5 border-white/10">
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
                      className="mt-1 bg-white/5 border-white/10"
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
                          className="bg-white/5 border-white/10"
                          placeholder="Label"
                        />
                        <Input
                          value={t.price}
                          onChange={(e) => {
                            const n = [...tiers];
                            n[i] = { ...n[i]!, price: e.target.value };
                            setTiers(n);
                          }}
                          className="bg-white/5 border-white/10 w-28"
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
                    className="bg-white/5 border-white/10 w-16"
                    placeholder="id"
                  />
                  <Input
                    value={a.label}
                    onChange={(e) => {
                      const n = [...addOns];
                      n[i] = { ...n[i]!, label: e.target.value };
                      setAddOns(n);
                    }}
                    className="bg-white/5 border-white/10 flex-1"
                    placeholder="Label"
                  />
                  <Input
                    value={a.price}
                    onChange={(e) => {
                      const n = [...addOns];
                      n[i] = { ...n[i]!, price: e.target.value };
                      setAddOns(n);
                    }}
                    className="bg-white/5 border-white/10 w-24"
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

            <Button
              type="button"
              className="w-full font-bold"
              disabled={savingPkg}
              onClick={() => void savePackage()}
              style={{
                background: "oklch(0.85 0.13 192)",
                color: "oklch(0.13 0.04 195)",
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

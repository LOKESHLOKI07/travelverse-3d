import { useActor } from "@/hooks/useActor";
import { ArrowLeft, Loader2, Mountain } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { CategoryView } from "../backend";
import type { Page } from "../types";
import type { TourPackageListing } from "../utils/catalogListing";
import {
  flattenCatalogViews,
  packagePriceHint,
} from "../utils/unifiedCatalog";

interface Props {
  setPage: (page: Page) => void;
  openPackageDetail: (packageId: bigint) => void;
}

export default function PackagesBrowsePage({
  setPage,
  openPackageDetail,
}: Props) {
  const { actor } = useActor();
  const [views, setViews] = useState<CategoryView[] | null>(null);

  useEffect(() => {
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
  }, [actor]);

  const grouped = useMemo(() => {
    if (!views) return [];
    const flat = flattenCatalogViews(views);
    const map = new Map<string, typeof flat>();
    for (const row of flat) {
      const k = row.categoryName;
      const arr = map.get(k) ?? [];
      arr.push(row);
      map.set(k, arr);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [views]);

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
            Packages{" "}
            <span style={{ color: "oklch(0.85 0.13 192)" }}>&amp; tours</span>
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
            Explore
          </p>
          <h1 className="font-display text-4xl md:text-6xl font-black text-foreground mb-4">
            All packages
            <br />
            <span style={{ color: "oklch(0.75 0.14 55)" }}>in one place</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Browse everything we offer. Pick a trip, configure dates, group size,
            and add-ons on the next screen — the same flow for every package.
          </p>
        </motion.div>

        {views === null ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          </div>
        ) : grouped.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">
            No packages available yet. Check back soon.
          </p>
        ) : (
          <div className="space-y-16">
            {grouped.map(([categoryName, rows], gi) => (
              <section key={categoryName}>
                <h2 className="font-display text-2xl font-bold mb-2 text-foreground/90">
                  {categoryName}
                </h2>
                <p className="text-sm text-muted-foreground mb-8 max-w-xl">
                  Trips in this collection — open any card to see details and
                  book.
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rows.map(({ pkg }, i) => {
                    const tl = pkg as TourPackageListing;
                    const thumb = String(tl.thumbnailUrl ?? "").trim();
                    const img = thumb || pkg.heroImageUrl;
                    const hint = packagePriceHint(pkg);
                    return (
                      <motion.button
                        key={`${categoryName}-${pkg.id.toString()}`}
                        type="button"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: gi * 0.05 + i * 0.04 }}
                        onClick={() => openPackageDetail(pkg.id)}
                        className="text-left rounded-2xl overflow-hidden border border-white/10 group hover:border-white/20 transition-colors"
                        style={{ background: "oklch(0.16 0.025 232 / 0.7)" }}
                      >
                        <div className="relative h-44 overflow-hidden">
                          <img
                            src={img}
                            alt=""
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
                        <div className="p-5">
                          <h3 className="font-display font-bold text-lg mb-1 line-clamp-2">
                            {pkg.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                            {pkg.shortDescription}
                          </p>
                          {hint ? (
                            <p
                              className="text-sm font-semibold"
                              style={{ color: "oklch(0.85 0.13 192)" }}
                            >
                              {hint}
                            </p>
                          ) : null}
                          <span className="mt-3 inline-block text-xs text-cyan-400/90">
                            View &amp; book →
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <footer className="text-center py-8 mt-16 text-xs text-muted-foreground border-t border-white/10">
        <Mountain className="w-4 h-4 inline mr-1" />
        Mountain Explorers · © {new Date().getFullYear()}
      </footer>
    </div>
  );
}

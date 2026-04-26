import { useActor } from "@/hooks/useActor";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Mountain, Search } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { CategoryView } from "../backend";
import type { PackageSearchFilters, Page } from "../types";
import type { TourPackageListing } from "../utils/catalogListing";
import {
  flattenCatalogViews,
  packagePriceHint,
} from "../utils/unifiedCatalog";

interface Props {
  setPage: (page: Page) => void;
  openPackageDetail: (packageId: bigint) => void;
  initialFilters?: PackageSearchFilters | null;
}

type WebsiteSearchResult = {
  id: string;
  title: string;
  excerpt: string;
  keywords: string[];
  sectionId?: string;
  page?: Page;
};

const WEBSITE_SEARCH_RESULTS: WebsiteSearchResult[] = [
  {
    id: "home-treks",
    title: "Featured Treks",
    excerpt: "Explore signature treks like Friendship Peak and Hampta Pass.",
    keywords: ["trek", "expedition", "summit", "friendship peak", "hampta"],
    sectionId: "treks",
  },
  {
    id: "home-journey",
    title: "Journey Route Map",
    excerpt: "View the route timeline from basecamp to summit day.",
    keywords: ["route", "day wise", "basecamp", "summit push", "map"],
    sectionId: "journey",
  },
  {
    id: "home-experience",
    title: "The Experience",
    excerpt: "Snow training, sunrise summit, and high-altitude camp stories.",
    keywords: ["experience", "story", "snow", "training", "sunrise"],
    sectionId: "experience",
  },
  {
    id: "home-about",
    title: "Why Choose Us",
    excerpt: "Certified guides, safety protocol, and small groups.",
    keywords: ["about", "safety", "guides", "small group", "gear"],
    sectionId: "about",
  },
  {
    id: "home-contact",
    title: "Contact Us",
    excerpt: "Reach us by phone, email, and social channels.",
    keywords: ["contact", "email", "phone", "support", "help"],
    sectionId: "contact",
  },
  {
    id: "page-account",
    title: "User Account",
    excerpt: "Sign in and manage your traveler profile details.",
    keywords: ["account", "login", "profile", "sign in"],
    page: "account",
  },
  {
    id: "page-bookings",
    title: "My Bookings",
    excerpt: "Track your booking history and reservation details.",
    keywords: ["booking", "reservation", "trip history", "my trips"],
    page: "my-bookings",
  },
];

export default function PackagesBrowsePage({
  setPage,
  openPackageDetail,
  initialFilters,
}: Props) {
  const { actor } = useActor();
  const [views, setViews] = useState<CategoryView[] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const minPriceFilter = initialFilters?.minPrice ?? 0;
  const maxPriceFilter = initialFilters?.maxPrice ?? Number.POSITIVE_INFINITY;

  useEffect(() => {
    setSearchTerm(initialFilters?.destination?.trim() ?? "");
  }, [initialFilters]);

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

  const filteredGrouped = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return grouped;
    return grouped
      .map(([categoryName, rows]) => {
        const filteredRows = rows.filter(({ pkg }) => {
          const listing = pkg as TourPackageListing;
          const searchable = [
            categoryName,
            pkg.name,
            pkg.shortDescription,
            listing.longDescription ?? "",
          ]
            .join(" ")
            .toLowerCase();
          return searchable.includes(query);
        });
        return [categoryName, filteredRows] as const;
      })
      .filter(([, rows]) => rows.length > 0);
  }, [grouped, searchTerm]);

  const priceAndSearchFiltered = useMemo(() => {
    return filteredGrouped
      .map(([categoryName, rows]) => {
        const nextRows = rows.filter(({ pkg }) => {
          const hint = packagePriceHint(pkg);
          const numericPart = String(hint ?? "").replace(/[^\d]/g, "");
          const price = numericPart ? Number(numericPart) : Number.NaN;
          if (!Number.isFinite(price)) return true;
          return price >= minPriceFilter && price <= maxPriceFilter;
        });
        return [categoryName, nextRows] as const;
      })
      .filter(([, rows]) => rows.length > 0);
  }, [filteredGrouped, minPriceFilter, maxPriceFilter]);

  const websiteMatches = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];
    return WEBSITE_SEARCH_RESULTS.filter((entry) => {
      const searchable = [
        entry.title,
        entry.excerpt,
        ...entry.keywords,
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [searchTerm]);

  const openWebsiteMatch = (result: WebsiteSearchResult) => {
    if (result.page) {
      setPage(result.page);
      return;
    }
    if (result.sectionId) {
      setPage("home");
      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          document.getElementById(result.sectionId!)?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 60);
      });
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
            Packages{" "}
            <span style={{ color: "oklch(var(--brand-blue))" }}>&amp; tours</span>
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
            style={{ color: "oklch(var(--brand-blue))" }}
          >
            Explore
          </p>
          <h1 className="font-display text-4xl md:text-6xl font-black text-foreground mb-4">
            All packages
            <br />
            <span style={{ color: "oklch(var(--brand-coral))" }}>in one place</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Browse everything we offer. Pick a trip, configure dates, group size,
            and add-ons on the next screen — the same flow for every package.
          </p>
          {(initialFilters?.destination ||
            initialFilters?.date ||
            initialFilters?.guests ||
            typeof initialFilters?.minPrice === "number" ||
            typeof initialFilters?.maxPrice === "number") && (
            <div className="mt-4 inline-flex flex-wrap items-center gap-2 text-xs">
              {initialFilters.destination ? (
                <span className="rounded-full border border-border px-3 py-1 text-foreground/80">
                  Destination: {initialFilters.destination}
                </span>
              ) : null}
              {initialFilters.date ? (
                <span className="rounded-full border border-border px-3 py-1 text-foreground/80">
                  Date: {initialFilters.date}
                </span>
              ) : null}
              {initialFilters.guests ? (
                <span className="rounded-full border border-border px-3 py-1 text-foreground/80">
                  Guests: {initialFilters.guests}
                </span>
              ) : null}
              {typeof initialFilters?.minPrice === "number" ||
              typeof initialFilters?.maxPrice === "number" ? (
                <span className="rounded-full border border-border px-3 py-1 text-foreground/80">
                  Price: ₹{(initialFilters?.minPrice ?? 0).toLocaleString("en-IN")}
                  {" - "}₹
                  {(initialFilters?.maxPrice ?? 45675).toLocaleString("en-IN")}
                </span>
              ) : null}
            </div>
          )}
          <div className="mt-6 max-w-xl relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by package name, description, or category"
              className="pl-9 h-11"
              aria-label="Search packages"
              autoFocus
            />
          </div>
        </motion.div>

        {views === null ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          </div>
        ) : grouped.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">
            No packages available yet. Check back soon.
          </p>
        ) : priceAndSearchFiltered.length === 0 && websiteMatches.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">
            No matches for &ldquo;{searchTerm.trim()}&rdquo;.
          </p>
        ) : (
          <div className="space-y-16">
            {websiteMatches.length > 0 && (
              <section>
                <h2 className="font-display text-2xl font-bold mb-2 text-foreground/90">
                  Website results
                </h2>
                <p className="text-sm text-muted-foreground mb-8 max-w-xl">
                  Jump directly to matching sections and pages.
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {websiteMatches.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => openWebsiteMatch(entry)}
                      className="text-left rounded-xl border border-border p-4 hover:border-primary/35 transition-colors"
                      style={{ background: "oklch(0.985 0.005 248 / 0.88)" }}
                    >
                      <p className="font-semibold text-foreground text-sm">
                        {entry.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">
                        {entry.excerpt}
                      </p>
                      <span className="mt-3 inline-block text-xs text-cyan/90">
                        Open result →
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            {priceAndSearchFiltered.map(([categoryName, rows], gi) => (
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
                        className="text-left rounded-2xl overflow-hidden border border-border group hover:border-primary/30 transition-colors"
                        style={{ background: "oklch(0.98 0.008 248 / 0.82)" }}
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
                                "linear-gradient(to top, oklch(0.22 0.07 248 / 0.78), transparent)",
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
                              style={{ color: "oklch(var(--brand-blue))" }}
                            >
                              {hint}
                            </p>
                          ) : null}
                          <span className="mt-3 inline-block text-xs text-cyan/90">
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

      <footer className="text-center py-8 mt-16 text-xs text-muted-foreground border-t border-border">
        <Mountain className="w-4 h-4 inline mr-1" />
        Mountain Explorers · © {new Date().getFullYear()}
      </footer>
    </div>
  );
}

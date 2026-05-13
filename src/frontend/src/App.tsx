import { Toaster } from "@/components/ui/sonner";
import { useCallback, useEffect, useRef, useState } from "react";
import AdminPage from "./components/AdminPage";
import CareersPage from "./components/CareersPage";
import GlobalNavbar from "./components/GlobalNavbar";
import HomePage from "./components/HomePage";
import HotelsPage from "./components/HotelsPage";
import PrivatePackagesPage from "./components/PrivatePackagesPage";
import TeamPage from "./components/TeamPage";
import PartnersPage from "./components/PartnersPage";
import TreksExpeditionsPage from "./components/TreksExpeditionsPage";
import UserAccountPage from "./components/UserAccountPage";
import MyBookingsPage from "./components/MyBookingsPage";
import PackageDetailPage from "./components/PackageDetailPage";
import PackagesBrowsePage from "./components/PackagesBrowsePage";
import type { PackageSearchFilters, Page } from "./types";

const HISTORY_V = 1 as const;

type AppHistoryState = {
  v: typeof HISTORY_V;
  /** Where package-detail “Back” goes when not using browser history. */
  returnTo?: Page | null;
  /** True when this entry was pushed opening a catalog package from inside the SPA. */
  spaDetail?: boolean;
};

function pathForPage(page: Page, packageId: bigint | null): string {
  if (page === "package-detail" && packageId != null) {
    return `/package/${packageId}`;
  }
  const paths: Record<Page, string> = {
    home: "/",
    admin: "/admin",
    account: "/account",
    careers: "/careers",
    partners: "/partners",
    team: "/team",
    packages: "/packages",
    "package-detail": "/",
    "my-bookings": "/my-bookings",
    "treks-expeditions": "/treks-expeditions",
    "private-packages": "/private-packages",
    hotels: "/hotels",
    "villas-farmhouses": "/villas-farmhouses",
  };
  return paths[page];
}

function parseLocation(): { page: Page; packageId: bigint | null } {
  if (typeof window === "undefined") {
    return { page: "home", packageId: null };
  }
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  const pkg = /^\/package\/(\d+)$/.exec(path);
  if (pkg) {
    try {
      return { page: "package-detail", packageId: BigInt(pkg[1]!) };
    } catch {
      return { page: "home", packageId: null };
    }
  }
  if (path === "/admin") return { page: "admin", packageId: null };
  if (path === "/account") return { page: "account", packageId: null };
  if (path === "/careers") return { page: "careers", packageId: null };
  if (path === "/partners") return { page: "partners", packageId: null };
  if (path === "/team") return { page: "team", packageId: null };
  if (path === "/packages") return { page: "packages", packageId: null };
  if (path === "/hotels") return { page: "hotels", packageId: null };
  if (path === "/villas-farmhouses") return { page: "villas-farmhouses", packageId: null };
  if (path === "/treks-expeditions") return { page: "treks-expeditions", packageId: null };
  if (path === "/private-packages") return { page: "private-packages", packageId: null };
  if (path === "/my-bookings") return { page: "my-bookings", packageId: null };
  return { page: "home", packageId: null };
}

export default function App() {
  const [page, setPageState] = useState<Page>(() => parseLocation().page);
  const [selectedPackageId, setSelectedPackageId] = useState<bigint | null>(
    () => parseLocation().packageId,
  );
  const [packageSearchFilters, setPackageSearchFilters] =
    useState<PackageSearchFilters | null>(null);
  /** When set via `openPackageDetail`, in-app “Back” returns here if we cannot `history.back()`. */
  const packageDetailReturnRef = useRef<Page | null>(null);

  /** Sync `returnTo` ref when landing on a package URL with history state (refresh / share). */
  useEffect(() => {
    if (parseLocation().page !== "package-detail") return;
    const st = window.history.state as AppHistoryState | null;
    if (st?.returnTo !== undefined) {
      packageDetailReturnRef.current = st.returnTo ?? null;
    }
  }, []);

  const setPage = useCallback((p: Page) => {
    if (p !== "package-detail") {
      setSelectedPackageId(null);
    }
    setPageState(p);
    const nextPath = pathForPage(p, null);
    const state: AppHistoryState = { v: HISTORY_V, returnTo: null };
    window.history.pushState(state, "", nextPath);
  }, []);

  const openPackagesCatalog = useCallback((filters?: PackageSearchFilters) => {
    setSelectedPackageId(null);
    setPackageSearchFilters(filters ?? null);
    setPage("packages");
  }, [setPage]);

  const openPackageDetail = useCallback(
    (id: bigint, opts?: { returnToPage: Page | null }) => {
      if (opts !== undefined) {
        packageDetailReturnRef.current = opts.returnToPage;
      }
      const returnTo = packageDetailReturnRef.current;
      setSelectedPackageId(id);
      setPageState("package-detail");
      const path = pathForPage("package-detail", id);
      const state: AppHistoryState = {
        v: HISTORY_V,
        returnTo,
        spaDetail: true,
      };
      window.history.pushState(state, "", path);
    },
    [],
  );

  const backFromPackageDetail = useCallback(() => {
    const ret = packageDetailReturnRef.current;
    const st = window.history.state as AppHistoryState | null;
    if (st?.spaDetail) {
      packageDetailReturnRef.current = null;
      window.history.back();
      return;
    }
    packageDetailReturnRef.current = null;
    setSelectedPackageId(null);
    const backPage = ret ?? "packages";
    setPageState(backPage);
    window.history.pushState(
      { v: HISTORY_V, returnTo: null },
      "",
      pathForPage(backPage, null),
    );
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const { page: p, packageId } = parseLocation();
      setPageState(p);
      setSelectedPackageId(packageId);
      const st = window.history.state as AppHistoryState | null;
      if (p === "package-detail" && st?.returnTo !== undefined) {
        packageDetailReturnRef.current = st.returnTo ?? null;
      } else {
        packageDetailReturnRef.current = null;
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const showGlobalNavbar = page !== "home";

  return (
    <div className="min-h-screen bg-background" style={{ background: "var(--app-page-gradient)" }}>
      <Toaster position="top-right" richColors />
      {showGlobalNavbar && (
        <GlobalNavbar
          setPage={setPage}
          openPackagesCatalog={openPackagesCatalog}
        />
      )}
      {page === "home" && (
        <HomePage setPage={setPage} openPackagesCatalog={openPackagesCatalog} />
      )}
      {showGlobalNavbar && <div className="h-[124px] sm:h-[140px]" />}
      {page === "careers" && <CareersPage setPage={setPage} />}
      {page === "partners" && <PartnersPage setPage={setPage} />}
      {page === "team" && <TeamPage setPage={setPage} />}
      {page === "treks-expeditions" && (
        <TreksExpeditionsPage setPage={setPage} />
      )}
      {page === "private-packages" && (
        <PrivatePackagesPage setPage={setPage} />
      )}
      {page === "hotels" && (
        <HotelsPage
          setPage={setPage}
          initialTab="hotels"
          openCatalogPackageDetail={(id) =>
            openPackageDetail(id, { returnToPage: "hotels" })
          }
        />
      )}
      {page === "villas-farmhouses" && (
        <HotelsPage
          setPage={setPage}
          initialTab="villas"
          openCatalogPackageDetail={(id) =>
            openPackageDetail(id, { returnToPage: "villas-farmhouses" })
          }
        />
      )}
      {page === "packages" && (
        <PackagesBrowsePage
          setPage={setPage}
          openPackageDetail={(id) =>
            openPackageDetail(id, { returnToPage: null })
          }
          initialFilters={packageSearchFilters}
        />
      )}
      {page === "package-detail" && (
        <PackageDetailPage
          packageId={selectedPackageId}
          setPage={setPage}
          onBackToList={backFromPackageDetail}
          onOpenPackageDetail={openPackageDetail}
        />
      )}
      {page === "my-bookings" && <MyBookingsPage setPage={setPage} />}
      {page === "account" && <UserAccountPage setPage={setPage} />}
      {page === "admin" && <AdminPage setPage={setPage} />}
    </div>
  );
}

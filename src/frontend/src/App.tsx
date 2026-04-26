import { Toaster } from "@/components/ui/sonner";
import { useCallback, useEffect, useState } from "react";
import AdminPage from "./components/AdminPage";
import CareersPage from "./components/CareersPage";
import GlobalNavbar from "./components/GlobalNavbar";
import HomePage from "./components/HomePage";
import TeamPage from "./components/TeamPage";
import PartnersPage from "./components/PartnersPage";
import UserAccountPage from "./components/UserAccountPage";
import MyBookingsPage from "./components/MyBookingsPage";
import PackageDetailPage from "./components/PackageDetailPage";
import PackagesBrowsePage from "./components/PackagesBrowsePage";
import type { PackageSearchFilters, Page } from "./types";

function initialPageFromPath(): Page {
  if (typeof window === "undefined") return "home";
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  if (path === "/admin") return "admin";
  if (path === "/account") return "account";
  if (path === "/careers") return "careers";
  if (path === "/partners") return "partners";
  if (path === "/team") return "team";
  return "home";
}

export default function App() {
  const [page, setPageState] = useState<Page>(initialPageFromPath);
  const [selectedPackageId, setSelectedPackageId] = useState<bigint | null>(
    null,
  );
  const [packageSearchFilters, setPackageSearchFilters] =
    useState<PackageSearchFilters | null>(null);

  const setPage = useCallback((p: Page) => {
    setPageState(p);
    if (p === "admin") {
      if (window.location.pathname !== "/admin") {
        window.history.pushState(null, "", "/admin");
      }
    } else if (p === "account") {
      if (window.location.pathname !== "/account") {
        window.history.pushState(null, "", "/account");
      }
    } else if (p === "careers") {
      if (window.location.pathname !== "/careers") {
        window.history.pushState(null, "", "/careers");
      }
    } else if (p === "partners") {
      if (window.location.pathname !== "/partners") {
        window.history.pushState(null, "", "/partners");
      }
    } else if (p === "team") {
      if (window.location.pathname !== "/team") {
        window.history.pushState(null, "", "/team");
      }
    } else if (
      window.location.pathname === "/admin" ||
      window.location.pathname === "/account" ||
      window.location.pathname === "/careers" ||
      window.location.pathname === "/partners" ||
      window.location.pathname === "/team"
    ) {
      window.history.pushState(null, "", "/");
    }
  }, []);

  const openPackagesCatalog = useCallback((filters?: PackageSearchFilters) => {
    setSelectedPackageId(null);
    setPackageSearchFilters(filters ?? null);
    setPage("packages");
  }, [setPage]);

  const openPackageDetail = useCallback((id: bigint) => {
    setSelectedPackageId(id);
    setPage("package-detail");
  }, [setPage]);

  const backFromPackageDetail = useCallback(() => {
    setSelectedPackageId(null);
    setPage("packages");
  }, [setPage]);

  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname.replace(/\/$/, "") || "/";
      if (path === "/admin") setPageState("admin");
      else if (path === "/account") setPageState("account");
      else if (path === "/careers") setPageState("careers");
      else if (path === "/partners") setPageState("partners");
      else if (path === "/team") setPageState("team");
      else setPageState("home");
      setSelectedPackageId(null);
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
      {page === "packages" && (
        <PackagesBrowsePage
          setPage={setPage}
          openPackageDetail={openPackageDetail}
          initialFilters={packageSearchFilters}
        />
      )}
      {page === "package-detail" && (
        <PackageDetailPage
          packageId={selectedPackageId}
          setPage={setPage}
          onBackToList={backFromPackageDetail}
        />
      )}
      {page === "my-bookings" && <MyBookingsPage setPage={setPage} />}
      {page === "account" && <UserAccountPage setPage={setPage} />}
      {page === "admin" && <AdminPage setPage={setPage} />}
    </div>
  );
}

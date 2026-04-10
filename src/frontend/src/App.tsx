import { Toaster } from "@/components/ui/sonner";
import { useCallback, useEffect, useState } from "react";
import AdminPage from "./components/AdminPage";
import HomePage from "./components/HomePage";
import UserAccountPage from "./components/UserAccountPage";
import MyBookingsPage from "./components/MyBookingsPage";
import PackageDetailPage from "./components/PackageDetailPage";
import PackagesBrowsePage from "./components/PackagesBrowsePage";
import type { Page } from "./types";

function initialPageFromPath(): Page {
  if (typeof window === "undefined") return "home";
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  if (path === "/admin") return "admin";
  if (path === "/account") return "account";
  return "home";
}

export default function App() {
  const [page, setPageState] = useState<Page>(initialPageFromPath);
  const [selectedPackageId, setSelectedPackageId] = useState<bigint | null>(
    null,
  );

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
    } else if (
      window.location.pathname === "/admin" ||
      window.location.pathname === "/account"
    ) {
      window.history.pushState(null, "", "/");
    }
  }, []);

  const openPackagesCatalog = useCallback(() => {
    setSelectedPackageId(null);
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
      else setPageState("home");
      setSelectedPackageId(null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const bg =
    "linear-gradient(160deg, oklch(0.13 0.025 232) 0%, oklch(0.09 0.018 232) 100%)";

  return (
    <div className="min-h-screen" style={{ background: bg }}>
      <Toaster position="top-right" richColors />
      {page === "home" && (
        <HomePage setPage={setPage} openPackagesCatalog={openPackagesCatalog} />
      )}
      {page === "packages" && (
        <PackagesBrowsePage
          setPage={setPage}
          openPackageDetail={openPackageDetail}
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

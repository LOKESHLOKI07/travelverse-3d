import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import AdminPage from "./components/AdminPage";
import FixedPackagesPage from "./components/FixedPackagesPage";
import HomePage from "./components/HomePage";
import HotelsPage from "./components/HotelsPage";
import MyBookingsPage from "./components/MyBookingsPage";
import PrivatePackagesPage from "./components/PrivatePackagesPage";
import TrekDetailPage from "./components/TrekDetailPage";
import TreksExpeditionsPage from "./components/TreksExpeditionsPage";
import type { Page } from "./types";

export default function App() {
  const [page, setPage] = useState<Page>("home");

  const openBooking = (dest?: string) => {
    // legacy: navigate to home and open booking
    console.log("openBooking", dest);
  };

  const bg =
    "linear-gradient(160deg, oklch(0.13 0.025 232) 0%, oklch(0.09 0.018 232) 100%)";

  return (
    <div className="min-h-screen" style={{ background: bg }}>
      <Toaster position="top-right" richColors />
      {page === "home" && (
        <HomePage setPage={setPage} openBooking={openBooking} />
      )}
      {page === "trek-detail" && (
        <TrekDetailPage setPage={setPage} openBooking={openBooking} />
      )}
      {page === "private-packages" && <PrivatePackagesPage setPage={setPage} />}
      {page === "fixed-packages" && <FixedPackagesPage setPage={setPage} />}
      {page === "treks-expeditions" && (
        <TreksExpeditionsPage setPage={setPage} />
      )}
      {page === "hotels" && <HotelsPage setPage={setPage} />}
      {page === "my-bookings" && <MyBookingsPage setPage={setPage} />}
      {page === "admin" && <AdminPage setPage={setPage} />}
    </div>
  );
}

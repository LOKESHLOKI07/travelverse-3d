import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import BookingModal from "./components/BookingModal";
import HomePage from "./components/HomePage";
import TrekDetailPage from "./components/TrekDetailPage";

type Page = "home" | "trek-detail";

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDest, setSelectedDest] = useState<string | undefined>();

  const openBooking = (dest?: string) => {
    setSelectedDest(dest);
    setModalOpen(true);
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(160deg, oklch(0.13 0.025 232) 0%, oklch(0.09 0.018 232) 100%)",
      }}
    >
      <Toaster position="top-right" />

      {page === "home" ? (
        <HomePage setPage={setPage} openBooking={openBooking} />
      ) : (
        <TrekDetailPage setPage={setPage} openBooking={openBooking} />
      )}

      <BookingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultDestination={selectedDest}
      />
    </div>
  );
}

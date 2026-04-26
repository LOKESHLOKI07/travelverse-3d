import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { ArrowLeft, Calendar, Loader2, Mountain, Package } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Booking } from "../backend.d";
import type { Page } from "../types";
import { getUserBearerToken } from "../utils/userLocalSession";
import { viteEnvIsTrue } from "../utils/viteEnv";

interface Props {
  setPage: (page: Page) => void;
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  pending: { bg: "oklch(0.55 0.11 36 / 0.2)", color: "oklch(var(--brand-coral))" },
  confirmed: {
    bg: "oklch(0.45 0.18 145 / 0.2)",
    color: "oklch(0.65 0.18 145)",
  },
  cancelled: { bg: "oklch(0.45 0.18 25 / 0.2)", color: "oklch(0.65 0.18 25)" },
};

export default function MyBookingsPage({ setPage }: Props) {
  const { actor, isFetching } = useActor();
  const { login, loginStatus, identity } = useInternetIdentity();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const nodeBackend = viteEnvIsTrue(import.meta.env.VITE_USE_NODE_BACKEND);
  const hasLocalUserJwt = Boolean(getUserBearerToken());
  const canAccessBookings = Boolean(identity) || (nodeBackend && hasLocalUserJwt);

  useEffect(() => {
    if (!actor || isFetching || !canAccessBookings) return;
    setLoading(true);
    actor
      .getMyBookings()
      .then((b) => setBookings(b))
      .catch(() => toast.error("Failed to load bookings"))
      .finally(() => setLoading(false));
  }, [actor, isFetching, canAccessBookings]);

  if (!canAccessBookings) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background:
            "var(--app-page-gradient)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8 rounded-2xl border border-border"
          style={{ background: "oklch(0.99 0.006 248 / 0.88)" }}
        >
          <Package
            className="w-12 h-12 mx-auto mb-4"
            style={{ color: "oklch(var(--brand-blue))" }}
          />
          <h2 className="font-display text-2xl font-bold mb-2">
            View Your Bookings
          </h2>
          <p className="text-muted-foreground mb-6">
            {nodeBackend
              ? "Sign in with Internet Identity or your email account to see bookings that match your profile."
              : "Please log in to see your bookings."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
            {nodeBackend && (
              <Button
                type="button"
                variant="outline"
                className="border-border"
                onClick={() => setPage("account")}
              >
                Email sign-in
              </Button>
            )}
            <Button
              data-ocid="mybookings.login.primary_button"
              onClick={() => login()}
              disabled={loginStatus === "logging-in"}
              style={{
                background: "oklch(var(--brand-blue))",
                color: "oklch(0.985 0.005 85)",
                fontWeight: 700,
              }}
            >
              {loginStatus === "logging-in" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Internet Identity"
              )}
            </Button>
          </div>
          <div className="mt-4">
            <button
              type="button"
              data-ocid="mybookings.back.link"
              onClick={() => setPage("home")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

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
            My <span style={{ color: "oklch(var(--brand-blue))" }}>Bookings</span>
          </span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <h1 className="font-display text-3xl font-black mb-2">
            My <span style={{ color: "oklch(var(--brand-coral))" }}>Bookings</span>
          </h1>
          <p className="text-muted-foreground">
            Track all your adventure reservations.
          </p>
        </motion.div>

        {loading ? (
          <div data-ocid="mybookings.loading_state" className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div
            data-ocid="mybookings.empty_state"
            className="text-center py-24 rounded-2xl border border-border"
            style={{ background: "oklch(0.98 0.008 248 / 0.48)" }}
          >
            <Mountain className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <h3 className="font-display text-xl font-bold mb-2">
              No bookings yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Your adventures await. Browse all packages and book your first
              trip.
            </p>
            <Button
              data-ocid="mybookings.explore.primary_button"
              onClick={() => setPage("packages")}
              style={{
                background: "oklch(var(--brand-blue))",
                color: "oklch(0.985 0.005 85)",
                fontWeight: 700,
              }}
            >
              Browse packages
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking, idx) => {
              const ss = STATUS_STYLES[booking.status] ?? {
                bg: "oklch(0.22 0.038 228)",
                color: "oklch(0.62 0.04 228)",
              };
              return (
                <motion.div
                  key={String(booking.bookingId)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  data-ocid={`mybookings.item.${idx + 1}`}
                  className="rounded-2xl p-6 border border-border"
                  style={{
                    background: "oklch(0.98 0.008 248 / 0.72)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-display font-bold text-lg">
                        {booking.packageName}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {booking.packageCategory}
                      </p>
                    </div>
                    <Badge
                      style={{
                        background: ss.bg,
                        color: ss.color,
                        border: `1px solid ${ss.color}44`,
                      }}
                    >
                      {booking.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Travel Date
                      </p>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {booking.travelDate}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Group Size
                      </p>
                      <p className="text-sm font-medium">
                        {String(booking.groupSize)} person
                        {Number(booking.groupSize) > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Total Paid
                      </p>
                      <p
                        className="text-sm font-bold"
                        style={{ color: "oklch(var(--brand-blue))" }}
                      >
                        ₹{Number(booking.totalPriceINR).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Booking ID
                      </p>
                      <p className="text-sm font-mono">
                        #{String(booking.bookingId)}
                      </p>
                    </div>
                  </div>
                  {booking.addOns.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-2">
                        Add-ons:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {booking.addOns.map((a) => (
                          <span
                            key={a}
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              background: "oklch(0.22 0.04 228)",
                              color: "oklch(0.74 0.04 228)",
                            }}
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

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

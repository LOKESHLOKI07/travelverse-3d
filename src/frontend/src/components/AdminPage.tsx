import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { ArrowLeft, Loader2, Mountain, Shield } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BookingStatus } from "../backend.d";
import type { Booking } from "../backend.d";
import type { Page } from "../types";

interface Props {
  setPage: (page: Page) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "oklch(0.7 0.14 55)",
  confirmed: "oklch(0.65 0.18 145)",
  cancelled: "oklch(0.6 0.18 25)",
};

export default function AdminPage({ setPage }: Props) {
  const { actor, isFetching } = useActor();
  const { login, loginStatus, identity } = useInternetIdentity();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<
    "all" | "pending" | "confirmed" | "cancelled"
  >("all");
  const [updating, setUpdating] = useState<bigint | null>(null);

  useEffect(() => {
    if (!actor || isFetching) return;
    actor
      .isCallerAdmin()
      .then((v) => setIsAdmin(v))
      .catch(() => setIsAdmin(false));
  }, [actor, isFetching]);

  useEffect(() => {
    if (!actor || !isAdmin) return;
    setLoading(true);
    actor
      .getAllBookings()
      .then((b) => setBookings(b))
      .catch(() => toast.error("Failed to load bookings"))
      .finally(() => setLoading(false));
  }, [actor, isAdmin]);

  const handleStatusChange = async (bookingId: bigint, newStatus: string) => {
    if (!actor) return;
    setUpdating(bookingId);
    try {
      const statusMap: Record<string, BookingStatus> = {
        pending: BookingStatus.pending,
        confirmed: BookingStatus.confirmed,
        cancelled: BookingStatus.cancelled,
      };
      await actor.updateBookingStatus(bookingId, statusMap[newStatus]);
      setBookings((prev) =>
        prev.map((b) =>
          b.bookingId === bookingId
            ? { ...b, status: statusMap[newStatus] }
            : b,
        ),
      );
      toast.success("Status updated");
    } catch {
      toast.error("Update failed");
    } finally {
      setUpdating(null);
    }
  };

  const filteredBookings = bookings.filter(
    (b) => filter === "all" || b.status === filter,
  );

  if (!identity) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background:
            "linear-gradient(160deg, oklch(0.13 0.025 232) 0%, oklch(0.09 0.018 232) 100%)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8 rounded-2xl border border-white/10"
          style={{ background: "oklch(0.16 0.025 232 / 0.8)" }}
        >
          <Shield
            className="w-12 h-12 mx-auto mb-4"
            style={{ color: "oklch(0.85 0.13 192)" }}
          />
          <h2 className="font-display text-2xl font-bold mb-2">
            Admin Access Required
          </h2>
          <p className="text-muted-foreground mb-6">
            Please log in to access the admin panel.
          </p>
          <Button
            data-ocid="admin.login.primary_button"
            onClick={() => login()}
            disabled={loginStatus === "logging-in"}
            style={{
              background: "oklch(0.85 0.13 192)",
              color: "oklch(0.13 0.04 195)",
              fontWeight: 700,
            }}
          >
            {loginStatus === "logging-in" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </Button>
          <div className="mt-4">
            <button
              type="button"
              data-ocid="admin.back.link"
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

  if (isAdmin === false) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background:
            "linear-gradient(160deg, oklch(0.13 0.025 232) 0%, oklch(0.09 0.018 232) 100%)",
        }}
      >
        <div
          data-ocid="admin.error_state"
          className="text-center p-8 rounded-2xl border border-white/10"
          style={{ background: "oklch(0.16 0.025 232 / 0.8)" }}
        >
          <h2 className="font-display text-2xl font-bold mb-2">
            Access Denied
          </h2>
          <p className="text-muted-foreground mb-6">
            You don't have admin privileges.
          </p>
          <Button
            data-ocid="admin.back.primary_button"
            onClick={() => setPage("home")}
            style={{
              background: "oklch(0.85 0.13 192)",
              color: "oklch(0.13 0.04 195)",
            }}
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

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
            Admin <span style={{ color: "oklch(0.85 0.13 192)" }}>Panel</span>
          </span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl font-black mb-2">
            Bookings{" "}
            <span style={{ color: "oklch(0.75 0.14 55)" }}>Management</span>
          </h1>
          <p className="text-muted-foreground">
            View and manage all customer bookings.
          </p>
        </motion.div>

        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as typeof filter)}
          data-ocid="admin.filter.tab"
        >
          <TabsList
            className="mb-6"
            style={{ background: "oklch(0.16 0.025 232)" }}
          >
            <TabsTrigger data-ocid="admin.all.tab" value="all">
              All ({bookings.length})
            </TabsTrigger>
            <TabsTrigger data-ocid="admin.pending.tab" value="pending">
              Pending ({bookings.filter((b) => b.status === "pending").length})
            </TabsTrigger>
            <TabsTrigger data-ocid="admin.confirmed.tab" value="confirmed">
              Confirmed (
              {bookings.filter((b) => b.status === "confirmed").length})
            </TabsTrigger>
            <TabsTrigger data-ocid="admin.cancelled.tab" value="cancelled">
              Cancelled (
              {bookings.filter((b) => b.status === "cancelled").length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div data-ocid="admin.loading_state" className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div
            data-ocid="admin.empty_state"
            className="text-center py-20 text-muted-foreground"
          >
            <Mountain className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No bookings found.</p>
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden border border-white/10"
            style={{ background: "oklch(0.16 0.025 232 / 0.6)" }}
          >
            <Table data-ocid="admin.bookings.table">
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-muted-foreground">ID</TableHead>
                  <TableHead className="text-muted-foreground">
                    Customer
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Package
                  </TableHead>
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground">
                    Amount
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking, idx) => (
                  <TableRow
                    key={String(booking.bookingId)}
                    data-ocid={`admin.bookings.row.${idx + 1}`}
                    className="border-white/10 hover:bg-white/5"
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{String(booking.bookingId)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">
                        {booking.customerName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {booking.customerEmail}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{booking.packageName}</div>
                      <div className="text-xs text-muted-foreground">
                        {booking.packageCategory}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {booking.travelDate}
                    </TableCell>
                    <TableCell
                      className="font-semibold text-sm"
                      style={{ color: "oklch(0.85 0.13 192)" }}
                    >
                      ₹{Number(booking.totalPriceINR).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        style={{
                          background:
                            STATUS_COLORS[booking.status] ??
                            "oklch(0.5 0.05 232)",
                          color: "white",
                        }}
                      >
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {updating === booking.bookingId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Select
                          value={booking.status}
                          onValueChange={(v) =>
                            handleStatusChange(booking.bookingId, v)
                          }
                        >
                          <SelectTrigger
                            data-ocid={`admin.status.select.${idx + 1}`}
                            className="w-32 h-8 text-xs bg-white/5 border-white/10"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent
                            style={{
                              background: "oklch(0.18 0.025 232)",
                              border: "1px solid oklch(0.3 0.04 232 / 0.5)",
                            }}
                          >
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <footer className="text-center py-8 mt-16 text-xs text-muted-foreground border-t border-white/10">
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

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarGlyph, Mail, MapPin, User, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import DatePickerField, { parseIsoDateLocal } from "./DatePickerField";

const DESTINATIONS = [
  "Santorini, Greece",
  "Kyoto, Japan",
  "Machu Picchu, Peru",
  "Maldives",
];

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  defaultDestination?: string;
}

export default function BookingModal({
  open,
  onClose,
  defaultDestination,
}: BookingModalProps) {
  const [form, setForm] = useState({
    destination: defaultDestination || "",
    checkIn: "",
    checkOut: "",
    guests: "2",
    name: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);

  const checkoutFromDate = useMemo(() => {
    const ci = parseIsoDateLocal(form.checkIn);
    if (!ci) return undefined;
    return new Date(ci.getFullYear(), ci.getMonth(), ci.getDate() + 1);
  }, [form.checkIn]);

  const checkinToDate = useMemo(() => {
    const co = parseIsoDateLocal(form.checkOut);
    if (!co) return undefined;
    return new Date(co.getFullYear(), co.getMonth(), co.getDate() - 1);
  }, [form.checkOut]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    toast.success("Booking confirmed! Check your email for details.");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-ocid="booking.dialog"
        className="max-w-lg text-foreground"
        style={{
          background: "oklch(0.98 0.009 248)",
          border: "1px solid oklch(0.88 0.02 248 / 0.55)",
        }}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display text-xl font-bold text-foreground">
              Reserve Your Adventure
            </DialogTitle>
            <button
              type="button"
              data-ocid="booking.close_button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="booking-dest"
              className="text-sm text-muted-foreground flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-cyan" /> Destination
            </Label>
            <Select
              value={form.destination}
              onValueChange={(v) => setForm((p) => ({ ...p, destination: v }))}
            >
              <SelectTrigger
                id="booking-dest"
                data-ocid="booking.select"
                className="text-foreground"
                style={{
                  background: "oklch(0.99 0.006 248)",
                  borderColor: "oklch(0.88 0.02 248)",
                }}
              >
                <SelectValue placeholder="Choose destination" />
              </SelectTrigger>
              <SelectContent style={{ background: "oklch(0.21 0.048 228)" }}>
                {DESTINATIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="booking-checkin"
                className="text-sm text-muted-foreground flex items-center gap-1.5"
              >
                <CalendarGlyph className="w-3.5 h-3.5 text-cyan" /> Check In
              </Label>
              <DatePickerField
                id="booking-checkin"
                value={form.checkIn}
                onChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    checkIn: v,
                    checkOut:
                      p.checkOut && v && p.checkOut <= v ? "" : p.checkOut,
                  }))
                }
                placeholder="Check-in date"
                toDate={checkinToDate}
                required
                triggerClassName="text-foreground bg-muted/70 border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="booking-checkout"
                className="text-sm text-muted-foreground flex items-center gap-1.5"
              >
                <CalendarGlyph className="w-3.5 h-3.5 text-cyan" /> Check Out
              </Label>
              <DatePickerField
                id="booking-checkout"
                value={form.checkOut}
                onChange={(v) => setForm((p) => ({ ...p, checkOut: v }))}
                placeholder="Check-out date"
                fromDate={checkoutFromDate}
                required
                triggerClassName="text-foreground bg-muted/70 border-border"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="booking-guests"
              className="text-sm text-muted-foreground flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-cyan" /> Guests
            </Label>
            <Input
              id="booking-guests"
              type="number"
              min="1"
              max="20"
              value={form.guests}
              onChange={(e) =>
                setForm((p) => ({ ...p, guests: e.target.value }))
              }
              className="text-foreground"
              style={{
                background: "oklch(0.99 0.006 248)",
                borderColor: "oklch(0.88 0.02 248)",
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="booking-name"
              className="text-sm text-muted-foreground flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-cyan" /> Full Name
            </Label>
            <Input
              id="booking-name"
              data-ocid="booking.input"
              placeholder="Your full name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="text-foreground placeholder:text-muted-foreground"
              style={{
                background: "oklch(0.99 0.006 248)",
                borderColor: "oklch(0.88 0.02 248)",
              }}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="booking-email"
              className="text-sm text-muted-foreground flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5 text-cyan" /> Email
            </Label>
            <Input
              id="booking-email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) =>
                setForm((p) => ({ ...p, email: e.target.value }))
              }
              className="text-foreground placeholder:text-muted-foreground"
              style={{
                background: "oklch(0.99 0.006 248)",
                borderColor: "oklch(0.88 0.02 248)",
              }}
              required
            />
          </div>

          <Button
            data-ocid="booking.submit_button"
            type="submit"
            disabled={loading}
            className="w-full pill-btn font-bold tracking-widest"
            style={{
              background: "oklch(var(--brand-blue))",
              color: "oklch(0.985 0.005 85)",
            }}
          >
            {loading ? "BOOKING..." : "CONFIRM BOOKING"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

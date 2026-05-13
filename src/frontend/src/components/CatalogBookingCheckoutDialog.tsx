import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export type CatalogBookingCheckoutResult = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
};

const COUNTRIES = [
  "India",
  "United Kingdom",
  "United States",
  "United Arab Emirates",
  "Canada",
  "Australia",
  "Other",
];

const DEFAULT_TERMS = `Health and Fitness:
1. Participants must disclose any pre-existing medical conditions, allergies, and fitness limitations before confirming a booking.
2. Some itineraries require a doctor's clearance for high-altitude or strenuous activities.
3. Mountain Explorers reserves the right to refuse participation if safety criteria are not met.

Booking & Payment:
4. You may be asked to pay online after we confirm availability for your dates and party size.
5. A confirmation email will be sent to the address you provide; please ensure it is correct.
6. Prices are quoted in INR unless stated otherwise. Taxes or fees shown at checkout apply to your booking.

Cancellation:
7. Cancellation and refund rules depend on the specific product and season. Our team will confirm the policy that applies to your booking.

Liability:
8. Travel involves inherent risks. You participate at your own risk and agree to follow guide instructions at all times.

Contact:
9. For changes or emergencies, reach us using the phone or email shown on our website.`;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function makeOrderRef() {
  const d = new Date();
  const head = `${String(d.getFullYear()).slice(2)}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
  const tail = String(Math.floor(Math.random() * 1e9)).padStart(9, "0");
  return `${head}-${tail}`;
}

export type CatalogBookingCheckoutDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Shown under "Checkout" on the left */
  productTitle: string;
  categoryLine?: string;
  summaryImageUrl?: string;
  dateFromLabel?: string;
  dateToLabel?: string;
  departureLabel?: string;
  guestsLine?: string;
  extraSummaryRows?: { label: string; value: string }[];
  /** Base amount before GST (INR). If omitted, treated as \`totalINR\` when GST is 0. */
  subtotalINR: number;
  /** GST as percent of subtotal (e.g. 5). Use 0 to match legacy totals with no tax line. */
  gstPercent?: number;
  /** Optional amount already paid toward this order (display only). */
  amountPaidINR?: number;
  /** Dates, rooms, add-ons, warnings — rendered above contact fields */
  formTop?: React.ReactNode;
  addonSection?: React.ReactNode;
  extraGuestSlots?: number;
  termsText?: string;
  loading?: boolean;
  submitDisabled?: boolean;
  submitLabel?: string;
  onSubmit: (payload: CatalogBookingCheckoutResult) => void | Promise<void>;
};

export default function CatalogBookingCheckoutDialog({
  open,
  onOpenChange,
  productTitle,
  categoryLine = "Booking",
  summaryImageUrl,
  dateFromLabel,
  dateToLabel,
  departureLabel,
  guestsLine,
  extraSummaryRows,
  subtotalINR,
  gstPercent = 0,
  amountPaidINR = 0,
  formTop,
  addonSection,
  extraGuestSlots = 0,
  termsText = DEFAULT_TERMS,
  loading = false,
  submitDisabled = false,
  submitLabel = "Complete my order",
  onSubmit,
}: CatalogBookingCheckoutDialogProps) {
  const [orderRef, setOrderRef] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [extraGuests, setExtraGuests] = useState<{ first: string; last: string }[]>(
    [],
  );
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (!open) {
      setFirstName("");
      setLastName("");
      setEmail("");
      setEmailConfirm("");
      setPhone("");
      setCountry("India");
      setState("");
      setCity("");
      setAddress("");
      setExtraGuests([]);
      setTermsAccepted(false);
      return;
    }
    setOrderRef(makeOrderRef());
    setExtraGuests(
      Array.from({ length: Math.max(0, extraGuestSlots) }, () => ({
        first: "",
        last: "",
      })),
    );
  }, [open, extraGuestSlots]);

  const gstAmount = useMemo(() => {
    if (gstPercent <= 0) return 0;
    return Math.round((subtotalINR * gstPercent) / 100);
  }, [subtotalINR, gstPercent]);

  const totalINR = subtotalINR + gstAmount;
  const amountDue = Math.max(0, totalINR - amountPaidINR);

  const buildCustomerName = useCallback(() => {
    const lead = `${firstName.trim()} ${lastName.trim()}`.trim();
    const co = extraGuests
      .map((g) => `${g.first.trim()} ${g.last.trim()}`.trim())
      .filter(Boolean);
    const bits = [lead];
    if (co.length) bits.push(`Co-travelers: ${co.join(", ")}`);
    const bill = [city.trim(), state.trim(), country]
      .filter(Boolean)
      .join(", ");
    if (bill || address.trim()) {
      bits.push(
        `Billing${bill ? `: ${bill}` : ""}${address.trim() ? ` — ${address.trim()}` : ""}`,
      );
    }
    return bits.join(" · ");
  }, [
    firstName,
    lastName,
    extraGuests,
    city,
    state,
    country,
    address,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Please enter your first and last name.");
      return;
    }
    if (!email.trim() || !emailConfirm.trim()) {
      toast.error("Please enter and confirm your email.");
      return;
    }
    if (email.trim().toLowerCase() !== emailConfirm.trim().toLowerCase()) {
      toast.error("Email addresses do not match.");
      return;
    }
    if (!phone.trim()) {
      toast.error("Please enter your contact phone.");
      return;
    }
    if (!termsAccepted) {
      toast.error("Please read and accept the terms and conditions.");
      return;
    }
    await onSubmit({
      customerName: buildCustomerName(),
      customerEmail: email.trim(),
      customerPhone: phone.trim(),
    });
  };

  const updateExtraGuest = (
    index: number,
    field: "first" | "last",
    value: string,
  ) => {
    setExtraGuests((prev) => {
      const next = [...prev];
      const row = next[index] ?? { first: "", last: "" };
      next[index] = { ...row, [field]: value };
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-ocid="catalog.checkout.dialog"
        className="max-w-[calc(100vw-1.5rem)] sm:max-w-[960px] w-full max-h-[min(90vh,900px)] overflow-y-auto p-0 gap-0 border-border"
        style={{
          background: "oklch(0.99 0.006 248)",
          border: "1px solid oklch(0.88 0.02 248 / 0.6)",
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-2 border-b border-border/60">
          <DialogTitle className="font-display text-2xl font-bold text-left">
            Checkout
          </DialogTitle>
          {orderRef ? (
            <p className="text-sm text-muted-foreground text-left font-normal">
              Order #{orderRef}
            </p>
          ) : null}
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="contents">
          <div className="grid lg:grid-cols-2 gap-0 lg:gap-0">
            {/* Order summary */}
            <div
              className="p-6 lg:border-r border-border/60 space-y-4"
              style={{ background: "oklch(0.985 0.008 85 / 0.35)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {categoryLine}
              </p>
              <div className="flex gap-4">
                {summaryImageUrl ? (
                  <div className="h-20 w-28 shrink-0 rounded-lg overflow-hidden border border-border bg-muted">
                    <img
                      src={summaryImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-bold text-lg leading-snug">
                    {productTitle}
                  </h3>
                  {dateFromLabel ? (
                    <p className="text-sm text-muted-foreground mt-1">
                      From: {dateFromLabel}
                      {dateToLabel ? ` To: ${dateToLabel}` : ""}
                    </p>
                  ) : null}
                  {departureLabel ? (
                    <p className="text-sm text-muted-foreground">
                      Departure from: {departureLabel}
                    </p>
                  ) : null}
                  {guestsLine ? (
                    <p className="text-sm text-muted-foreground">{guestsLine}</p>
                  ) : null}
                  {extraSummaryRows?.map((row) => (
                    <p key={row.label} className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground/80">
                        {row.label}:{" "}
                      </span>
                      {row.value}
                    </p>
                  ))}
                </div>
              </div>

              <div
                className="rounded-xl p-4 text-sm space-y-2 border border-amber-900/15"
                style={{ background: "oklch(0.96 0.02 85 / 0.6)" }}
              >
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{subtotalINR.toLocaleString("en-IN")}</span>
                </div>
                {gstPercent > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      GST {gstPercent}%
                    </span>
                    <span>₹{gstAmount.toLocaleString("en-IN")}</span>
                  </div>
                ) : null}
                <div className="flex justify-between font-semibold pt-1 border-t border-border/50">
                  <span>Total</span>
                  <span>₹{totalINR.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Amount paid</span>
                  <span>₹{amountPaidINR.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-1">
                  <span style={{ color: "oklch(var(--brand-coral))" }}>
                    Amount due
                  </span>
                  <span style={{ color: "oklch(var(--brand-coral))" }}>
                    ₹{amountDue.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 space-y-5">
              {formTop}
              {addonSection}

              <div>
                <h4 className="font-display font-bold text-base mb-3">
                  Contact information
                </h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="co-first" className="text-xs text-muted-foreground">
                      First name
                    </Label>
                    <Input
                      id="co-first"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="bg-muted/70 border-border"
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="co-last" className="text-xs text-muted-foreground">
                      Last name
                    </Label>
                    <Input
                      id="co-last"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="bg-muted/70 border-border"
                      autoComplete="family-name"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="co-email" className="text-xs text-muted-foreground">
                      Email
                    </Label>
                    <Input
                      id="co-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-muted/70 border-border"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label
                      htmlFor="co-email2"
                      className="text-xs text-muted-foreground"
                    >
                      Re-type email
                    </Label>
                    <Input
                      id="co-email2"
                      type="email"
                      value={emailConfirm}
                      onChange={(e) => setEmailConfirm(e.target.value)}
                      className="bg-muted/70 border-border"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="co-phone" className="text-xs text-muted-foreground">
                      Contact phone
                    </Label>
                    <Input
                      id="co-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-muted/70 border-border"
                      autoComplete="tel"
                    />
                  </div>
                </div>
              </div>

              {extraGuestSlots > 0 ? (
                <div className="space-y-4">
                  {extraGuests.map((g, i) => (
                    <div key={`xg-${i}`} className="space-y-3">
                      <h4 className="font-display font-bold text-sm">
                        Extra guest {i + 1}
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
                            First name
                          </Label>
                          <Input
                            value={g.first}
                            onChange={(e) =>
                              updateExtraGuest(i, "first", e.target.value)
                            }
                            className="bg-muted/70 border-border"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
                            Last name
                          </Label>
                          <Input
                            value={g.last}
                            onChange={(e) =>
                              updateExtraGuest(i, "last", e.target.value)
                            }
                            className="bg-muted/70 border-border"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div>
                <h4 className="font-display font-bold text-base mb-3">
                  Billing address
                </h4>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Country</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger className="bg-muted/70 border-border">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="co-state" className="text-xs text-muted-foreground">
                      State / region
                    </Label>
                    <Input
                      id="co-state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="bg-muted/70 border-border"
                      placeholder="Maharashtra"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="co-city" className="text-xs text-muted-foreground">
                      City
                    </Label>
                    <Input
                      id="co-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="bg-muted/70 border-border"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="co-addr" className="text-xs text-muted-foreground">
                      Address
                    </Label>
                    <Input
                      id="co-addr"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="bg-muted/70 border-border"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-display font-bold text-base mb-2">
                  Payment details
                </h4>
                <div
                  className="rounded-lg border p-3 text-sm space-y-1.5"
                  style={{
                    background: "oklch(0.94 0.04 195 / 0.45)",
                    borderColor: "oklch(0.55 0.12 145 / 0.45)",
                  }}
                >
                  <p>You could pay after the items availability confirmation!</p>
                  <p className="text-muted-foreground">
                    Confirmation will be sent to your e-mail.
                  </p>
                  <p>
                    Amount to pay online will be{" "}
                    <strong
                      className="tabular-nums"
                      style={{ color: "oklch(var(--brand-coral))" }}
                    >
                      ₹{amountDue.toLocaleString("en-IN")}
                    </strong>
                    .
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer text-sm">
                  <Checkbox
                    checked={termsAccepted}
                    onCheckedChange={(c) => setTermsAccepted(Boolean(c))}
                    className="mt-0.5"
                  />
                  <span>I read and agree to the terms and conditions</span>
                </label>
                <div
                  className="max-h-36 overflow-y-auto rounded-md border border-border p-3 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed"
                  style={{ background: "oklch(0.98 0.006 248)" }}
                >
                  {termsText}
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || submitDisabled}
                className="w-full font-bold uppercase tracking-wide py-6 text-base"
                style={{
                  background: "oklch(var(--brand-blue))",
                  color: "oklch(0.985 0.005 85)",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin inline" />
                    Processing…
                  </>
                ) : (
                  submitLabel
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

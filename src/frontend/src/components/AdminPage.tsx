import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ACTOR_QUERY_KEY, useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Mountain, Shield } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useReducer, useState } from "react";
import { toast } from "sonner";
import { BookingStatus } from "../backend.d";
import type { Booking } from "../backend.d";
import type { Page } from "../types";
import {
  snapshotIdentityForAdminDebug,
  snapshotViteBackendMode,
} from "../utils/adminAccessDebug";
import {
  getAdminBearerToken,
  setAdminBearerToken,
} from "../utils/adminLocalSession";
import { clearSessionParameter } from "../utils/urlParams";
import { viteEnvIsTrue } from "../utils/viteEnv";
import AdminCatalogPanel from "./AdminCatalogPanel";

const II_INFO_URL = "https://identity.internetcomputer.org/";

interface Props {
  setPage: (page: Page) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "oklch(0.7 0.14 55)",
  confirmed: "oklch(0.65 0.18 145)",
  cancelled: "oklch(0.6 0.18 25)",
};

function nodeApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_NODE_API_BASE_URL as string | undefined) ?? "/api-node";
  return raw.replace(/\/$/, "") || "/api-node";
}

export default function AdminPage({ setPage }: Props) {
  const queryClient = useQueryClient();
  const { actor, isFetching } = useActor();
  const { login, clear, identity, loginStatus } = useInternetIdentity();
  const nodeBackend = viteEnvIsTrue(import.meta.env.VITE_USE_NODE_BACKEND);
  const [, bumpJwtGate] = useReducer((x: number) => x + 1, 0);
  const hasLocalJwt = Boolean(getAdminBearerToken());
  const [localAuthTab, setLocalAuthTab] = useState<"login" | "register">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regSetupToken, setRegSetupToken] = useState("");
  const [regOtp, setRegOtp] = useState("");
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [localAuthBusy, setLocalAuthBusy] = useState(false);
  const [isCallerAdmin, setIsCallerAdmin] = useState<boolean | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<
    "all" | "pending" | "confirmed" | "cancelled"
  >("all");
  const [updating, setUpdating] = useState<bigint | null>(null);
  const [adminSection, setAdminSection] = useState<"bookings" | "catalog">(
    "bookings",
  );

  useEffect(() => {
    clearSessionParameter("tourist_simple_admin");
    clearSessionParameter("appAdminToken");
  }, []);

  useEffect(() => {
    if (!actor) {
      setIsCallerAdmin(null);
      return;
    }
    if (!nodeBackend && !identity) {
      setIsCallerAdmin(null);
      return;
    }
    let cancelled = false;
    void actor
      .isCallerAdmin()
      .then((v) => {
        if (cancelled) return;
        if (!v) {
          console.warn(
            "[tourist admin] AdminPage: isCallerAdmin returned false (summary)",
            {
              identity: snapshotIdentityForAdminDebug(identity),
              vite: snapshotViteBackendMode(),
              backend: viteEnvIsTrue(import.meta.env.VITE_USE_NODE_BACKEND)
                ? "Node HTTP — see earlier [tourist admin] isCallerAdmin logs from nodeHttpBackend if any"
                : "Canister — caller must be admin on-chain or init-access with APP_ADMIN_TOKEN",
            },
          );
        }
        setIsCallerAdmin(v);
      })
      .catch((err: unknown) => {
        console.error("[tourist admin] AdminPage: isCallerAdmin rejected", {
          error: err,
          identity: snapshotIdentityForAdminDebug(identity),
          vite: snapshotViteBackendMode(),
        });
        if (!cancelled) setIsCallerAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [actor, identity, nodeBackend]);

  useEffect(() => {
    if (!nodeBackend) return;
    if (isFetching || isCallerAdmin === null) return;
    if (isCallerAdmin !== false) return;
    if (!getAdminBearerToken()) return;
    setAdminBearerToken(null);
    bumpJwtGate();
    void queryClient.invalidateQueries({ queryKey: [ACTOR_QUERY_KEY] });
  }, [nodeBackend, isFetching, isCallerAdmin, queryClient]);

  useEffect(() => {
    if (!actor || !isCallerAdmin) return;
    setLoading(true);
    actor
      .getAllBookings()
      .then((b) => setBookings(b))
      .catch(() => toast.error("Failed to load bookings"))
      .finally(() => setLoading(false));
  }, [actor, isCallerAdmin]);

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

  const submitLocalLogin = async () => {
    setLocalAuthBusy(true);
    try {
      const res = await fetch(`${nodeApiBaseUrl()}/admin-auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        token?: string;
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error || "Login failed");
        return;
      }
      if (!data.token) {
        toast.error("Invalid response from server");
        return;
      }
      setAdminBearerToken(data.token);
      setLoginPassword("");
      bumpJwtGate();
      await queryClient.invalidateQueries({ queryKey: [ACTOR_QUERY_KEY] });
      toast.success("Signed in");
    } catch {
      toast.error("Network error");
    } finally {
      setLocalAuthBusy(false);
    }
  };

  const registrationHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const tok = regSetupToken.trim();
    if (tok) headers["X-App-Admin-Token"] = tok;
    return headers;
  };

  const sendRegistrationOtp = async () => {
    const email = regEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email first");
      return;
    }
    setLocalAuthBusy(true);
    try {
      const res = await fetch(
        `${nodeApiBaseUrl()}/admin-auth/send-registration-otp`,
        {
          method: "POST",
          headers: registrationHeaders(),
          body: JSON.stringify({ email }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        devOtp?: string;
      };
      if (!res.ok) {
        toast.error(data.error || "Could not send code");
        return;
      }
      setRegOtpSent(true);
      if (data.devOtp) {
        console.warn(
          "[tourist admin] OTP (dev only, no SMTP — remove TOURIST_DEV_OTP_IN_RESPONSE in production):",
          data.devOtp,
        );
        toast.success("Code in browser console (F12 → Console)");
      } else {
        toast.success("Check your email for a 6-digit code");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLocalAuthBusy(false);
    }
  };

  const submitLocalRegister = async () => {
    if (regPassword !== regConfirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (!regOtpSent) {
      toast.error("Send and enter the email verification code first");
      return;
    }
    const otpDigits = regOtp.replace(/\D/g, "");
    if (otpDigits.length !== 6) {
      toast.error("Enter the 6-digit code from your email");
      return;
    }
    setLocalAuthBusy(true);
    try {
      const res = await fetch(`${nodeApiBaseUrl()}/admin-auth/register`, {
        method: "POST",
        headers: registrationHeaders(),
        body: JSON.stringify({
          username: regUsername.trim(),
          email: regEmail.trim().toLowerCase(),
          password: regPassword,
          otp: otpDigits,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Registration failed");
        return;
      }
      toast.success("Account created — you can log in now");
      setLocalAuthTab("login");
      setLoginEmail(regEmail.trim().toLowerCase());
      setRegPassword("");
      setRegConfirm("");
      setRegOtp("");
      setRegOtpSent(false);
    } catch {
      toast.error("Network error");
    } finally {
      setLocalAuthBusy(false);
    }
  };

  if (nodeBackend && !hasLocalJwt) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{
          background:
            "linear-gradient(160deg, oklch(0.13 0.025 232) 0%, oklch(0.09 0.018 232) 100%)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-8 rounded-2xl border border-white/10"
          style={{ background: "oklch(0.16 0.025 232 / 0.8)" }}
        >
          <Shield
            className="w-12 h-12 mx-auto mb-4"
            style={{ color: "oklch(0.85 0.13 192)" }}
          />
          <h2 className="font-display text-2xl font-bold mb-2 text-center">
            Admin sign-in
          </h2>
          <p className="text-sm text-muted-foreground mb-6 text-center leading-relaxed">
            Use the account you registered for this Node API (username, email,
            password). Registration requires a code sent to your email. No
            Internet Identity required.
          </p>
          <div className="flex gap-2 mb-6">
            <Button
              type="button"
              variant={localAuthTab === "login" ? "default" : "outline"}
              className="flex-1 border-white/20"
              onClick={() => setLocalAuthTab("login")}
            >
              Log in
            </Button>
            <Button
              type="button"
              variant={localAuthTab === "register" ? "default" : "outline"}
              className="flex-1 border-white/20"
              onClick={() => setLocalAuthTab("register")}
            >
              Register
            </Button>
          </div>
          {localAuthTab === "login" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-login-email">Email</Label>
                <Input
                  id="admin-login-email"
                  type="email"
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="bg-background/40 border-white/15"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-login-password">Password</Label>
                <Input
                  id="admin-login-password"
                  type="password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="bg-background/40 border-white/15"
                />
              </div>
              <Button
                type="button"
                className="w-full font-bold"
                disabled={localAuthBusy}
                onClick={() => void submitLocalLogin()}
                style={{
                  background: "oklch(0.85 0.13 192)",
                  color: "oklch(0.13 0.04 195)",
                }}
              >
                {localAuthBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Log in"
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-reg-token">
                  Setup secret (only for extra admins)
                </Label>
                <Input
                  id="admin-reg-token"
                  type="password"
                  placeholder="APP_ADMIN_TOKEN — required if an admin already exists"
                  value={regSetupToken}
                  onChange={(e) => setRegSetupToken(e.target.value)}
                  className="bg-background/40 border-white/15"
                />
                <p className="text-xs text-muted-foreground">
                  First admin: leave empty. Adding another admin: enter{" "}
                  <code className="text-foreground/80">APP_ADMIN_TOKEN</code>{" "}
                  before sending the email code.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-reg-email">Email</Label>
                <Input
                  id="admin-reg-email"
                  type="email"
                  autoComplete="email"
                  value={regEmail}
                  onChange={(e) => {
                    setRegEmail(e.target.value);
                    setRegOtpSent(false);
                    setRegOtp("");
                  }}
                  className="bg-background/40 border-white/15"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-white/20"
                  disabled={localAuthBusy}
                  onClick={() => void sendRegistrationOtp()}
                >
                  {localAuthBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Send verification code"
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  We email a 6-digit code (valid 10 minutes). If SMTP is not
                  configured on the server, the code is printed in the API
                  console for development.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-reg-otp">Email code</Label>
                <Input
                  id="admin-reg-otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6-digit code"
                  value={regOtp}
                  onChange={(e) => setRegOtp(e.target.value)}
                  className="bg-background/40 border-white/15"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-reg-user">Username</Label>
                <Input
                  id="admin-reg-user"
                  autoComplete="username"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="bg-background/40 border-white/15"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-reg-pass">Password</Label>
                <Input
                  id="admin-reg-pass"
                  type="password"
                  autoComplete="new-password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="bg-background/40 border-white/15"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-reg-pass2">Confirm password</Label>
                <Input
                  id="admin-reg-pass2"
                  type="password"
                  autoComplete="new-password"
                  value={regConfirm}
                  onChange={(e) => setRegConfirm(e.target.value)}
                  className="bg-background/40 border-white/15"
                />
              </div>
              <Button
                type="button"
                className="w-full font-bold"
                disabled={localAuthBusy}
                onClick={() => void submitLocalRegister()}
                style={{
                  background: "oklch(0.85 0.13 192)",
                  color: "oklch(0.13 0.04 195)",
                }}
              >
                {localAuthBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create admin account"
                )}
              </Button>
            </div>
          )}
          <div className="mt-6 text-center">
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

  if (!nodeBackend && !identity) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{
          background:
            "linear-gradient(160deg, oklch(0.13 0.025 232) 0%, oklch(0.09 0.018 232) 100%)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-8 rounded-2xl border border-white/10"
          style={{ background: "oklch(0.16 0.025 232 / 0.8)" }}
        >
          <Shield
            className="w-12 h-12 mx-auto mb-4"
            style={{ color: "oklch(0.85 0.13 192)" }}
          />
          <h2 className="font-display text-2xl font-bold mb-2 text-center">
            Admin sign-in
          </h2>
          <p className="text-sm text-muted-foreground mb-4 text-center leading-relaxed">
            Use{" "}
            <a
              href={II_INFO_URL}
              target="_blank"
              rel="noreferrer"
              className="text-cyan underline-offset-2 hover:underline"
            >
              Internet Identity
            </a>{" "}
            to sign in. Your app connects to the same provider configured for
            this deployment (see <code className="text-foreground/80">II_URL</code>
            ).
          </p>
          <Button
            type="button"
            data-ocid="admin.ii_login"
            className="w-full font-bold inline-flex items-center justify-center gap-2"
            disabled={loginStatus === "logging-in"}
            onClick={() => login()}
            style={{
              background: "oklch(0.85 0.13 192)",
              color: "oklch(0.13 0.04 195)",
            }}
          >
            {loginStatus === "logging-in" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                Opening Internet Identity…
              </>
            ) : (
              "Sign in with Internet Identity"
            )}
          </Button>
          <div className="mt-4 text-center">
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

  if (!actor || isFetching || isCallerAdmin === null) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-3"
        style={{
          background:
            "linear-gradient(160deg, oklch(0.13 0.025 232) 0%, oklch(0.09 0.018 232) 100%)",
        }}
      >
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading admin session…</p>
      </div>
    );
  }

  if (!isCallerAdmin) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{
          background:
            "linear-gradient(160deg, oklch(0.13 0.025 232) 0%, oklch(0.09 0.018 232) 100%)",
        }}
      >
        <div
          data-ocid="admin.error_state"
          className="text-center p-8 rounded-2xl border border-white/10 max-w-md"
          style={{ background: "oklch(0.16 0.025 232 / 0.8)" }}
        >
          <h2 className="font-display text-2xl font-bold mb-2">
            Access denied
          </h2>
          <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
            {nodeBackend ? (
              <>
                Your session is not allowed as admin. If you use{" "}
                <strong className="text-foreground/90">email / password</strong>,
                sign out and log in again. To require only password admin (no
                anonymous bypass), set{" "}
                <code className="text-foreground/80">
                  TOURIST_DISABLE_OPEN_II_ADMIN=1
                </code>{" "}
                on the API and avoid sending a dev admin header from the client.
              </>
            ) : (
              <>
                The backend reported that you are not an admin for this principal.{" "}
                <strong className="text-foreground/90">Canister:</strong> the first
                caller who runs{" "}
                <code className="text-foreground/80">init-access</code> with the
                canister&apos;s{" "}
                <code className="text-foreground/80">APP_ADMIN_TOKEN</code> becomes
                admin; others need an admin to assign roles.
              </>
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              type="button"
              variant="outline"
              className="border-white/20"
              disabled={isFetching}
              onClick={() => {
                void queryClient.invalidateQueries({
                  queryKey: [ACTOR_QUERY_KEY],
                });
              }}
            >
              {isFetching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Try again
            </Button>
            <Button
              type="button"
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
          <div className="ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-ocid="admin.sign_out"
              className="border-white/20 text-xs"
              onClick={() => {
                if (nodeBackend) {
                  setAdminBearerToken(null);
                  bumpJwtGate();
                }
                void clear();
                void queryClient.invalidateQueries({
                  queryKey: [ACTOR_QUERY_KEY],
                });
                setPage("home");
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <Tabs
          value={adminSection}
          onValueChange={(v) => setAdminSection(v as "bookings" | "catalog")}
        >
          <TabsList
            className="mb-8 grid h-auto w-full max-w-md grid-cols-2 gap-2 p-1 sm:max-w-lg"
            style={{ background: "oklch(0.16 0.025 232)" }}
          >
            <TabsTrigger
              value="bookings"
              className="w-full px-3 py-2 text-sm sm:text-base"
            >
              Bookings
            </TabsTrigger>
            <TabsTrigger
              value="catalog"
              className="w-full px-3 py-2 text-sm sm:text-base"
            >
              {"Packages & catalog"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="mt-0">
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

            <div
              className="mb-6 flex flex-wrap gap-2"
              data-ocid="admin.filter.tab"
              role="tablist"
            >
              {(
                [
                  ["all", "All", bookings.length],
                  [
                    "pending",
                    "Pending",
                    bookings.filter((b) => b.status === "pending").length,
                  ],
                  [
                    "confirmed",
                    "Confirmed",
                    bookings.filter((b) => b.status === "confirmed").length,
                  ],
                  [
                    "cancelled",
                    "Cancelled",
                    bookings.filter((b) => b.status === "cancelled").length,
                  ],
                ] as const
              ).map(([value, label, count]) => (
                <Button
                  key={value}
                  type="button"
                  variant={filter === value ? "default" : "outline"}
                  size="sm"
                  data-ocid={`admin.${value}.tab`}
                  className={
                    filter === value
                      ? "font-bold"
                      : "border-white/20 bg-white/5 text-muted-foreground"
                  }
                  style={
                    filter === value
                      ? {
                          background: "oklch(0.85 0.13 192)",
                          color: "oklch(0.13 0.04 195)",
                        }
                      : undefined
                  }
                  onClick={() => setFilter(value)}
                >
                  {label} ({count})
                </Button>
              ))}
            </div>

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
                      <TableHead className="text-muted-foreground">
                        ID
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Customer
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Package
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Date
                      </TableHead>
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
                          ₹
                          {Number(booking.totalPriceINR).toLocaleString(
                            "en-IN",
                          )}
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
                                <SelectItem value="confirmed">
                                  Confirmed
                                </SelectItem>
                                <SelectItem value="cancelled">
                                  Cancelled
                                </SelectItem>
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
          </TabsContent>

          <TabsContent value="catalog" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <h1 className="font-display text-3xl font-black mb-2">
                Tour{" "}
                <span style={{ color: "oklch(0.75 0.14 55)" }}>Catalog</span>
              </h1>
              <p className="text-muted-foreground">
                Live catalog from the Node API or canister; built-in demo preview
                when the API is offline.
              </p>
            </motion.div>
            <AdminCatalogPanel />
          </TabsContent>
        </Tabs>
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

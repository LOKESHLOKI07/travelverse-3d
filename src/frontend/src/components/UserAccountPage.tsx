import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACTOR_QUERY_KEY, useActor } from "@/hooks/useActor";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, User } from "lucide-react";
import { motion } from "motion/react";
import { useReducer, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../types";
import {
  getUserBearerToken,
  setUserBearerToken,
} from "../utils/userLocalSession";
import { viteEnvIsTrue } from "../utils/viteEnv";

interface Props {
  setPage: (page: Page) => void;
}

function nodeApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_NODE_API_BASE_URL as string | undefined) ?? "/api-node";
  return raw.replace(/\/$/, "") || "/api-node";
}

export default function UserAccountPage({ setPage }: Props) {
  const queryClient = useQueryClient();
  const { isFetching } = useActor();
  const nodeBackend = viteEnvIsTrue(import.meta.env.VITE_USE_NODE_BACKEND);
  const [, bumpJwtGate] = useReducer((x: number) => x + 1, 0);
  const hasJwt = Boolean(getUserBearerToken());

  const [localAuthTab, setLocalAuthTab] = useState<"login" | "register">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regOtp, setRegOtp] = useState("");
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [localAuthBusy, setLocalAuthBusy] = useState(false);

  if (!nodeBackend) {
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
          className="w-full max-w-md p-8 rounded-2xl border border-white/10 text-center"
          style={{ background: "oklch(0.16 0.025 232 / 0.8)" }}
        >
          <p className="text-muted-foreground mb-4">
            Email sign-in is only available when the app uses the Node API backend.
          </p>
          <button
            type="button"
            onClick={() => setPage("home")}
            className="text-sm text-cyan hover:underline"
          >
            ← Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  const submitLocalLogin = async () => {
    setLocalAuthBusy(true);
    try {
      const res = await fetch(`${nodeApiBaseUrl()}/user-auth/login`, {
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
      setUserBearerToken(data.token);
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

  const sendRegistrationOtp = async () => {
    const email = regEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email first");
      return;
    }
    setLocalAuthBusy(true);
    try {
      const res = await fetch(`${nodeApiBaseUrl()}/user-auth/send-registration-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
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
          "[tourist user] OTP (dev only, no SMTP — remove TOURIST_DEV_OTP_IN_RESPONSE in production):",
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
      const res = await fetch(`${nodeApiBaseUrl()}/user-auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  const logout = () => {
    setUserBearerToken(null);
    bumpJwtGate();
    void queryClient.invalidateQueries({ queryKey: [ACTOR_QUERY_KEY] });
    toast.success("Signed out");
  };

  if (hasJwt) {
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
          <User
            className="w-12 h-12 mx-auto mb-4"
            style={{ color: "oklch(0.85 0.13 192)" }}
          />
          <h2 className="font-display text-2xl font-bold mb-2 text-center">
            You&apos;re signed in
          </h2>
          <p className="text-sm text-muted-foreground mb-6 text-center">
            View bookings that match your account email, or book packages from the catalog.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              className="w-full font-bold"
              disabled={isFetching}
              onClick={() => setPage("my-bookings")}
              style={{
                background: "oklch(0.85 0.13 192)",
                color: "oklch(0.13 0.04 195)",
              }}
            >
              My bookings
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full border-white/20"
              onClick={() => void logout()}
            >
              Sign out
            </Button>
          </div>
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setPage("home")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

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
        <User
          className="w-12 h-12 mx-auto mb-4"
          style={{ color: "oklch(0.85 0.13 192)" }}
        />
        <h2 className="font-display text-2xl font-bold mb-2 text-center">
          Traveler account
        </h2>
        <p className="text-sm text-muted-foreground mb-6 text-center leading-relaxed">
          Register or sign in with email and password. We send a one-time code to your
          email to verify new accounts (same flow as admin). No Internet Identity required.
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
              <Label htmlFor="user-login-email">Email</Label>
              <Input
                id="user-login-email"
                type="email"
                autoComplete="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="bg-background/40 border-white/15"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-login-password">Password</Label>
              <Input
                id="user-login-password"
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
              <Label htmlFor="user-reg-email">Email</Label>
              <Input
                id="user-reg-email"
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
                If SMTP is not configured on the server, the code is printed in the API
                console for development.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-reg-otp">Email code</Label>
              <Input
                id="user-reg-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                value={regOtp}
                onChange={(e) => setRegOtp(e.target.value)}
                className="bg-background/40 border-white/15"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-reg-user">Display name</Label>
              <Input
                id="user-reg-user"
                autoComplete="username"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                className="bg-background/40 border-white/15"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-reg-pass">Password</Label>
              <Input
                id="user-reg-pass"
                type="password"
                autoComplete="new-password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="bg-background/40 border-white/15"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-reg-pass2">Confirm password</Label>
              <Input
                id="user-reg-pass2"
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
                "Create account"
              )}
            </Button>
          </div>
        )}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setPage("home")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </button>
        </div>
      </motion.div>
    </div>
  );
}

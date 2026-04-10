import heroMountains from "@/assets/generated/hero-mountains.dim_1920x1080.jpg";
import { LOGO_URL } from "@/branding";
import SnowTerrain3D from "@/components/SnowTerrain3D";
import ThreeErrorBoundary from "@/components/ThreeErrorBoundary";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import {
  logDevBundledImages,
  logLogoDevContext,
  logoImgDevHandlers,
} from "@/utils/devDebug";
import {
  Compass,
  Facebook,
  Instagram,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Mountain,
  Phone,
  Shield,
  Star,
  Users,
  Youtube,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";
import type { Page } from "../types";
import { getUserBearerToken } from "../utils/userLocalSession";
import { viteEnvIsTrue } from "../utils/viteEnv";

interface HomePageProps {
  setPage: (page: Page) => void;
  openPackagesCatalog: () => void;
}

const TREK_CARDS = [
  {
    id: 1,
    name: "Friendship Peak",
    image:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&fit=crop",
    altitude: "5,289m",
    duration: "8 Days",
    difficulty: "Moderate-Hard",
    difficultyColor: "orange",
    slug: "friendship-peak",
    price: "₹28,500",
  },
  {
    id: 2,
    name: "Hampta Pass",
    image:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&fit=crop",
    altitude: "4,270m",
    duration: "5 Days",
    difficulty: "Moderate",
    difficultyColor: "cyan",
    slug: "hampta-pass",
    price: "₹18,500",
  },
  {
    id: 3,
    name: "Kedarkantha",
    image:
      "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&fit=crop",
    altitude: "3,800m",
    duration: "6 Days",
    difficulty: "Easy-Moderate",
    difficultyColor: "green",
    slug: "kedarkantha",
    price: "₹14,500",
  },
];

const JOURNEY_WAYPOINTS = [
  {
    day: "Day 1",
    label: "Manali Basecamp",
    elevation: "Start",
    x: 80,
    y: 200,
    isSummit: false,
  },
  {
    day: "Day 3",
    label: "Lower Camp",
    elevation: "2,800m",
    x: 220,
    y: 150,
    isSummit: false,
  },
  {
    day: "Day 5",
    label: "High Camp",
    elevation: "4,200m",
    x: 360,
    y: 100,
    isSummit: false,
  },
  {
    day: "Day 7",
    label: "Summit Push",
    elevation: "5,000m",
    x: 500,
    y: 60,
    isSummit: false,
  },
  {
    day: "Day 8",
    label: "Friendship Peak ★",
    elevation: "5,289m",
    x: 620,
    y: 30,
    isSummit: true,
  },
];

const EXPERIENCES = [
  {
    label: "Wake Up Above the Clouds",
    image: "/assets/generated/experience-above-clouds.dim_800x500.jpg",
    text: "Every morning at base camp is a revelation. You open your tent to a world wrapped in silence, mist below your feet, and the summit calling from above.",
  },
  {
    label: "Train on Snow and Ice",
    image: "/assets/generated/experience-snow-training.dim_800x500.jpg",
    text: "Our guides prepare you for every slope. Learn ice axe arrest, crampon technique, and high-altitude endurance in the most dramatic classroom on Earth.",
  },
  {
    label: "Summit at Sunrise",
    image: "/assets/generated/experience-summit-sunrise.dim_800x500.jpg",
    text: "The summit is yours. As the sun breaks over the horizon, you stand at 5,289m — above the clouds, above doubt. This is why you came.",
  },
];

const WHY_FEATURES = [
  {
    icon: Compass,
    title: "Certified Mountain Guides",
    desc: "UIAA-certified, 10+ years Himalayan experience",
  },
  {
    icon: Shield,
    title: "Safety First",
    desc: "Satellite communication, medical kits, evacuation protocol",
  },
  {
    icon: Mountain,
    title: "Premium Gear",
    desc: "High-altitude tents, sleeping bags, technical equipment provided",
  },
  {
    icon: Users,
    title: "Small Groups",
    desc: "Max 8 trekkers per batch — personal, intimate, safe",
  },
];

const TESTIMONIALS = [
  {
    name: "Priya Sharma",
    location: "Mumbai",
    initials: "PS",
    color: "oklch(0.6 0.18 320)",
    quote:
      "Friendship Peak was a life-changing experience. The guides were exceptional and safety was top priority.",
  },
  {
    name: "Arjun Mehta",
    location: "Delhi",
    initials: "AM",
    color: "oklch(0.6 0.15 260)",
    quote:
      "Hampta Pass in 5 days felt like 5 lifetimes of memories. Mountain Explorers made it effortless.",
  },
  {
    name: "Kavya Reddy",
    location: "Bangalore",
    initials: "KR",
    color: "oklch(0.6 0.18 145)",
    quote:
      "The pre-trek preparation sessions and the summit push — I've never felt more alive.",
  },
];

const FOOTER_LINKS = {
  Treks: ["Friendship Peak", "Hampta Pass", "Kedarkantha", "All Treks"],
  Company: ["About", "Blog", "Careers", "Press"],
  Support: ["FAQ", "Safety Policy", "Cancellation"],
  Contact: [
    "hello@mountainexplorers.in",
    "+91 98765 43210",
    "Manali, Himachal Pradesh",
  ],
};

const SOCIAL_LINKS: {
  icon: ComponentType<{ className?: string }>;
  href: string;
  label: string;
}[] = [
  { icon: Instagram, href: "https://instagram.com", label: "Instagram" },
  { icon: Facebook, href: "https://facebook.com", label: "Facebook" },
  { icon: Youtube, href: "https://youtube.com", label: "YouTube" },
];

const HOME_HEADER_SECTION_LINKS: [string, string][] = [
  ["Home", ""],
  ["Treks", "treks"],
  ["Journey", "journey"],
  ["Experience", "experience"],
  ["About", "about"],
];

export default function HomePage({
  setPage,
  openPackagesCatalog,
}: HomePageProps) {
  const [scrollY, setScrollY] = useState(0);
  const [showFloatingCTA, setShowFloatingCTA] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const journeyRef = useRef<HTMLDivElement>(null);
  const [journeyVisible, setJourneyVisible] = useState(false);
  const { login, clear, identity } = useInternetIdentity();
  const { actor } = useActor();
  const [isAdmin, setIsAdmin] = useState(false);
  const nodeBackend = viteEnvIsTrue(import.meta.env.VITE_USE_NODE_BACKEND);
  const hasLocalUserJwt = Boolean(getUserBearerToken());
  const showMyBookingsNav = Boolean(identity) || (nodeBackend && hasLocalUserJwt);

  useEffect(() => {
    if (!actor || !identity) {
      setIsAdmin(false);
      return;
    }
    actor
      .isCallerAdmin()
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false));
  }, [actor, identity]);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      setShowFloatingCTA(window.scrollY > 200);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setJourneyVisible(true);
      },
      { threshold: 0.3 },
    );
    if (journeyRef.current) observer.observe(journeyRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    logLogoDevContext(LOGO_URL);
    logDevBundledImages({ logoMountain: LOGO_URL, heroMountains });
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* NAVBAR */}
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background:
            scrollY > 50
              ? "oklch(0.11 0.025 232 / 0.95)"
              : "oklch(0.09 0.018 232 / 0.3)",
          backdropFilter: "blur(20px)",
          borderBottom:
            scrollY > 50
              ? "1px solid oklch(0.31 0.03 230 / 0.3)"
              : "1px solid transparent",
          transition: "all 0.3s ease",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            type="button"
            className="flex items-center gap-2.5"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <img
              src={LOGO_URL}
              alt="Mountain Explorers"
              className="w-10 h-10 rounded-full object-cover"
              {...(logoImgDevHandlers() ?? {})}
            />
            <span className="font-display font-bold text-lg tracking-tight text-foreground">
              MOUNTAIN <span className="text-cyan">EXPLORERS</span>
            </span>
          </button>

          <nav className="hidden lg:flex items-center gap-6">
            {HOME_HEADER_SECTION_LINKS.map(([label, id]) => (
              <button
                key={label}
                type="button"
                data-ocid="nav.link"
                onClick={() =>
                  id
                    ? scrollToSection(id)
                    : window.scrollTo({ top: 0, behavior: "smooth" })
                }
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              data-ocid="nav.packages.link"
              onClick={() => openPackagesCatalog()}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Packages
            </button>
            {nodeBackend && (
              <button
                type="button"
                data-ocid="nav.account.link"
                onClick={() => setPage("account")}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Account
              </button>
            )}
            {showMyBookingsNav && (
              <button
                type="button"
                data-ocid="nav.mybookings.link"
                onClick={() => setPage("my-bookings")}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                My Bookings
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                data-ocid="nav.admin.link"
                onClick={() => setPage("admin")}
                className="text-sm font-medium hover:text-foreground transition-colors"
                style={{ color: "oklch(0.75 0.14 55)" }}
              >
                Admin
              </button>
            )}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-3">
              {identity ? (
                <button
                  type="button"
                  data-ocid="nav.logout.button"
                  onClick={() => clear()}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              ) : (
                <button
                  type="button"
                  data-ocid="nav.login.button"
                  onClick={() =>
                    nodeBackend ? setPage("account") : void login()
                  }
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </button>
              )}
              <Button
                data-ocid="nav.primary_button"
                onClick={() => openPackagesCatalog()}
                className="pill-btn"
                style={{
                  background: "oklch(0.85 0.13 192)",
                  color: "oklch(0.13 0.04 195)",
                  fontWeight: 700,
                }}
              >
                Book Now
              </Button>
            </div>

            <button
              type="button"
              className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-foreground/10 transition-colors"
              aria-label="Open menu"
              data-ocid="nav.mobile_menu.open"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetContent
                side="right"
                className="flex h-full w-[min(100%,20rem)] flex-col gap-0 border-l border-[oklch(0.3_0.04_232/0.5)] bg-[oklch(0.11_0.025_232)] p-0 [&>button]:text-foreground"
              >
                <SheetHeader className="border-b border-[oklch(0.3_0.04_232/0.35)] px-6 py-4 text-left">
                  <SheetTitle className="font-display text-lg">Menu</SheetTitle>
                  <SheetDescription className="sr-only">
                    Site navigation and account actions
                  </SheetDescription>
                </SheetHeader>
                <nav
                  className="flex flex-col px-4 py-2"
                  aria-label="Mobile navigation"
                >
                  {HOME_HEADER_SECTION_LINKS.map(([label, id]) => (
                    <button
                      key={label}
                      type="button"
                      data-ocid="nav.mobile.link"
                      onClick={() => {
                        closeMobileNav();
                        if (id) scrollToSection(id);
                        else window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="w-full rounded-md px-3 py-3 text-left text-base font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    data-ocid="nav.mobile.packages"
                    onClick={() => {
                      closeMobileNav();
                      openPackagesCatalog();
                    }}
                    className="w-full rounded-md px-3 py-3 text-left text-base font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors"
                  >
                    Packages
                  </button>
                  {nodeBackend && (
                    <button
                      type="button"
                      data-ocid="nav.mobile.account"
                      onClick={() => {
                        closeMobileNav();
                        setPage("account");
                      }}
                      className="w-full rounded-md px-3 py-3 text-left text-base font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors"
                    >
                      Account
                    </button>
                  )}
                  {showMyBookingsNav && (
                    <button
                      type="button"
                      data-ocid="nav.mobile.mybookings"
                      onClick={() => {
                        closeMobileNav();
                        setPage("my-bookings");
                      }}
                      className="w-full rounded-md px-3 py-3 text-left text-base font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors"
                    >
                      My Bookings
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      data-ocid="nav.mobile.admin"
                      onClick={() => {
                        closeMobileNav();
                        setPage("admin");
                      }}
                      className="w-full rounded-md px-3 py-3 text-left text-base font-medium transition-colors hover:bg-foreground/5"
                      style={{ color: "oklch(0.75 0.14 55)" }}
                    >
                      Admin
                    </button>
                  )}
                </nav>
                <div className="mt-auto flex flex-col gap-3 border-t border-[oklch(0.3_0.04_232/0.35)] px-4 py-4 sm:hidden">
                  {identity ? (
                    <Button
                      type="button"
                      variant="outline"
                      data-ocid="nav.mobile.logout"
                      onClick={() => {
                        closeMobileNav();
                        clear();
                      }}
                      className="w-full justify-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      data-ocid="nav.mobile.login"
                      onClick={() => {
                        closeMobileNav();
                        if (nodeBackend) setPage("account");
                        else void login();
                      }}
                      className="w-full justify-center gap-2"
                    >
                      <LogIn className="w-4 h-4" />
                      Login
                    </Button>
                  )}
                  <Button
                    data-ocid="nav.mobile.primary_button"
                    onClick={() => {
                      closeMobileNav();
                      openPackagesCatalog();
                    }}
                    className="pill-btn w-full"
                    style={{
                      background: "oklch(0.85 0.13 192)",
                      color: "oklch(0.13 0.04 195)",
                      fontWeight: 700,
                    }}
                  >
                    Book Now
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* HERO — 3D Snow Terrain */}
      <ThreeErrorBoundary>
        <SnowTerrain3D
          openBooking={() => openPackagesCatalog()}
          scrollToSection={scrollToSection}
        />
      </ThreeErrorBoundary>

      {/* FEATURED TREKS */}
      <section id="treks" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <p className="text-cyan text-xs font-bold tracking-[0.3em] uppercase mb-3">
              FEATURED EXPEDITIONS
            </p>
            <h2
              className="font-display font-extrabold text-foreground"
              style={{ fontSize: "clamp(32px, 4vw, 54px)" }}
            >
              Choose Your Peak
            </h2>
          </motion.div>

          <div
            data-ocid="treks.list"
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {TREK_CARDS.map((trek, i) => (
              <motion.div
                key={trek.id}
                data-ocid={`treks.item.${i + 1}`}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                onClick={() => openPackagesCatalog()}
                className="trek-card-hover rounded-2xl overflow-hidden cursor-pointer relative group"
                style={{
                  background: "oklch(0.16 0.025 232)",
                  border: "1px solid oklch(0.31 0.03 230 / 0.5)",
                }}
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={trek.image}
                    alt={trek.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to top, oklch(0.16 0.025 232) 0%, transparent 50%)",
                    }}
                  />
                  <div className="absolute top-3 left-3">
                    <span
                      className="text-xs font-bold px-3 py-1 rounded-full"
                      style={{
                        background: "oklch(0.85 0.13 192 / 0.2)",
                        color: "oklch(0.85 0.13 192)",
                        border: "1px solid oklch(0.85 0.13 192 / 0.4)",
                      }}
                    >
                      {trek.altitude}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <h3 className="font-display font-bold text-xl text-foreground">
                      {trek.name}
                    </h3>
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{
                        background:
                          trek.difficultyColor === "orange"
                            ? "oklch(0.75 0.14 55 / 0.15)"
                            : trek.difficultyColor === "cyan"
                              ? "oklch(0.85 0.13 192 / 0.15)"
                              : "oklch(0.65 0.15 145 / 0.15)",
                        color:
                          trek.difficultyColor === "orange"
                            ? "oklch(0.75 0.14 55)"
                            : trek.difficultyColor === "cyan"
                              ? "oklch(0.85 0.13 192)"
                              : "oklch(0.65 0.15 145)",
                        border:
                          trek.difficultyColor === "orange"
                            ? "1px solid oklch(0.75 0.14 55 / 0.3)"
                            : trek.difficultyColor === "cyan"
                              ? "1px solid oklch(0.85 0.13 192 / 0.3)"
                              : "1px solid oklch(0.65 0.15 145 / 0.3)",
                      }}
                    >
                      {trek.difficulty}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mountain className="w-4 h-4 text-cyan" />
                      {trek.altitude}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-cyan">⏱</span>
                      {trek.duration}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-display font-bold text-lg text-cyan">
                      {trek.price}
                    </span>
                    <Button
                      data-ocid={`treks.button.${i + 1}`}
                      size="sm"
                      className="rounded-full text-xs font-bold tracking-wider"
                      style={{
                        background: "oklch(0.85 0.13 192 / 0.15)",
                        border: "1px solid oklch(0.85 0.13 192 / 0.4)",
                        color: "oklch(0.85 0.13 192)",
                      }}
                    >
                      View Trek
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* INTERACTIVE TREK JOURNEY */}
      <section id="journey" className="py-24" ref={journeyRef}>
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <p className="text-cyan text-xs font-bold tracking-[0.3em] uppercase mb-3">
              ROUTE MAP
            </p>
            <h2
              className="font-display font-extrabold text-foreground"
              style={{ fontSize: "clamp(32px, 4vw, 54px)" }}
            >
              The Journey
            </h2>
            <p className="text-muted-foreground mt-3">
              From basecamp to summit — every step mapped.
            </p>
          </motion.div>

          <div
            className="glass-card rounded-2xl p-8 overflow-x-auto"
            style={{
              boxShadow: "0 0 60px oklch(0.85 0.13 192 / 0.06)",
            }}
          >
            <svg
              role="img"
              aria-label="Trek route from Manali to Friendship Peak summit"
              viewBox="0 0 720 260"
              className="w-full"
              style={{ minWidth: "480px" }}
            >
              <defs>
                <linearGradient id="pathGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="oklch(0.85 0.13 192)"
                    stopOpacity="0.15"
                  />
                  <stop
                    offset="100%"
                    stopColor="oklch(0.85 0.13 192)"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>

              <path
                d="M 80 200 Q 150 175 220 150 Q 290 125 360 100 Q 430 75 500 60 Q 560 45 620 30 L 620 240 L 80 240 Z"
                fill="url(#pathGrad)"
              />

              <path
                d="M 80 200 Q 150 175 220 150 Q 290 125 360 100 Q 430 75 500 60 Q 560 45 620 30"
                fill="none"
                stroke="oklch(0.85 0.13 192)"
                strokeWidth="2.5"
                strokeLinecap="round"
                className={journeyVisible ? "animate-path" : ""}
                style={{ strokeDasharray: 1000, strokeDashoffset: 1000 }}
              />

              <line
                x1="60"
                y1="240"
                x2="660"
                y2="240"
                stroke="oklch(0.31 0.03 230 / 0.4)"
                strokeWidth="1"
              />

              {JOURNEY_WAYPOINTS.map((pt) => (
                <g key={pt.day}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="14"
                    fill={
                      pt.isSummit
                        ? "oklch(0.75 0.14 55 / 0.15)"
                        : "oklch(0.85 0.13 192 / 0.1)"
                    }
                    stroke="none"
                  />
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="8"
                    fill={
                      pt.isSummit
                        ? "oklch(0.75 0.14 55)"
                        : "oklch(0.16 0.025 232)"
                    }
                    stroke={
                      pt.isSummit
                        ? "oklch(0.75 0.14 55)"
                        : "oklch(0.85 0.13 192)"
                    }
                    strokeWidth="2"
                  />
                  <text
                    x={pt.x}
                    y={pt.y + 30}
                    textAnchor="middle"
                    fill="oklch(0.85 0.13 192)"
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="Bricolage Grotesque, sans-serif"
                  >
                    {pt.day}
                  </text>
                  <text
                    x={pt.x}
                    y={pt.y + 44}
                    textAnchor="middle"
                    fill="oklch(0.75 0.03 220)"
                    fontSize="9"
                    fontFamily="Plus Jakarta Sans, sans-serif"
                  >
                    {pt.label}
                  </text>
                  <text
                    x={pt.x}
                    y={pt.y - 18}
                    textAnchor="middle"
                    fill={
                      pt.isSummit
                        ? "oklch(0.75 0.14 55)"
                        : "oklch(0.75 0.03 220)"
                    }
                    fontSize="9"
                    fontFamily="Plus Jakarta Sans, sans-serif"
                  >
                    {pt.elevation}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      </section>

      {/* EXPERIENCE SECTION */}
      <section id="experience" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="text-cyan text-xs font-bold tracking-[0.3em] uppercase mb-3">
              STORIES
            </p>
            <h2
              className="font-display font-extrabold text-foreground"
              style={{ fontSize: "clamp(32px, 4vw, 54px)" }}
            >
              The Experience
            </h2>
          </motion.div>

          <div className="space-y-20">
            {EXPERIENCES.map((exp, i) => (
              <motion.div
                key={exp.label}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center"
              >
                {i % 2 === 1 ? (
                  <>
                    <div className="space-y-5 order-2 lg:order-2">
                      <p className="text-cyan text-xs font-bold tracking-[0.3em] uppercase">
                        0{i + 1}
                      </p>
                      <h3
                        className="font-display font-extrabold text-foreground italic"
                        style={{ fontSize: "clamp(24px, 3vw, 40px)" }}
                      >
                        {exp.label}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed text-lg">
                        {exp.text}
                      </p>
                    </div>
                    <div className="rounded-2xl overflow-hidden order-1 lg:order-1">
                      <img
                        src={exp.image}
                        alt={exp.label}
                        className="w-full h-72 lg:h-96 object-cover"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-5">
                      <p className="text-cyan text-xs font-bold tracking-[0.3em] uppercase">
                        0{i + 1}
                      </p>
                      <h3
                        className="font-display font-extrabold text-foreground italic"
                        style={{ fontSize: "clamp(24px, 3vw, 40px)" }}
                      >
                        {exp.label}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed text-lg">
                        {exp.text}
                      </p>
                    </div>
                    <div className="rounded-2xl overflow-hidden">
                      <img
                        src={exp.image}
                        alt={exp.label}
                        className="w-full h-72 lg:h-96 object-cover"
                      />
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section id="about" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <p className="text-cyan text-xs font-bold tracking-[0.3em] uppercase mb-3">
              OUR EDGE
            </p>
            <h2
              className="font-display font-extrabold text-foreground"
              style={{ fontSize: "clamp(32px, 4vw, 54px)" }}
            >
              Why Choose Us
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {WHY_FEATURES.map((feat, i) => (
              <motion.div
                key={feat.title}
                data-ocid="features.card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass-card rounded-2xl p-6 group"
                style={{
                  transition: "border-color 0.3s ease, box-shadow 0.3s ease",
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all group-hover:scale-110"
                  style={{
                    background: "oklch(0.85 0.13 192 / 0.1)",
                    border: "1px solid oklch(0.85 0.13 192 / 0.3)",
                  }}
                >
                  <feat.icon className="w-5 h-5 text-cyan" />
                </div>
                <h4 className="font-display font-bold text-foreground mb-2">
                  {feat.title}
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feat.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <p className="text-cyan text-xs font-bold tracking-[0.3em] uppercase mb-3">
              REVIEWS
            </p>
            <h2
              className="font-display font-extrabold text-foreground"
              style={{ fontSize: "clamp(32px, 4vw, 54px)" }}
            >
              What Trekkers Say
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                data-ocid={`testimonials.item.${i + 1}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass-card rounded-2xl p-6 space-y-4"
              >
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, j) => (
                    <Star
                      key={`star-${t.name}-${j}`}
                      className="w-4 h-4"
                      style={{
                        color: "oklch(0.82 0.17 85)",
                        fill: "oklch(0.82 0.17 85)",
                      }}
                    />
                  ))}
                </div>
                <p className="text-foreground leading-relaxed italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white"
                    style={{ background: t.color }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      {t.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.location}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* BOOKING PREVIEW */}
      <section id="book" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <p className="text-cyan text-xs font-bold tracking-[0.3em] uppercase mb-3">
              GET STARTED
            </p>
            <h2
              className="font-display font-extrabold text-foreground"
              style={{ fontSize: "clamp(32px, 4vw, 54px)" }}
            >
              Ready to Summit?
            </h2>
          </motion.div>

          <div className="relative flex justify-center">
            <div className="absolute -top-16 right-1/4 w-48 h-48 opacity-20 animate-float hidden lg:block pointer-events-none">
              <img
                src={heroMountains}
                alt=""
                aria-hidden="true"
                className="w-full h-full object-contain"
              />
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="glass-card rounded-3xl p-8 max-w-md w-full"
              style={{
                boxShadow:
                  "0 0 60px oklch(0.85 0.13 192 / 0.12), 0 0 0 1px oklch(0.85 0.13 192 / 0.2)",
              }}
            >
              <div className="text-center mb-6">
                <h3 className="font-display font-extrabold text-2xl text-foreground mb-1">
                  Friendship Peak Expedition
                </h3>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs"
                  style={{
                    background: "oklch(0.75 0.14 55 / 0.15)",
                    color: "oklch(0.75 0.14 55)",
                    border: "1px solid oklch(0.75 0.14 55 / 0.3)",
                  }}
                >
                  8 Days / 7 Nights
                </div>
                <div className="mt-4">
                  <span className="font-display font-extrabold text-4xl text-cyan">
                    ₹28,500
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {" "}
                    / person
                  </span>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                {[
                  "Accommodation (tents + guesthouses)",
                  "All meals (breakfast, lunch, dinner)",
                  "Expert mountain guides",
                  "Trekking permits & forest fees",
                  "Safety equipment & first aid",
                  "Airport transfers",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-sm">
                    <span className="text-cyan font-bold">✓</span>
                    <span className="text-foreground">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2">
                  Not included:
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Personal gear", "Travel insurance", "Tips"].map((item) => (
                    <span
                      key={item}
                      className="text-xs text-muted-foreground px-2 py-0.5 rounded"
                      style={{
                        background: "oklch(0.22 0.025 230)",
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <Button
                data-ocid="booking.primary_button"
                onClick={() => openPackagesCatalog()}
                className="w-full pill-btn font-bold tracking-wider text-base py-3"
                style={{
                  background: "oklch(0.85 0.13 192)",
                  color: "oklch(0.13 0.04 195)",
                  boxShadow: "0 0 30px oklch(0.85 0.13 192 / 0.35)",
                }}
              >
                Book Your Trek
              </Button>

              <p className="text-center text-xs text-muted-foreground mt-3">
                Limited to 8 trekkers per batch • Next departure: April 15, 2026
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="pt-16 pb-8"
        style={{ borderTop: "1px solid oklch(0.31 0.03 230 / 0.4)" }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <img
                  src={LOGO_URL}
                  alt="Mountain Explorers"
                  className="w-9 h-9 rounded-full object-cover"
                  {...(logoImgDevHandlers() ?? {})}
                />
                <span className="font-display font-bold text-sm text-foreground">
                  MOUNTAIN <span className="text-cyan">EXPLORERS</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Explore the world&apos;s highest places with those who know them
                best.
              </p>
              <div className="flex gap-3 mt-4">
                {SOCIAL_LINKS.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      data-ocid="footer.link"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                      style={{
                        background: "oklch(0.22 0.025 230)",
                        border: "1px solid oklch(0.31 0.03 230 / 0.5)",
                      }}
                    >
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </a>
                  );
                })}
              </div>
            </div>

            {Object.entries(FOOTER_LINKS).map(([category, links]) => (
              <div key={category}>
                <h5 className="font-display font-bold text-sm text-foreground mb-4">
                  {category}
                </h5>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link}>
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5 cursor-default">
                        {category === "Contact" && (
                          <span className="text-cyan">
                            {link.includes("@") ? (
                              <Mail className="w-3 h-3" />
                            ) : link.includes("+") ? (
                              <Phone className="w-3 h-3" />
                            ) : (
                              <MapPin className="w-3 h-3" />
                            )}
                          </span>
                        )}
                        {link}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div
            className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground"
            style={{ borderTop: "1px solid oklch(0.31 0.03 230 / 0.3)" }}
          >
            <span>
              © {new Date().getFullYear()} Mountain Explorers India. All rights
              reserved.
            </span>
            <span>Built with care for trekkers.</span>
          </div>
        </div>
      </footer>

      {/* FLOATING CTA */}
      <AnimatePresence>
        {showFloatingCTA && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              data-ocid="floating.primary_button"
              onClick={() => openPackagesCatalog()}
              className="pill-btn font-bold shadow-2xl"
              style={{
                background: "oklch(0.85 0.13 192)",
                color: "oklch(0.13 0.04 195)",
                boxShadow:
                  "0 0 30px oklch(0.85 0.13 192 / 0.5), 0 4px 20px oklch(0 0 0 / 0.4)",
              }}
            >
              🏔 Browse packages
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import heroMountains from "@/assets/generated/hero-mountains.dim_1920x1080.jpg";
import { LOGO_URL } from "@/branding";
import SnowTerrain3D from "@/components/SnowTerrain3D";
import ThreeErrorBoundary from "@/components/ThreeErrorBoundary";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  CalendarDays,
  CheckCircle2,
  Bike,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Compass,
  Facebook,
  House,
  Instagram,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Mountain,
  Phone,
  Play,
  Search,
  Shield,
  SlidersHorizontal,
  Star,
  User,
  Users,
  Youtube,
} from "lucide-react";
import { motion } from "motion/react";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import type { PackageSearchFilters, Page } from "../types";
import { getUserBearerToken } from "../utils/userLocalSession";
import { viteEnvIsTrue } from "../utils/viteEnv";

interface HomePageProps {
  setPage: (page: Page) => void;
  openPackagesCatalog: (filters?: PackageSearchFilters) => void;
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

const WHY_FEATURES = [
  {
    icon: Compass,
    title: "Chain of Hotels & Resorts",
    desc: "By the name of Green stays Mountain Explorers we have our chain of camping sites, hotels & farmhouses across major tourist locations in India.",
  },
  {
    icon: Shield,
    title: "Expert Guide",
    desc: "All guides are certified from IMF with minimum 1000Hrs of climbing experience.",
  },
  {
    icon: Mountain,
    title: "Best Price",
    desc: "We assure best & cheap rates in this competitive market. Our aim is to make travel affordable to the common public.",
  },
];

const TESTIMONIALS = [
  {
    name: "Afreen",
    role: "Software developer",
    image: "/assets/Testimonial/afreen.jpeg",
    quote:
      "Worth traveling with family, and enjoying weekend activities.",
  },
  {
    name: "Amit Kumar",
    role: "Phd Scholar",
    image: "/assets/Testimonial/amit%20kumar.jpeg",
    quote:
      "Arrangement and location selection are superb.",
  },
  {
    name: "Sagar tamore",
    role: "Program director",
    image: "/assets/Testimonial/sagar.jpeg",
    quote:
      "Absolutely great - everything went according to plan.",
  },
  {
    name: "Chinmay pandit",
    role: "Musician",
    image: "/assets/Testimonial/chimay%20pandit.jpeg",
    quote: "A memorable experience at a much affordable cost.",
  },
];

const DESTINATION_LISTS = [
  {
    name: "Leh",
    tag: "Adventure",
    image: "/assets/Destination%20List/Leh-Ladakh.jpg",
  },
  {
    name: "Uttarakhand",
    tag: "Wildlife",
    image: "/assets/Destination%20List/Uttarkhand.jpg",
  },
  {
    name: "Himachal Pradesh",
    tag: "Adventure",
    image: "/assets/Destination%20List/himachal.jpg",
  },
  {
    name: "Gujarat",
    tag: "Culture",
    image: "/assets/Destination%20List/gujrat.webp",
  },
  {
    name: "Kerala",
    tag: "God's own country",
    image: "/assets/Destination%20List/kerls.webp",
  },
  {
    name: "Maharashtra",
    tag: "Weekend escapes",
    image: "/assets/Destination%20List/maharasta.jpg",
  },
];

const PLAN_BENEFITS = [
  "Explore the unexplored",
  "Affordable pricing",
  "Handpicked destinations",
  "Your trusted partner",
];

const LEADING_TRAVEL_FEATURES: Array<{
  title: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { title: "Cycling Tours", icon: Bike },
  { title: "Expedition Tours", icon: Mountain },
  { title: "Family Packages", icon: Users },
  { title: "Farmhouse & Hotels", icon: House },
];

const PARTNER_LOGOS = [
  "/assets/Partner/og-goibibo.aba291ed.png",
  "/assets/Partner/MakeMyTrip_Logo.png",
  "/assets/Partner/company%20limited%20Liabilty.jpg",
  "/assets/Partner/hissar%20agriculture.jpg",
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

/** Reference palette: utility bar + main nav (mountainexplorers-style) */
const NAV_TEAL = "#003d52";
const NAV_CTA_ORANGE = "#f05a42";
const UTILITY_PHONE_DISPLAY = "+91 9152714521";
const UTILITY_PHONE_TEL = "+919152714521";
const UTILITY_EMAIL = "mnt@mountainexplorer.ind.in";
const LOCAL_GUIDE_MAILTO = `mailto:${UTILITY_EMAIL}?subject=${encodeURIComponent("Become a local guide")}`;

const SOCIAL_LINKS: {
  icon: ComponentType<{ className?: string }>;
  href: string;
  label: string;
}[] = [
  {
    icon: Facebook,
    href: "https://www.facebook.com/people/Mountain-Explorers-India-%EF%B8%8F/100075502284640/",
    label: "Facebook",
  },
  {
    icon: Instagram,
    href: "https://www.instagram.com/mountainexplorers.ind/",
    label: "Instagram",
  },
  {
    icon: Youtube,
    href: "https://www.youtube.com/channel/UCnqGnj898l5ZQ217VC_JY0A",
    label: "YouTube",
  },
];

const HOME_HEADER_SECTION_LINKS: [string, string][] = [
  ["Home", ""],
  ["Treks", "treks"],
  ["About", "about"],
  ["Contact", "contact"],
];

export default function HomePage({
  setPage,
  openPackagesCatalog,
}: HomePageProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [travelDate, setTravelDate] = useState("");
  const [guests, setGuests] = useState(1);
  const [showPriceRange, setShowPriceRange] = useState(false);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(45675);
  const [testimonialStart, setTestimonialStart] = useState(0);
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
    logLogoDevContext(LOGO_URL);
    logDevBundledImages({ logoMountain: LOGO_URL, heroMountains });
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const closeMobileNav = () => setMobileNavOpen(false);
  const PRICE_MIN = 0;
  const PRICE_MAX = 45675;
  const rangeTrackLeft = ((minPrice - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;
  const rangeTrackRight =
    100 - ((maxPrice - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;
  const visibleTestimonials = Array.from({ length: 3 }, (_, offset) => {
    return TESTIMONIALS[(testimonialStart + offset) % TESTIMONIALS.length];
  });
  const showPrevTestimonial = () =>
    setTestimonialStart(
      (prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length,
    );
  const showNextTestimonial = () =>
    setTestimonialStart((prev) => (prev + 1) % TESTIMONIALS.length);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTestimonialStart((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* NAVBAR — utility bar + white main row (mountainexplorers-style) */}
      <header className="fixed top-0 left-0 right-0 z-50 shadow-sm">
        <div
          className="text-white/95 border-b border-white/10"
          style={{ backgroundColor: NAV_TEAL }}
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-6 h-10 sm:h-11 flex items-center justify-between gap-1.5 sm:gap-2 text-[11px] sm:text-sm">
            <div className="flex items-center gap-2 sm:gap-6 min-w-0">
              <a
                href={`tel:${UTILITY_PHONE_TEL}`}
                className="flex items-center gap-1.5 shrink-0 hover:opacity-90 transition-opacity"
                style={{ color: "#7dd3fc" }}
              >
                <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden sm:inline font-medium">
                  {UTILITY_PHONE_DISPLAY}
                </span>
              </a>
              <a
                href={`mailto:${UTILITY_EMAIL}`}
                className="hidden sm:flex items-center gap-1.5 min-w-0 hover:opacity-90 truncate"
                style={{ color: "#7dd3fc" }}
              >
                <Mail className="w-4 h-4 shrink-0" />
                <span className="truncate">{UTILITY_EMAIL}</span>
              </a>
            </div>
            <div className="flex items-center gap-1 sm:gap-4 shrink-0">
              <div className="flex items-center gap-0">
                {SOCIAL_LINKS.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      data-ocid={`nav.utility.social.${social.label.toLowerCase()}`}
                      className="p-1 sm:p-1.5 rounded-full hover:bg-white/10 transition-colors"
                    >
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    </a>
                  );
                })}
              </div>
              <a
                href={LOCAL_GUIDE_MAILTO}
                data-ocid="nav.utility.local_guide"
                className="font-bold uppercase tracking-wide text-white px-2 py-1.5 sm:px-3 text-[9px] sm:text-xs whitespace-nowrap rounded-sm hover:brightness-110 transition-all"
                style={{ backgroundColor: NAV_CTA_ORANGE }}
              >
                <span className="sm:hidden">LOCAL GUIDE</span>
                <span className="hidden sm:inline">BECOME A LOCAL GUIDE</span>
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-[5.25rem] h-[5.25rem] sm:min-h-24 sm:h-24 flex items-center gap-3 lg:grid lg:grid-cols-[auto_1fr_auto] lg:gap-6">
            <button
              type="button"
              className="flex items-center shrink-0 text-left py-1 -my-1"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              data-ocid="nav.logo"
            >
              <img
                src={LOGO_URL}
                alt="Mountain Explorers"
                className="h-11 w-auto sm:h-14 md:h-[4.25rem] max-h-[4.75rem] object-contain object-left rounded-md"
                {...(logoImgDevHandlers() ?? {})}
              />
            </button>

            <nav
              className="hidden lg:flex flex-wrap items-center justify-center gap-x-5 gap-y-1 xl:gap-x-6 min-w-0"
              aria-label="Primary"
            >
              <button
                type="button"
                className="text-sm font-semibold hover:opacity-75 transition-opacity"
                style={{ color: NAV_TEAL }}
                data-ocid="nav.link.home"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                Home
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex items-center gap-0.5 text-sm font-semibold hover:opacity-75 outline-none cursor-pointer"
                  style={{ color: NAV_TEAL }}
                  data-ocid="nav.tours.trigger"
                >
                  Tours
                  <ChevronDown className="w-4 h-4 opacity-70" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="min-w-[12rem]">
                  <DropdownMenuItem
                    onClick={() => scrollToSection("treks")}
                    data-ocid="nav.tours.treks"
                  >
                    Featured treks
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openPackagesCatalog()}
                    data-ocid="nav.tours.packages"
                  >
                    Browse packages
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                type="button"
                className="text-sm font-semibold hover:opacity-75"
                style={{ color: NAV_TEAL }}
                data-ocid="nav.destination"
                onClick={() => scrollToSection("treks")}
              >
                Destination
              </button>

              <button
                type="button"
                className="text-sm font-semibold hover:opacity-75"
                style={{ color: NAV_TEAL }}
                data-ocid="nav.blog"
                onClick={() => scrollToSection("testimonials")}
              >
                Blog
              </button>

              <button
                type="button"
                className="text-sm font-semibold hover:opacity-75"
                style={{ color: NAV_TEAL }}
                data-ocid="nav.about"
                onClick={() => scrollToSection("about")}
              >
                About
              </button>

              <button
                type="button"
                className="text-sm font-semibold hover:opacity-75"
                style={{ color: NAV_TEAL }}
                data-ocid="nav.contact"
                onClick={() => scrollToSection("contact")}
              >
                Contact
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex items-center gap-0.5 text-sm font-semibold hover:opacity-75 outline-none cursor-pointer"
                  style={{ color: NAV_TEAL }}
                  data-ocid="nav.services.trigger"
                >
                  Our services
                  <ChevronDown className="w-4 h-4 opacity-70" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="min-w-[14rem]">
                  <DropdownMenuItem
                    onClick={() => setPage("careers")}
                    data-ocid="nav.services.careers"
                  >
                    Careers
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openPackagesCatalog()}>
                    Gallery
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setPage("partners")}
                    data-ocid="nav.services.partner"
                  >
                    Our Partner
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setPage("team")}
                    data-ocid="nav.services.team"
                  >
                    Our Team
                  </DropdownMenuItem>
                  {nodeBackend && (
                    <DropdownMenuItem onClick={() => setPage("account")}>
                      Account
                    </DropdownMenuItem>
                  )}
                  {showMyBookingsNav && (
                    <DropdownMenuItem onClick={() => setPage("my-bookings")}>
                      My bookings
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => setPage("admin")}>
                      Admin
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>

            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 justify-end ml-auto lg:ml-0">
              <button
                type="button"
                className="hidden sm:inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted border border-border hover:bg-muted/80 transition-colors"
                aria-label="Search packages"
                data-ocid="nav.search"
                onClick={() => openPackagesCatalog()}
              >
                <Search className="h-5 w-5" style={{ color: NAV_TEAL }} />
              </button>
              <button
                type="button"
                className="hidden sm:inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 border border-amber-100 hover:bg-amber-100/90 transition-colors"
                aria-label={identity ? "Account" : "Log in"}
                data-ocid="nav.user"
                onClick={() =>
                  nodeBackend ? setPage("account") : void login()
                }
              >
                <User className="h-5 w-5" style={{ color: NAV_TEAL }} />
              </button>
              {identity && (
                <button
                  type="button"
                  className="hidden md:inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  data-ocid="nav.logout.button"
                  onClick={() => clear()}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden xl:inline">Logout</span>
                </button>
              )}
              <Button
                data-ocid="nav.primary_button"
                onClick={() => openPackagesCatalog()}
                className="pill-btn hidden sm:inline-flex text-sm px-6 py-2.5 h-12"
                style={{
                  background: "oklch(var(--brand-blue))",
                  color: "oklch(0.985 0 0)",
                  fontWeight: 700,
                }}
              >
                Book now
              </Button>

              <button
                type="button"
                className="lg:hidden inline-flex h-12 w-12 items-center justify-center rounded-md border border-border bg-muted/40 text-foreground hover:bg-muted/70"
                aria-label="Open menu"
                data-ocid="nav.mobile_menu.open"
                onClick={() => setMobileNavOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent
            side="right"
            className="flex h-full w-[min(100%,20rem)] flex-col gap-0 border-l border-border bg-background p-0 [&>button]:text-foreground"
          >
            <SheetHeader className="border-b border-border px-4 py-4 text-left space-y-3">
              <div
                className="rounded-lg px-3 py-2.5 text-white/95 text-xs space-y-2"
                style={{ backgroundColor: NAV_TEAL }}
              >
                <a
                  href={`tel:${UTILITY_PHONE_TEL}`}
                  className="flex items-center gap-2"
                  style={{ color: "#7dd3fc" }}
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  {UTILITY_PHONE_DISPLAY}
                </a>
                <a
                  href={`mailto:${UTILITY_EMAIL}`}
                  className="flex items-start gap-2 break-all"
                  style={{ color: "#7dd3fc" }}
                >
                  <Mail className="w-4 h-4 shrink-0 mt-0.5" />
                  {UTILITY_EMAIL}
                </a>
                <div className="flex items-center gap-1 pt-1">
                  {SOCIAL_LINKS.map((social) => {
                    const Icon = social.icon;
                    return (
                      <a
                        key={social.label}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={social.label}
                        className="p-1.5 rounded-full bg-white/10 hover:bg-white/15"
                      >
                        <Icon className="w-4 h-4 text-white" />
                      </a>
                    );
                  })}
                </div>
                <a
                  href={LOCAL_GUIDE_MAILTO}
                  className="block text-center font-bold uppercase tracking-wide text-[10px] py-2 rounded text-white"
                  style={{ backgroundColor: NAV_CTA_ORANGE }}
                >
                  BECOME A LOCAL GUIDE
                </a>
              </div>
              <SheetTitle className="font-display text-lg">Menu</SheetTitle>
              <SheetDescription className="sr-only">
                Site navigation and account actions
              </SheetDescription>
            </SheetHeader>
            <nav
              className="flex flex-col px-4 py-2 flex-1 overflow-y-auto"
              aria-label="Mobile navigation"
            >
              <button
                type="button"
                data-ocid="nav.mobile.home"
                onClick={() => {
                  closeMobileNav();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="w-full rounded-md px-3 py-3 text-left text-base font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
              >
                Home
              </button>
              <button
                type="button"
                data-ocid="nav.mobile.treks"
                onClick={() => {
                  closeMobileNav();
                  scrollToSection("treks");
                }}
                className="w-full rounded-md px-3 py-3 text-left text-base font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
              >
                Featured treks
              </button>
              <button
                type="button"
                data-ocid="nav.mobile.packages"
                onClick={() => {
                  closeMobileNav();
                  openPackagesCatalog();
                }}
                className="w-full rounded-md px-3 py-3 text-left text-base font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
              >
                Browse packages
              </button>
              {HOME_HEADER_SECTION_LINKS.filter(([l]) => l !== "Home").map(
                ([label, id]) => (
                  <button
                    key={label}
                    type="button"
                    data-ocid="nav.mobile.link"
                    onClick={() => {
                      closeMobileNav();
                      if (id) scrollToSection(id);
                    }}
                    className="w-full rounded-md px-3 py-3 text-left text-base font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
                  >
                    {label}
                  </button>
                ),
              )}
              <button
                type="button"
                data-ocid="nav.mobile.services.careers"
                onClick={() => {
                  closeMobileNav();
                  setPage("careers");
                }}
                className="w-full rounded-md px-3 py-3 text-left text-base font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
              >
                Careers
              </button>
              <button
                type="button"
                data-ocid="nav.mobile.services.gallery"
                onClick={() => {
                  closeMobileNav();
                  openPackagesCatalog();
                }}
                className="w-full rounded-md px-3 py-3 text-left text-base font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
              >
                Gallery
              </button>
              <button
                type="button"
                data-ocid="nav.mobile.services.partner"
                onClick={() => {
                  closeMobileNav();
                  setPage("partners");
                }}
                className="w-full rounded-md px-3 py-3 text-left text-base font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
              >
                Our Partner
              </button>
              <button
                type="button"
                data-ocid="nav.mobile.services.team"
                onClick={() => {
                  closeMobileNav();
                  setPage("team");
                }}
                className="w-full rounded-md px-3 py-3 text-left text-base font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
              >
                Our Team
              </button>
              {nodeBackend && (
                <button
                  type="button"
                  data-ocid="nav.mobile.account"
                  onClick={() => {
                    closeMobileNav();
                    setPage("account");
                  }}
                  className="w-full rounded-md px-3 py-3 text-left text-base font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
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
                  className="w-full rounded-md px-3 py-3 text-left text-base font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
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
                  className="w-full rounded-md px-3 py-3 text-left text-base font-medium transition-colors hover:bg-muted/80"
                  style={{ color: "oklch(var(--brand-coral))" }}
                >
                  Admin
                </button>
              )}
            </nav>
            <div className="mt-auto flex flex-col gap-3 border-t border-border px-4 py-4">
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
                  background: "oklch(var(--brand-blue))",
                  color: "oklch(0.985 0 0)",
                  fontWeight: 700,
                }}
              >
                Book now
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* HERO — 3D Snow Terrain */}
      <ThreeErrorBoundary>
        <SnowTerrain3D
          openBooking={(filters) => openPackagesCatalog(filters)}
          scrollToSection={scrollToSection}
        />
      </ThreeErrorBoundary>

      {/* SEARCH SECTION */}
      <section className="relative z-30 -mt-2 md:-mt-14 pb-6">
        <div className="max-w-7xl mx-auto px-6">
          <div
            className="rounded-xl bg-white p-3 sm:p-4 shadow-xl border border-white/70"
            style={{ boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-center">
              <label className="flex items-center gap-2.5 border border-transparent sm:border-r sm:pr-3">
                <CalendarDays className="w-4 h-4 text-cyan shrink-0" />
                <div className="min-w-0 w-full">
                  <span className="block text-[11px] font-medium text-muted-foreground">
                    When
                  </span>
                  <input
                    type="date"
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="w-full border-0 p-0 bg-transparent text-sm font-semibold focus:outline-none"
                  />
                </div>
              </label>

              <label className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-cyan shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[11px] font-medium text-muted-foreground">
                    Guests
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value) || 1)}
                    className="w-20 border-0 p-0 bg-transparent text-sm font-semibold focus:outline-none"
                  />
                </div>
              </label>
              <div className="hidden sm:flex items-center justify-center">
                <button
                  type="button"
                  aria-label="Toggle price filter"
                  onClick={() => setShowPriceRange((v) => !v)}
                  className="inline-flex items-center justify-center rounded-md p-2 hover:bg-muted/70 transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4 text-cyan" />
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  openPackagesCatalog({
                    destination: "",
                    date: travelDate,
                    guests: Math.max(1, guests),
                    minPrice,
                    maxPrice,
                  })
                }
                className="h-12 px-6 rounded-lg font-bold tracking-[0.14em] text-xs uppercase inline-flex items-center justify-center gap-2"
                style={{
                  background: "oklch(var(--brand-blue))",
                  color: "oklch(0.985 0 0)",
                }}
              >
                <Search className="w-4 h-4" />
                Search
              </button>
            </div>

            {showPriceRange && (
              <div className="mt-3 pt-3 border-t border-border/70">
                <div className="relative h-8">
                  <div className="absolute top-3 left-0 right-0 h-1.5 rounded-full bg-[oklch(0.9_0.02_248)]" />
                  <div
                    className="absolute top-3 h-1.5 rounded-full"
                    style={{
                      left: `${rangeTrackLeft}%`,
                      right: `${rangeTrackRight}%`,
                      background: "oklch(var(--brand-blue))",
                    }}
                  />
                  <input
                    type="range"
                    min={PRICE_MIN}
                    max={PRICE_MAX}
                    value={minPrice}
                    onChange={(e) => {
                      const value = Math.min(Number(e.target.value), maxPrice - 500);
                      setMinPrice(value);
                    }}
                    className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-auto"
                    aria-label="Minimum price"
                  />
                  <input
                    type="range"
                    min={PRICE_MIN}
                    max={PRICE_MAX}
                    value={maxPrice}
                    onChange={(e) => {
                      const value = Math.max(Number(e.target.value), minPrice + 500);
                      setMaxPrice(value);
                    }}
                    className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-auto"
                    aria-label="Maximum price"
                  />
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-cyan">
                  <span>₹{minPrice.toLocaleString("en-IN")}</span>
                  <span>₹{maxPrice.toLocaleString("en-IN")}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* DESTINATION LISTS */}
      <section id="treks" className="pt-6 md:pt-10 pb-20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <p className="text-cyan text-xs font-bold tracking-[0.3em] uppercase mb-3">
              Destination lists
            </p>
            <h2
              className="font-display font-extrabold text-foreground"
              style={{ fontSize: "clamp(30px, 4vw, 52px)" }}
            >
              Go Exotic Places
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {DESTINATION_LISTS.map((destination, i) => (
              <motion.div
                key={destination.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
                className="glass-card rounded-2xl overflow-hidden"
              >
                <img
                  src={destination.image}
                  alt={destination.name}
                  className="h-44 w-full object-cover"
                  loading="lazy"
                />
                <div className="p-5">
                  <p className="text-xs uppercase tracking-wider text-cyan mb-2">
                    {destination.tag}
                  </p>
                  <h3 className="font-display text-xl font-bold text-foreground">
                    {destination.name}
                  </h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED EXPEDITIONS */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <p className="text-cyan text-xs font-bold tracking-[0.3em] uppercase mb-3">
              FEATURED EXPEDITIONS
            </p>
            <h2
              className="font-display font-extrabold text-foreground"
              style={{ fontSize: "clamp(30px, 4vw, 52px)" }}
            >
              Choose Your Peak
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TREK_CARDS.map((trek, i) => (
              <motion.div
                key={trek.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="trek-card-hover rounded-2xl overflow-hidden cursor-pointer relative group"
                style={{
                  background: "oklch(0.98 0.009 248)",
                  border: "1px solid oklch(0.88 0.02 248 / 0.6)",
                }}
                onClick={() => openPackagesCatalog()}
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
                        "linear-gradient(to top, oklch(0.2 0.06 248 / 0.5) 0%, transparent 50%)",
                    }}
                  />
                </div>
                <div className="p-5 space-y-4">
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {trek.name}
                  </h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{trek.duration}</span>
                    <span className="font-bold text-cyan">{trek.price}</span>
                  </div>
                  <Button
                    onClick={() => openPackagesCatalog()}
                    className="w-full"
                    style={{
                      background: "oklch(var(--brand-blue))",
                      color: "oklch(0.985 0 0)",
                    }}
                  >
                    View Trek
                  </Button>
                </div>
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
              Our benefit lists
            </p>
            <h2
              className="font-display font-extrabold text-foreground"
              style={{ fontSize: "clamp(32px, 4vw, 54px)" }}
            >
              Why Choose Mountain Explorers
            </h2>
            <p className="text-muted-foreground mt-4 max-w-4xl mx-auto leading-relaxed">
              We manage trekking, camping, hiking & family tour packages across
              India in affordable costing. We ensure best service along with one
              to one assistance to each participant.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
                    background: "oklch(var(--brand-blue) / 0.1)",
                    border: "1px solid oklch(var(--brand-blue) / 0.3)",
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
      <section id="testimonials" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <p className="text-cyan italic text-xl sm:text-2xl mb-2">
              Testimonials & reviews
            </p>
            <h2
              className="font-display font-extrabold text-foreground"
              style={{ fontSize: "clamp(32px, 4vw, 54px)" }}
            >
              What They&apos;re Saying
            </h2>
          </motion.div>

          <div className="relative mb-10">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Previous testimonials"
              className="hidden md:inline-flex rounded-full absolute left-0 top-1/2 -translate-y-1/2 z-10"
              onClick={showPrevTestimonial}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Next testimonials"
              className="hidden md:inline-flex rounded-full absolute right-0 top-1/2 -translate-y-1/2 z-10"
              onClick={showNextTestimonial}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:px-14">
              {visibleTestimonials.map((t, i) => (
                <motion.div
                  key={`${t.name}-avatar`}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  className={`justify-center ${i === 0 ? "flex" : "hidden md:flex"}`}
                >
                  <img
                    src={t.image}
                    alt={t.name}
                    className="h-40 w-40 md:h-44 md:w-44 rounded-full object-cover"
                    loading="lazy"
                  />
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 mb-6 md:hidden">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Previous testimonials"
              className="rounded-full"
              onClick={showPrevTestimonial}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Next testimonials"
              className="rounded-full"
              onClick={showNextTestimonial}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {visibleTestimonials.map((t, i) => (
              <motion.div
                key={`${t.name}-${testimonialStart}`}
                data-ocid={`testimonials.item.${i + 1}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`rounded-xl bg-white p-7 text-center shadow-[0_16px_32px_oklch(0.2_0.02_248/0.08)] ${i === 0 ? "block" : "hidden md:block"}`}
              >
                <div className="flex items-center justify-center gap-1 mb-4">
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
                <p className="text-foreground leading-relaxed text-lg font-medium mb-5">
                  {t.quote}
                </p>
                <p className="font-extrabold text-foreground text-2xl">{t.name}</p>
                <p className="text-sm uppercase tracking-[0.15em] text-cyan font-semibold mt-1">
                  {t.role}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* DISCOUNT + PLAN YOUR TRIP */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div
            className="rounded-3xl overflow-hidden border"
            style={{ borderColor: "oklch(0.88 0.02 248 / 0.6)" }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="relative min-h-[320px] lg:min-h-[420px]">
                <img
                  src="/assets/paris.jpg"
                  alt="30 percent discount tour promotion"
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
              </div>

              <div className="bg-white px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
                <p className="text-cyan text-xs font-bold tracking-[0.3em] uppercase mb-3">
                  Get to know us
                </p>
                <h2
                  className="font-display font-extrabold text-foreground mb-4"
                  style={{ fontSize: "clamp(30px, 4vw, 50px)" }}
                >
                  Plan your trip with Mountain Explorers
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-8">
                  Explore a wide variety of events such as hiking, mountain
                  staycation, cycling, family tours, cultural tours and many
                  more.
                </p>

                <div className="space-y-3 mb-8">
                  {PLAN_BENEFITS.map((item) => (
                    <div key={item} className="flex items-start gap-2.5">
                      <CheckCircle2
                        className="w-4 h-4 mt-0.5 shrink-0"
                        style={{ color: "oklch(var(--brand-blue))" }}
                      />
                      <span className="text-foreground">{item}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => openPackagesCatalog()}
                  className="pill-btn px-8"
                  style={{
                    background: "oklch(var(--brand-blue))",
                    color: "oklch(0.985 0 0)",
                    fontWeight: 700,
                  }}
                >
                  Book with us now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LEADING TRAVEL COMPANY */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div
            className="relative overflow-hidden rounded-2xl border"
            style={{
              borderColor: "oklch(0.88 0.02 248 / 0.45)",
              backgroundImage:
                "linear-gradient(oklch(0.12 0.02 255 / 0.78), oklch(0.12 0.02 255 / 0.78)), url('/assets/generated/hero-mountains.dim_1920x1080.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
              <div className="px-6 py-8 sm:px-8 sm:py-10">
                <button
                  type="button"
                  className="h-16 w-24 rounded-xl border border-white/40 bg-[oklch(var(--brand-blue))] text-white flex items-center justify-center mb-5"
                  aria-label="Play"
                >
                  <Play className="w-8 h-8 fill-current" />
                </button>
                <p className="text-cyan italic text-xl sm:text-2xl mb-3">
                  Are you ready to travel!
                </p>
                <h2 className="font-display text-white font-extrabold text-4xl leading-tight max-w-xl">
                  Mountain explorers is India&apos;s leading travel company
                </h2>
              </div>
              <div className="grid grid-cols-2 border-t lg:border-t-0 lg:border-l border-[oklch(0.75_0.01_248/0.35)]">
                {LEADING_TRAVEL_FEATURES.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="border-[oklch(0.75_0.01_248/0.35)] border-r even:border-r-0 border-b even:border-b last:border-b-0 p-6 flex flex-col justify-center items-center text-center gap-3 min-h-[140px]"
                    >
                      <Icon className="w-10 h-10 text-[oklch(var(--brand-blue))]" />
                      <p className="text-white font-bold text-2xl leading-tight">
                        {item.title}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OUR PARTNERS */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div
            className="rounded-2xl px-6 py-8 sm:px-10 sm:py-10"
            style={{
              background:
                "linear-gradient(135deg, oklch(var(--brand-blue)) 0%, oklch(0.58 0.17 245) 100%)",
            }}
          >
            <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
              <h3 className="font-display text-white text-4xl font-extrabold whitespace-nowrap">
                Our Partners
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                {PARTNER_LOGOS.map((logoPath) => (
                  <div
                    key={logoPath}
                    className="rounded-md bg-white/90 p-2 h-20 flex items-center justify-center"
                  >
                    <img
                      src={logoPath}
                      alt="Partner logo"
                      className="max-h-full w-auto object-contain"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        id="contact"
        className="pt-16 pb-8"
        style={{ borderTop: "1px solid oklch(0.88 0.02 248 / 0.45)" }}
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
                        background: "oklch(0.965 0.012 248)",
                        border: "1px solid oklch(0.88 0.02 248 / 0.6)",
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
            style={{ borderTop: "1px solid oklch(0.88 0.02 248 / 0.5)" }}
          >
            <span>
              © {new Date().getFullYear()} Mountain Explorers India. All rights
              reserved.
            </span>
            <span>Built with care for trekkers.</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

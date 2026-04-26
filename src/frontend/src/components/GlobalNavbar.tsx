import { LOGO_URL } from "@/branding";
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
import {
  ChevronDown,
  Facebook,
  Instagram,
  Mail,
  Menu,
  Phone,
  Search,
  User,
  Youtube,
} from "lucide-react";
import { useState } from "react";
import type { Page } from "../types";

interface Props {
  setPage: (page: Page) => void;
  openPackagesCatalog: () => void;
}

const NAV_TEAL = "#003d52";
const NAV_CTA_ORANGE = "#f05a42";
const UTILITY_PHONE_DISPLAY = "+91 9152714521";
const UTILITY_PHONE_TEL = "+919152714521";
const UTILITY_EMAIL = "mnt@mountainexplorer.ind.in";
const LOCAL_GUIDE_MAILTO = `mailto:${UTILITY_EMAIL}?subject=${encodeURIComponent("Become a local guide")}`;

const SOCIAL_LINKS = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Youtube, href: "#", label: "YouTube" },
];

export default function GlobalNavbar({ setPage, openPackagesCatalog }: Props) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 shadow-sm">
      <div
        className="text-white/95 border-b border-white/10"
        style={{ backgroundColor: NAV_TEAL }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-10 sm:h-11 flex items-center justify-between gap-2 text-[11px] sm:text-sm">
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            <a
              href={`tel:${UTILITY_PHONE_TEL}`}
              className="flex items-center gap-1.5 shrink-0 hover:opacity-90 transition-opacity"
              style={{ color: "#7dd3fc" }}
            >
              <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="font-medium">{UTILITY_PHONE_DISPLAY}</span>
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
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="flex items-center gap-0.5">
              {SOCIAL_LINKS.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-white" />
                  </a>
                );
              })}
            </div>
            <a
              href={LOCAL_GUIDE_MAILTO}
              className="font-bold uppercase tracking-wide text-white px-2 py-1.5 sm:px-3 text-[9px] sm:text-xs whitespace-nowrap rounded-sm hover:brightness-110 transition-all"
              style={{ backgroundColor: NAV_CTA_ORANGE }}
            >
              BECOME A LOCAL GUIDE
            </a>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-[5.25rem] h-[5.25rem] sm:min-h-24 sm:h-24 flex items-center gap-3 lg:grid lg:grid-cols-[auto_1fr_auto] lg:gap-6">
          <button
            type="button"
            className="flex items-center shrink-0 text-left py-1 -my-1"
            onClick={() => setPage("home")}
          >
            <img
              src={LOGO_URL}
              alt="Mountain Explorers"
              className="h-11 w-auto sm:h-14 md:h-[4.25rem] max-h-[4.75rem] object-contain object-left rounded-md"
            />
          </button>
          <nav
            className="hidden lg:flex flex-wrap items-center justify-center gap-x-5 gap-y-1 xl:gap-x-6 min-w-0"
            aria-label="Primary"
          >
            <button type="button" className="text-sm font-semibold" style={{ color: NAV_TEAL }} onClick={() => setPage("home")}>
              Home
            </button>
            <button type="button" className="text-sm font-semibold" style={{ color: NAV_TEAL }} onClick={openPackagesCatalog}>
              Tours
            </button>
            <button type="button" className="text-sm font-semibold" style={{ color: NAV_TEAL }} onClick={openPackagesCatalog}>
              Destination
            </button>
            <button type="button" className="text-sm font-semibold" style={{ color: NAV_TEAL }} onClick={openPackagesCatalog}>
              Blog
            </button>
            <button type="button" className="text-sm font-semibold" style={{ color: NAV_TEAL }} onClick={() => setPage("home")}>
              About
            </button>
            <button type="button" className="text-sm font-semibold" style={{ color: NAV_TEAL }} onClick={() => setPage("home")}>
              Contact
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex items-center gap-0.5 text-sm font-semibold outline-none cursor-pointer"
                style={{ color: NAV_TEAL }}
              >
                Our services
                <ChevronDown className="w-4 h-4 opacity-70" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="min-w-[14rem]">
                <DropdownMenuItem onClick={() => setPage("careers")}>
                  Careers
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openPackagesCatalog}>
                  Gallery
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPage("partners")}>
                  Our Partner
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPage("team")}>
                  Our Team
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 justify-end ml-auto lg:ml-0">
            <button
              type="button"
              className="hidden sm:inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted border border-border hover:bg-muted/80 transition-colors"
              aria-label="Search packages"
              onClick={openPackagesCatalog}
            >
              <Search className="h-5 w-5" style={{ color: NAV_TEAL }} />
            </button>
            <button
              type="button"
              className="hidden sm:inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 border border-amber-100 hover:bg-amber-100/90 transition-colors"
              aria-label="Account"
              onClick={() => setPage("account")}
            >
              <User className="h-5 w-5" style={{ color: NAV_TEAL }} />
            </button>
            <button
              type="button"
              className="lg:hidden inline-flex h-12 w-12 items-center justify-center rounded-md border border-border bg-muted/40 text-foreground hover:bg-muted/70"
              aria-label="Open menu"
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
          <SheetHeader className="border-b border-border px-4 py-4 text-left">
            <SheetTitle className="font-display text-lg">Menu</SheetTitle>
            <SheetDescription className="sr-only">
              Site navigation and account actions
            </SheetDescription>
          </SheetHeader>
          <nav className="flex flex-col px-4 py-2">
            <button type="button" className="w-full rounded-md px-3 py-3 text-left" onClick={() => { setMobileNavOpen(false); setPage("home"); }}>Home</button>
            <button type="button" className="w-full rounded-md px-3 py-3 text-left" onClick={() => { setMobileNavOpen(false); setPage("careers"); }}>Careers</button>
            <button type="button" className="w-full rounded-md px-3 py-3 text-left" onClick={() => { setMobileNavOpen(false); setPage("partners"); }}>Our Partner</button>
            <button type="button" className="w-full rounded-md px-3 py-3 text-left" onClick={() => { setMobileNavOpen(false); setPage("team"); }}>Our Team</button>
            <button type="button" className="w-full rounded-md px-3 py-3 text-left" onClick={() => { setMobileNavOpen(false); openPackagesCatalog(); }}>Packages</button>
            <button type="button" className="w-full rounded-md px-3 py-3 text-left" onClick={() => { setMobileNavOpen(false); setPage("account"); }}>Account</button>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}

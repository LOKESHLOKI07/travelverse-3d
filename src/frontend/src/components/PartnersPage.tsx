import { Button } from "@/components/ui/button";
import { LOGO_URL } from "@/branding";
import {
  ArrowLeft,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  Youtube,
} from "lucide-react";
import type { Page } from "../types";

interface Props {
  setPage: (page: Page) => void;
}

type PartnerCard = {
  id: string;
  name: string;
  note: string;
  readMore: string;
  image: string;
};

const PARTNERS: PartnerCard[] = [
  {
    id: "goibibo",
    name: "Goibibo",
    note: "Flights Booking at Lowest Airfare, Book Air Tickets",
    readMore: "Flight Tickets",
    image: "/assets/Partner/og-goibibo.aba291ed.png",
  },
  {
    id: "makemytrip",
    name: "MakeMyTrip",
    note: "Cheap Flights, Air Ticket Booking at Lowest Airfare",
    readMore: "Flight Booking",
    image: "/assets/Partner/MakeMyTrip_Logo.png",
  },
  {
    id: "hau-mountain-club",
    name: "Hissar Agricultural University, Mountain Club",
    note: "Youth for adventure partnership and trek collaboration.",
    readMore: "HAU | HISAR",
    image: "/assets/Partner/hissar%20agriculture.jpg",
  },
  {
    id: "odyssey",
    name: "Odyssey Travel",
    note: "Company limited liability and travel operations support.",
    readMore: "Learn More",
    image: "/assets/Partner/company%20limited%20Liabilty.jpg",
  },
];

const SIDE_POSTS = [
  {
    id: "blog-1",
    title: "A Frightening Encounter: My Personal Horror Experience in Rajasthan",
    image:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=220&fit=crop",
  },
  {
    id: "blog-2",
    title: "A Memorable Journey to Yunum Peak: My Trekking Experience",
    image:
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=220&fit=crop",
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

const SOCIAL_LINKS = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Youtube, href: "#", label: "YouTube" },
];

export default function PartnersPage({ setPage }: Props) {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-20 border-b border-border bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setPage("home")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <div className="h-5 w-px bg-border" />
          <span className="font-display font-bold text-lg tracking-tight">
            Our <span style={{ color: "oklch(var(--brand-blue))" }}>Partner</span>
          </span>
        </div>
      </header>

      <section
        className="relative py-16 px-6 text-white overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(0deg, oklch(0.32 0.12 255 / 0.75), oklch(0.32 0.12 255 / 0.75)), url(https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1600&fit=crop)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-7xl mx-auto flex items-end justify-between gap-5">
          <h1 className="font-display text-5xl font-black">Our Partner</h1>
          <div className="bg-white text-slate-700 px-5 py-3 rounded-md text-sm font-semibold">
            Home / <span className="text-sky-600">Our Partner</span>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <section className="grid sm:grid-cols-2 gap-5">
            {PARTNERS.map((partner) => (
              <article
                key={partner.id}
                className="border border-border rounded-md bg-white p-5 flex flex-col"
              >
                <div className="h-40 bg-slate-50 rounded-md flex items-center justify-center mb-5 p-3">
                  <img
                    src={partner.image}
                    alt={partner.name}
                    className="max-h-28 max-w-full object-contain"
                  />
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground leading-tight">
                  {partner.name}
                </h2>
                <p className="mt-3 text-muted-foreground text-sm">{partner.note}</p>
                <p className="mt-4 text-muted-foreground text-sm">
                  Read more link: <span className="text-cyan">{partner.readMore}</span>
                </p>
              </article>
            ))}
          </section>

          <aside className="space-y-5">
            <div className="border border-border rounded-md p-4 bg-white">
              <h3 className="font-display font-bold text-foreground mb-3">
                Recent Posts
              </h3>
              <div className="space-y-4">
                {SIDE_POSTS.map((post) => (
                  <div key={post.id} className="flex gap-3">
                    <img
                      src={post.image}
                      alt=""
                      className="w-[88px] h-[64px] object-cover rounded"
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />0 comments
                      </p>
                      <p className="font-display text-xl leading-6 font-bold text-foreground mt-1">
                        {post.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-md overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=680&fit=crop"
                alt=""
                className="w-full h-60 object-cover"
              />
            </div>
          </aside>
        </div>
      </main>

      <section
        className="py-14 px-6 mt-4"
        style={{
          background:
            "linear-gradient(120deg, oklch(var(--brand-blue)) 0%, oklch(0.48 0.17 252) 100%)",
        }}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-white/85 text-xl font-semibold">Plan your trip with us</p>
            <h3 className="font-display text-white text-5xl font-black">
              Ready for an unforgettable tour?
            </h3>
          </div>
          <Button className="h-14 px-8 text-base font-extrabold tracking-wide bg-slate-900 hover:bg-slate-800 text-white">
            BOOK TOUR NOW
          </Button>
        </div>
      </section>

      <footer
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

      <div className="fixed right-4 bottom-4">
        <Button
          type="button"
          className="h-11 rounded-full px-4 bg-white text-slate-700 border border-slate-200 shadow-md hover:bg-slate-50"
        >
          <MessageCircle className="w-5 h-5 text-green-500" />
          WhatsApp us
        </Button>
      </div>
    </div>
  );
}

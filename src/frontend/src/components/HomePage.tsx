import { ArrowDown, ArrowRight, MapPin } from "lucide-react";
import { motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import FloatingParticles from "./FloatingParticles";

type Page = "home" | "trek-detail";

interface HomePageProps {
  setPage: (page: Page) => void;
  openBooking: (dest?: string) => void;
}

const TREK_ROWS = [
  {
    id: 1,
    index: "01",
    name: "Friendship Peak",
    region: "Kullu, Himachal Pradesh",
    altitude: "5,289m",
    duration: "8 Days",
    difficulty: "Moderate–Hard",
    price: "\u20B928,500",
  },
  {
    id: 2,
    index: "02",
    name: "Hampta Pass",
    region: "Lahaul, Himachal Pradesh",
    altitude: "4,270m",
    duration: "5 Days",
    difficulty: "Moderate",
    price: "\u20B918,500",
  },
  {
    id: 3,
    index: "03",
    name: "Kedarkantha",
    region: "Uttarkashi, Uttarakhand",
    altitude: "3,800m",
    duration: "6 Days",
    difficulty: "Easy–Moderate",
    price: "\u20B914,500",
  },
];

const DESTINATIONS = [
  { name: "Leh / Ladakh", state: "Ladakh UT" },
  { name: "Spiti Valley", state: "Himachal Pradesh" },
  { name: "Kasol & Kheerganga", state: "Himachal Pradesh" },
  { name: "Kedarnath", state: "Uttarakhand" },
  { name: "Badrinath", state: "Uttarakhand" },
  { name: "Roopkund", state: "Uttarakhand" },
  { name: "Valley of Flowers", state: "Uttarakhand" },
  { name: "Hampta Pass", state: "Himachal Pradesh" },
  { name: "Chadar Trek", state: "Ladakh UT" },
  { name: "Sandakphu", state: "West Bengal" },
  { name: "Goechala", state: "Sikkim" },
  { name: "Beas Kund", state: "Himachal Pradesh" },
];

const TESTIMONIALS = [
  {
    name: "Priya Sharma",
    location: "Mumbai",
    quote:
      "Friendship Peak was a life-changing experience. The guides were exceptional and safety was top priority throughout.",
  },
  {
    name: "Arjun Mehta",
    location: "Delhi",
    quote:
      "Hampta Pass in 5 days felt like 5 lifetimes of memories. Mountain Explorers made it completely effortless.",
  },
  {
    name: "Kavya Reddy",
    location: "Bangalore",
    quote:
      "The pre-trek preparation sessions and the summit push \u2014 I've never felt more alive in my life.",
  },
];

function RevealSection({
  children,
  delay = 0,
}: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default function HomePage({ setPage, openBooking }: HomePageProps) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const navScrolled = scrollY > 60;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground overflow-x-hidden">
      {/* NAV */}
      <header
        data-ocid="nav.panel"
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: navScrolled ? "rgba(10,10,10,0.93)" : "transparent",
          backdropFilter: navScrolled ? "blur(20px)" : "none",
          borderBottom: navScrolled ? "1px solid oklch(0.2 0 0)" : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2.5"
          >
            <img
              src="/assets/generated/mountain-explorers-logo-transparent.dim_300x300.png"
              alt="Mountain Explorers"
              className="w-7 h-7 rounded-full object-cover"
            />
            <span className="font-sans text-[11px] font-semibold tracking-[0.14em] uppercase text-foreground">
              Mountain Explorers
            </span>
          </button>

          <nav
            className="hidden md:flex items-center gap-8"
            aria-label="Primary"
          >
            {(
              [
                ["Treks", "treks"],
                ["Destinations", "destinations"],
                ["About", "about"],
                ["Contact", "contact"],
              ] as [string, string][]
            ).map(([label, id]) => (
              <button
                key={label}
                type="button"
                data-ocid={`nav.${label.toLowerCase()}.link`}
                className="nav-link"
                onClick={() => scrollTo(id)}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              data-ocid="nav.book.button"
              onClick={() => openBooking()}
              className="text-[11px] tracking-[0.12em] uppercase px-4 py-1.5 border border-foreground/20 text-foreground/60 hover:border-foreground/50 hover:text-foreground transition-all duration-200"
            >
              Book Now
            </button>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative min-h-screen flex flex-col justify-end pb-24 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/assets/generated/hero-mountains.dim_1920x1080.jpg"
            alt=""
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(10,10,10,0.4) 0%, rgba(10,10,10,0.65) 55%, #0a0a0a 100%)",
            }}
          />
          <FloatingParticles count={10} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 w-full">
          <motion.div
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <p className="section-number mb-6">
              Est. 2018 \u2014 Himalayan Expeditions
            </p>
            <h1
              className="font-display leading-none tracking-tight"
              style={{ fontSize: "clamp(64px, 11vw, 168px)", color: "#f5f5f0" }}
            >
              Mountain
            </h1>
            <h1
              className="font-display leading-none tracking-tight"
              style={{
                fontSize: "clamp(64px, 11vw, 168px)",
                color: "transparent",
                WebkitTextStroke: "1px rgba(245,245,240,0.38)",
              }}
            >
              Explorers
            </h1>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                data-ocid="hero.primary_button"
                onClick={() => scrollTo("treks")}
                className="inline-flex items-center gap-2 text-[11px] tracking-[0.12em] uppercase px-6 py-3.5 bg-foreground text-background font-semibold hover:bg-foreground/90 transition-colors"
              >
                View Expeditions <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                data-ocid="hero.secondary_button"
                onClick={() => openBooking()}
                className="inline-flex items-center gap-2 text-[11px] tracking-[0.12em] uppercase px-6 py-3.5 border border-foreground/25 text-foreground/65 hover:border-foreground/50 hover:text-foreground transition-all"
              >
                Book an Expedition
              </button>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-foreground/35"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
        >
          <span className="text-[10px] tracking-[0.22em] uppercase">
            Scroll to discover
          </span>
          <ArrowDown className="w-3.5 h-3.5 scroll-bounce" />
        </motion.div>
      </section>

      {/* 01 — TREKS */}
      <section id="treks" className="max-w-7xl mx-auto px-6 lg:px-10 py-28">
        <RevealSection>
          <div className="flex items-start gap-6 mb-16">
            <span className="section-number mt-1.5">01</span>
            <div>
              <h2
                className="font-display leading-tight"
                style={{ fontSize: "clamp(32px, 5vw, 68px)" }}
              >
                Signature
                <br />
                <span className="glow-cyan">Expeditions</span>
              </h2>
            </div>
          </div>
        </RevealSection>

        <div className="border-t border-border" data-ocid="treks.list">
          {TREK_ROWS.map((trek, i) => (
            <RevealSection key={trek.id} delay={i * 0.1}>
              <button
                type="button"
                data-ocid={`treks.item.${i + 1}`}
                className="trek-row w-full text-left px-0 py-8 group flex items-center justify-between gap-6"
                onClick={() => setPage("trek-detail")}
              >
                <div className="flex items-baseline gap-6 min-w-0">
                  <span
                    className="font-display shrink-0 select-none"
                    style={{
                      fontSize: "clamp(24px, 3.5vw, 48px)",
                      color: "oklch(0.2 0 0)",
                    }}
                  >
                    {trek.index}
                  </span>
                  <div className="min-w-0">
                    <h3
                      className="font-display font-bold leading-tight group-hover:text-cyan transition-colors duration-200"
                      style={{ fontSize: "clamp(18px, 2.2vw, 30px)" }}
                    >
                      {trek.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {trek.region}
                    </p>
                  </div>
                </div>

                <div className="hidden lg:flex items-center gap-10 shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      Altitude
                    </p>
                    <p className="text-sm font-semibold mt-0.5">
                      {trek.altitude}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      Duration
                    </p>
                    <p className="text-sm font-semibold mt-0.5">
                      {trek.duration}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      Difficulty
                    </p>
                    <p className="text-sm font-semibold mt-0.5">
                      {trek.difficulty}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      From
                    </p>
                    <p className="text-sm font-bold mt-0.5 text-cyan">
                      {trek.price}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                </div>

                <div className="lg:hidden shrink-0 text-right">
                  <p className="font-bold text-cyan text-sm">{trek.price}</p>
                  <p className="text-xs text-muted-foreground">
                    {trek.duration}
                  </p>
                </div>
              </button>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* 02 — ABOUT */}
      <section id="about" className="py-28 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <RevealSection>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
              <div>
                <div className="flex items-start gap-6 mb-10">
                  <span className="section-number mt-1.5">02</span>
                  <h2
                    className="font-display leading-tight"
                    style={{ fontSize: "clamp(28px, 4vw, 58px)" }}
                  >
                    We guide you
                    <br />
                    <span className="glow-cyan">to the summit.</span>
                  </h2>
                </div>
                <p className="text-muted-foreground leading-relaxed text-sm max-w-md">
                  Mountain Explorers is India's premier high-altitude trekking
                  company. Founded by UIAA-certified mountaineers, we've guided
                  over 2,000 trekkers through the Himalayas \u2014 safely,
                  responsibly, and with deep reverence for the mountains.
                </p>
                <div className="mt-10 grid grid-cols-3 gap-6">
                  {[
                    { stat: "2,000+", label: "Trekkers guided" },
                    { stat: "98%", label: "Summit success" },
                    { stat: "0", label: "Safety incidents" },
                  ].map(({ stat, label }) => (
                    <div key={label}>
                      <p className="font-display text-3xl font-bold glow-cyan">
                        {stat}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <img
                  src="/assets/generated/experience-summit-sunrise.dim_800x500.jpg"
                  alt="Summit at sunrise in the Himalayas"
                  className="w-full aspect-[4/3] object-cover"
                  style={{ filter: "brightness(0.85)" }}
                />
                <div className="absolute bottom-5 left-5 right-5 glass-panel p-4">
                  <p className="section-number mb-1">Summit experience</p>
                  <p className="text-xs text-foreground/70 leading-snug">
                    Standing at 5,289m, above the clouds, above doubt \u2014
                    this is why you came.
                  </p>
                </div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* 03 — DESTINATIONS */}
      <section id="destinations" className="py-28 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <RevealSection>
            <div className="flex items-start gap-6 mb-16">
              <span className="section-number mt-1.5">03</span>
              <div>
                <h2
                  className="font-display leading-tight"
                  style={{ fontSize: "clamp(28px, 4vw, 58px)" }}
                >
                  India's finest
                  <br />
                  <span className="glow-cyan">destinations</span>
                </h2>
                <p className="text-muted-foreground text-xs mt-3 uppercase tracking-widest">
                  {DESTINATIONS.length} destinations across the Indian Himalayas
                </p>
              </div>
            </div>
          </RevealSection>

          <div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-0 border-t border-l border-border"
            data-ocid="destinations.list"
          >
            {DESTINATIONS.map((dest, i) => (
              <RevealSection key={dest.name} delay={i * 0.04}>
                <div
                  data-ocid={`destinations.item.${i + 1}`}
                  className="border-r border-b border-border p-6 hover:bg-[#111] transition-colors group cursor-default"
                >
                  <p className="font-medium text-sm text-foreground group-hover:text-cyan transition-colors leading-snug">
                    {dest.name}
                  </p>
                  <p className="dest-tag mt-1">{dest.state}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* 04 — TESTIMONIALS */}
      <section className="py-28 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <RevealSection>
            <div className="flex items-start gap-6 mb-16">
              <span className="section-number mt-1.5">04</span>
              <h2
                className="font-display leading-tight"
                style={{ fontSize: "clamp(28px, 4vw, 58px)" }}
              >
                What our
                <br />
                <span className="glow-cyan">trekkers say</span>
              </h2>
            </div>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-l border-border">
            {TESTIMONIALS.map((t, i) => (
              <RevealSection key={t.name} delay={i * 0.12}>
                <div
                  data-ocid={`testimonials.item.${i + 1}`}
                  className="border-r border-b border-border p-8 flex flex-col gap-6"
                >
                  <p className="text-foreground/70 leading-relaxed text-sm">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-auto">
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="dest-tag mt-0.5">{t.location}</p>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        id="contact"
        className="py-36 border-t border-border relative overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] rounded-full blur-[140px]"
            style={{ background: "oklch(0.85 0.13 192 / 0.03)" }}
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 text-center">
          <RevealSection>
            <p className="section-number mb-6 justify-center flex">
              Ready to go
            </p>
            <h2
              className="font-display leading-tight mb-10"
              style={{ fontSize: "clamp(36px, 7vw, 100px)" }}
            >
              Your summit
              <br />
              <span className="glow-cyan">awaits.</span>
            </h2>
            <button
              type="button"
              data-ocid="cta.primary_button"
              onClick={() => openBooking()}
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.14em] uppercase px-8 py-4 bg-foreground text-background font-semibold hover:bg-foreground/90 transition-colors"
            >
              Plan My Expedition <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </RevealSection>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <img
                  src="/assets/generated/mountain-explorers-logo-transparent.dim_300x300.png"
                  alt="Mountain Explorers"
                  className="w-7 h-7 rounded-full object-cover"
                />
                <span className="font-sans text-[11px] font-semibold tracking-[0.14em] uppercase">
                  Mountain Explorers
                </span>
              </div>
              <p className="text-muted-foreground text-xs max-w-xs leading-relaxed">
                India's premier Himalayan trekking company. UIAA-certified
                guides. Uncompromising safety. Unforgettable summits.
              </p>
              <div className="mt-6 space-y-1 text-xs text-muted-foreground">
                <p>hello@mountainexplorers.in</p>
                <p>+91 98765 43210</p>
                <p>Manali, Himachal Pradesh</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
              <div>
                <p className="section-number mb-4">Treks</p>
                <ul className="space-y-2">
                  {["Friendship Peak", "Hampta Pass", "Kedarkantha"].map(
                    (t) => (
                      <li key={t}>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setPage("trek-detail")}
                        >
                          {t}
                        </button>
                      </li>
                    ),
                  )}
                </ul>
              </div>
              <div>
                <p className="section-number mb-4">Company</p>
                <ul className="space-y-2">
                  {["About", "Blog", "Careers", "Safety Policy"].map((l) => (
                    <li key={l}>
                      <span className="text-xs text-muted-foreground">{l}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="section-number mb-4">Legal</p>
                <ul className="space-y-2">
                  {["FAQ", "Cancellation", "Privacy"].map((l) => (
                    <li key={l}>
                      <span className="text-xs text-muted-foreground">{l}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-[11px] text-muted-foreground">
              &copy; {new Date().getFullYear()} Mountain Explorers. All rights
              reserved.
            </p>
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Built with &hearts; using caffeine.ai
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

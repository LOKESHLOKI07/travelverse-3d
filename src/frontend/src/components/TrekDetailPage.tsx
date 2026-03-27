import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CheckCircle,
  Mountain,
  Star,
  Users,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

type Page = "home" | "trek-detail";

interface TrekDetailPageProps {
  setPage: (page: Page) => void;
  openBooking: (dest?: string) => void;
}

const ITINERARY = [
  {
    day: 1,
    title: "Arrive in Manali",
    desc: "Acclimatization walk around Manali town, gear briefing, team dinner.",
  },
  {
    day: 2,
    title: "Drive to Solang Valley Basecamp",
    desc: "Scenic drive through Kullu Valley, set up camp at Solang base, evening briefing.",
  },
  {
    day: 3,
    title: "Trek to Lower Dhundi Camp",
    desc: "Gradual trek through pine forests to Dhundi camp at 2,800m. Distance: 8km.",
  },
  {
    day: 4,
    title: "Rest & Acclimatization",
    desc: "Rest day with snowcraft training \u2014 crampon use, ice axe arrest, and rope technique.",
  },
  {
    day: 5,
    title: "Trek to High Camp",
    desc: "Challenging ascent to high camp at 4,200m across open ridgelines. Distance: 6km.",
  },
  {
    day: 6,
    title: "Glacier Traversal Practice",
    desc: "Rest and advanced glacier techniques. Pre-summit preparation and route briefing.",
  },
  {
    day: 7,
    title: "Summit Push Attempt",
    desc: "Pre-dawn (2 AM) start, summit push on fixed ropes. Return to high camp by afternoon.",
  },
  {
    day: 8,
    title: "Summit & Return",
    desc: "Summit Friendship Peak (5,289m), descend to basecamp, drive back to Manali. Celebration dinner!",
  },
];

const INCLUSIONS = [
  "Accommodation (tents + guesthouses)",
  "All meals (breakfast, lunch, dinner)",
  "Expert UIAA-certified mountain guides",
  "All trekking permits & forest fees",
  "Technical safety equipment",
  "First aid & emergency evacuation",
  "Airport/station transfers",
  "Pre-trek training sessions",
];

const EXCLUSIONS = [
  "Personal trekking gear & clothing",
  "Travel insurance",
  "Tips for guides & porters",
  "Personal expenses",
];

const GALLERY_IMAGES = [
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&fit=crop",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&fit=crop",
  "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&fit=crop",
  "https://images.unsplash.com/photo-1619468129361-605ebea04b44?w=600&fit=crop",
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=600&fit=crop",
  "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=600&fit=crop",
];

const GALLERY_ALTS = [
  "Mountain snow peaks",
  "Valley trek panorama",
  "Winter trekking trail",
  "Himalayan landscape",
  "Mountain lake reflection",
  "Summit clouds view",
];

const PREP_TIPS = [
  "Start cardio training 8 weeks in advance",
  "Practice hiking 8\u201310km with a loaded backpack",
  "Prior trekking experience preferred (not mandatory)",
  "High-altitude medication consultation recommended",
  "Practice breathing exercises (pranayama/box breathing)",
];

const ROUTE_POINTS = [
  { x: 40, y: 280, day: "D1", label: "Manali", elev: "2,050m", summit: false },
  { x: 140, y: 240, day: "D2", label: "Solang", elev: "2,480m", summit: false },
  { x: 220, y: 200, day: "D3", label: "Dhundi", elev: "2,800m", summit: false },
  {
    x: 290,
    y: 150,
    day: "D5",
    label: "High Camp",
    elev: "4,200m",
    summit: false,
  },
  {
    x: 360,
    y: 100,
    day: "D7",
    label: "Summit Push",
    elev: "5,000m",
    summit: false,
  },
  {
    x: 440,
    y: 50,
    day: "D8",
    label: "Summit \u2605",
    elev: "5,289m",
    summit: true,
  },
];

export default function TrekDetailPage({
  setPage,
  openBooking,
}: TrekDetailPageProps) {
  const [bookingDate, setBookingDate] = useState("");
  const [guests, setGuests] = useState("2");
  const routeRef = useRef<SVGPathElement>(null);
  const [routeVisible, setRouteVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setRouteVisible(true);
      },
      { threshold: 0.3 },
    );
    if (routeRef.current) observer.observe(routeRef.current);
    return () => observer.disconnect();
  }, []);

  const navScrolled = scrollY > 60;
  const basePrice = 28500;
  const totalPrice = basePrice * Number.parseInt(guests);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground">
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
            data-ocid="nav.back_button"
            onClick={() => setPage("home")}
            className="flex items-center gap-2.5 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            <img
              src="/assets/generated/mountain-explorers-logo-transparent.dim_300x300.png"
              alt="Mountain Explorers"
              className="w-7 h-7 rounded-full object-cover"
            />
            <span className="font-sans text-[11px] font-semibold tracking-[0.14em] uppercase text-foreground">
              Mountain Explorers
            </span>
          </button>

          <button
            type="button"
            data-ocid="nav.book.button"
            onClick={() => openBooking("Friendship Peak")}
            className="text-[11px] tracking-[0.12em] uppercase px-4 py-1.5 border border-foreground/20 text-foreground/60 hover:border-foreground/50 hover:text-foreground transition-all duration-200"
          >
            Book \u2014 \u20B928,500
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative" style={{ height: "75vh" }}>
        <img
          src="/assets/generated/friendship-peak-hero.dim_1920x600.jpg"
          alt="Friendship Peak Himalayan Expedition"
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(10,10,10,0.3) 0%, rgba(10,10,10,0.7) 60%, #0a0a0a 100%)",
          }}
        />
        <div className="absolute inset-0 flex flex-col justify-end max-w-7xl mx-auto px-6 lg:px-10 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85 }}
          >
            <p className="section-number mb-4">
              Himalayan Expedition \u2014 Himachal Pradesh
            </p>
            <h1
              className="font-display font-bold leading-none tracking-tight"
              style={{ fontSize: "clamp(48px, 8vw, 120px)" }}
            >
              Friendship
            </h1>
            <h1
              className="font-display font-bold leading-none tracking-tight"
              style={{
                fontSize: "clamp(48px, 8vw, 120px)",
                color: "transparent",
                WebkitTextStroke: "1px rgba(245,245,240,0.4)",
              }}
            >
              Peak
            </h1>
          </motion.div>
        </div>
      </section>

      {/* QUICK STATS */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
            {[
              {
                label: "Altitude",
                value: "5,289m",
                icon: <Mountain className="w-3.5 h-3.5" />,
              },
              { label: "Duration", value: "8 Days", icon: null },
              { label: "Difficulty", value: "Moderate\u2013Hard", icon: null },
              {
                label: "Group Size",
                value: "Max 8",
                icon: <Users className="w-3.5 h-3.5" />,
              },
            ].map(({ label, value, icon }) => (
              <div key={label} className="py-5 px-4 first:pl-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  {icon}
                  {label}
                </p>
                <p className="font-semibold text-sm">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          {/* Content */}
          <div className="lg:col-span-2 space-y-20">
            {/* Route */}
            <section>
              <p className="section-number mb-6">Route Overview</p>
              <div className="border border-border p-6 overflow-x-auto">
                <svg
                  viewBox="0 0 500 320"
                  className="w-full min-w-[400px]"
                  role="img"
                  aria-label="Trek route elevation profile"
                >
                  {[50, 100, 150, 200, 250, 300].map((y) => (
                    <line
                      key={y}
                      x1="20"
                      y1={y}
                      x2="480"
                      y2={y}
                      stroke="oklch(0.2 0 0)"
                      strokeWidth="0.5"
                      strokeDasharray="4,6"
                    />
                  ))}
                  <path
                    ref={routeRef}
                    d={`M ${ROUTE_POINTS.map((p) => `${p.x},${p.y}`).join(" L ")}`}
                    fill="none"
                    stroke="oklch(0.85 0.13 192)"
                    strokeWidth="1.5"
                    strokeDasharray={routeVisible ? "none" : "1000"}
                    strokeDashoffset={routeVisible ? "0" : "1000"}
                    style={{ transition: "stroke-dashoffset 2s ease" }}
                  />
                  {ROUTE_POINTS.map((pt) => (
                    <g key={pt.label}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={pt.summit ? 6 : 4}
                        fill={pt.summit ? "oklch(0.85 0.13 192)" : "#0a0a0a"}
                        stroke={
                          pt.summit ? "oklch(0.85 0.13 192)" : "oklch(0.38 0 0)"
                        }
                        strokeWidth="1.5"
                      />
                      <text
                        x={pt.x}
                        y={pt.y - 10}
                        textAnchor="middle"
                        fill="oklch(0.6 0 0)"
                        fontSize="9"
                        fontFamily="sans-serif"
                      >
                        {pt.label}
                      </text>
                      <text
                        x={pt.x}
                        y={pt.y + 20}
                        textAnchor="middle"
                        fill="oklch(0.4 0 0)"
                        fontSize="8"
                        fontFamily="sans-serif"
                      >
                        {pt.elev}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </section>

            {/* Itinerary */}
            <section>
              <p className="section-number mb-8">8-Day Itinerary</p>
              <div
                className="space-y-0 border-t border-border"
                data-ocid="itinerary.list"
              >
                {ITINERARY.map((item, i) => (
                  <div
                    key={item.day}
                    data-ocid={`itinerary.item.${i + 1}`}
                    className="border-b border-border py-6 grid grid-cols-[3rem_1fr] gap-6 group hover:bg-[#111] transition-colors px-2"
                  >
                    <div
                      className="font-display text-3xl font-bold"
                      style={{ color: "oklch(0.2 0 0)" }}
                    >
                      {String(item.day).padStart(2, "0")}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm group-hover:text-cyan transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Inclusions */}
            <section>
              <p className="section-number mb-8">What's Included</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-4">
                    Included
                  </p>
                  <ul className="space-y-3" data-ocid="inclusions.list">
                    {INCLUSIONS.map((item, i) => (
                      <li
                        key={item}
                        data-ocid={`inclusions.item.${i + 1}`}
                        className="flex items-start gap-3 text-sm"
                      >
                        <CheckCircle className="w-4 h-4 text-cyan shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-4">
                    Not Included
                  </p>
                  <ul className="space-y-3" data-ocid="exclusions.list">
                    {EXCLUSIONS.map((item, i) => (
                      <li
                        key={item}
                        data-ocid={`exclusions.item.${i + 1}`}
                        className="flex items-start gap-3 text-sm"
                      >
                        <XCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* Prep tips */}
            <section>
              <p className="section-number mb-6">Preparation Tips</p>
              <ul className="space-y-3">
                {PREP_TIPS.map((tip, i) => (
                  <li
                    key={tip}
                    className="flex items-start gap-3 text-sm text-muted-foreground"
                  >
                    <span className="text-cyan font-mono text-xs mt-0.5 shrink-0">
                      0{i + 1}
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
            </section>

            {/* Gallery */}
            <section>
              <p className="section-number mb-6">Gallery</p>
              <div
                className="grid grid-cols-2 sm:grid-cols-3 gap-1.5"
                data-ocid="gallery.list"
              >
                {GALLERY_IMAGES.map((src, i) => (
                  <div
                    key={src}
                    data-ocid={`gallery.item.${i + 1}`}
                    className="aspect-square overflow-hidden"
                  >
                    <img
                      src={src}
                      alt={GALLERY_ALTS[i]}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Booking card */}
          <div className="lg:col-span-1">
            <div
              className="sticky top-20 border border-border p-8"
              data-ocid="booking.panel"
            >
              <p className="section-number mb-2">Reserve your spot</p>
              <div className="mb-6">
                <span className="font-display text-4xl font-bold">
                  \u20B928,500
                </span>
                <span className="text-muted-foreground text-xs ml-2 uppercase tracking-widest">
                  per person
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="booking-date"
                    className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-2"
                  >
                    Departure Date
                  </label>
                  <input
                    id="booking-date"
                    data-ocid="booking.input"
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-border bg-transparent text-foreground focus:outline-none focus:border-foreground/50 transition-colors"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>

                <div>
                  <label
                    htmlFor="booking-guests"
                    className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-2"
                  >
                    Number of Guests
                  </label>
                  <select
                    id="booking-guests"
                    data-ocid="booking.select"
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-border bg-[#0a0a0a] text-foreground focus:outline-none focus:border-foreground/50 transition-colors"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "Guest" : "Guests"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">
                      \u20B928,500 \u00D7 {guests} guests
                    </span>
                    <span>\u20B9{totalPrice.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      Equipment & permits
                    </span>
                    <span className="text-cyan">Included</span>
                  </div>
                </div>

                <Button
                  data-ocid="booking.submit_button"
                  className="w-full rounded-none mt-2"
                  style={{
                    background: "oklch(0.97 0.003 90)",
                    color: "#0a0a0a",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    height: "3rem",
                  }}
                  onClick={() => openBooking("Friendship Peak")}
                >
                  Book \u2014 \u20B9{totalPrice.toLocaleString("en-IN")}
                </Button>

                <div className="flex items-center justify-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className="w-3 h-3 fill-amber-400 text-amber-400"
                    />
                  ))}
                  <span className="text-[11px] text-muted-foreground ml-1">
                    4.9 (127 reviews)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-border mt-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setPage("home")}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-3 h-3" /> Back to all treks
          </button>
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Built with &hearts; using caffeine.ai
          </a>
        </div>
      </footer>
    </div>
  );
}

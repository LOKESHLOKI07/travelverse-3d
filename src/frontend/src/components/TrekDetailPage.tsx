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
    desc: "Rest day with snowcraft training — crampon use, ice axe arrest, and rope technique.",
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
  "Practice hiking 8-10km with a loaded backpack",
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
  { x: 440, y: 50, day: "D8", label: "Summit ★", elev: "5,289m", summit: true },
];

export default function TrekDetailPage({
  setPage,
  openBooking,
}: TrekDetailPageProps) {
  const [bookingDate, setBookingDate] = useState("");
  const [guests, setGuests] = useState("2");
  const routeRef = useRef<SVGPathElement>(null);
  const [routeVisible, setRouteVisible] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0 });
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

  return (
    <div className="min-h-screen">
      {/* BACK BUTTON */}
      <div className="fixed top-4 left-4 z-50">
        <Button
          data-ocid="nav.back_button"
          onClick={() => setPage("home")}
          variant="outline"
          className="rounded-full gap-2 text-sm"
          style={{
            background: "oklch(0.13 0.025 232 / 0.9)",
            backdropFilter: "blur(10px)",
            borderColor: "oklch(0.31 0.03 230 / 0.6)",
            color: "oklch(0.85 0.13 192)",
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Button>
      </div>

      {/* HERO */}
      <section className="relative" style={{ height: "70vh" }}>
        <img
          src="/assets/generated/friendship-peak-hero.dim_1920x600.jpg"
          alt="Friendship Peak Himalayan Expedition"
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, oklch(0.05 0.015 232 / 0.5) 0%, oklch(0.09 0.02 232 / 0.9) 100%)",
          }}
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-5 max-w-3xl"
          >
            <p className="text-cyan text-xs font-bold tracking-[0.3em] uppercase">
              HIMALAYAN EXPEDITION
            </p>
            <h1
              className="font-display font-extrabold text-foreground"
              style={{ fontSize: "clamp(40px, 6vw, 80px)" }}
            >
              Friendship Peak
            </h1>

            <div
              className="inline-flex flex-wrap items-center gap-4 px-6 py-3 rounded-2xl text-sm"
              style={{
                background: "oklch(0.13 0.025 232 / 0.8)",
                backdropFilter: "blur(16px)",
                border: "1px solid oklch(0.31 0.03 230 / 0.5)",
              }}
            >
              <span className="flex items-center gap-1.5 text-foreground">
                ⏱ <span className="font-semibold">8 Days</span>
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="flex items-center gap-1.5 text-foreground">
                <Mountain className="w-4 h-4 text-cyan" />
                <span className="font-semibold">5,289m</span>
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="flex items-center gap-1.5 text-orange">
                ⚡ <span className="font-semibold">Moderate-Hard</span>
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="flex items-center gap-1.5 text-foreground">
                <Users className="w-4 h-4 text-cyan" />
                <span className="font-semibold">Max 8 people</span>
              </span>
            </div>

            <Button
              data-ocid="trek.primary_button"
              onClick={() => openBooking("Friendship Peak")}
              className="pill-btn font-bold tracking-wider text-base px-10 py-3"
              style={{
                background: "oklch(0.85 0.13 192)",
                color: "oklch(0.13 0.04 195)",
                boxShadow: "0 0 30px oklch(0.85 0.13 192 / 0.4)",
              }}
            >
              Book Now — ₹28,500
            </Button>
          </motion.div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main content col */}
          <div className="lg:col-span-2 space-y-16">
            {/* TREK ROUTE VISUALIZATION */}
            <section>
              <h2 className="font-display font-extrabold text-2xl text-foreground mb-6">
                Trek Route
              </h2>
              <div
                className="glass-card rounded-2xl p-6 overflow-x-auto"
                style={{
                  boxShadow: "0 0 40px oklch(0.85 0.13 192 / 0.05)",
                }}
              >
                <svg
                  role="img"
                  aria-label="Friendship Peak trek route from Manali to summit"
                  viewBox="0 0 500 320"
                  className="w-full"
                  style={{ minWidth: "360px" }}
                >
                  <defs>
                    <linearGradient id="routeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="oklch(0.85 0.13 192)"
                        stopOpacity="0.12"
                      />
                      <stop
                        offset="100%"
                        stopColor="oklch(0.85 0.13 192)"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>

                  <path
                    d="M 40 280 Q 90 260 140 240 Q 180 225 220 200 Q 260 175 290 150 Q 320 125 360 100 Q 400 75 440 50"
                    fill="url(#routeGrad)"
                    stroke="none"
                  />
                  <path
                    ref={routeRef}
                    d="M 40 280 Q 90 260 140 240 Q 180 225 220 200 Q 260 175 290 150 Q 320 125 360 100 Q 400 75 440 50"
                    fill="none"
                    stroke="oklch(0.85 0.13 192)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className={routeVisible ? "animate-path" : ""}
                    style={{ strokeDasharray: 1000, strokeDashoffset: 1000 }}
                  />

                  {ROUTE_POINTS.map((pt) => (
                    <g key={pt.day}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="12"
                        fill={
                          pt.summit
                            ? "oklch(0.75 0.14 55 / 0.15)"
                            : "oklch(0.85 0.13 192 / 0.1)"
                        }
                      />
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="6"
                        fill={
                          pt.summit
                            ? "oklch(0.75 0.14 55)"
                            : "oklch(0.16 0.025 232)"
                        }
                        stroke={
                          pt.summit
                            ? "oklch(0.75 0.14 55)"
                            : "oklch(0.85 0.13 192)"
                        }
                        strokeWidth="1.5"
                      />
                      <text
                        x={pt.x + 14}
                        y={pt.y - 6}
                        fill="oklch(0.85 0.13 192)"
                        fontSize="9"
                        fontWeight="700"
                        fontFamily="Bricolage Grotesque, sans-serif"
                      >
                        {pt.day}
                      </text>
                      <text
                        x={pt.x + 14}
                        y={pt.y + 7}
                        fill="oklch(0.75 0.03 220)"
                        fontSize="8"
                        fontFamily="Plus Jakarta Sans, sans-serif"
                      >
                        {pt.label}
                      </text>
                      <text
                        x={pt.x + 14}
                        y={pt.y + 19}
                        fill={
                          pt.summit
                            ? "oklch(0.75 0.14 55)"
                            : "oklch(0.6 0.03 220)"
                        }
                        fontSize="8"
                        fontFamily="Plus Jakarta Sans, sans-serif"
                      >
                        {pt.elev}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </section>

            {/* ITINERARY */}
            <section>
              <h2 className="font-display font-extrabold text-2xl text-foreground mb-8">
                Itinerary
              </h2>
              <div className="space-y-4">
                {ITINERARY.map((item, i) => (
                  <motion.div
                    key={item.day}
                    data-ocid={`itinerary.item.${i + 1}`}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.06 }}
                    className="flex gap-4 glass-card rounded-xl p-4"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-display font-bold text-sm"
                      style={{
                        background:
                          item.day === 8
                            ? "oklch(0.75 0.14 55 / 0.15)"
                            : "oklch(0.85 0.13 192 / 0.1)",
                        border:
                          item.day === 8
                            ? "1px solid oklch(0.75 0.14 55 / 0.4)"
                            : "1px solid oklch(0.85 0.13 192 / 0.4)",
                        color:
                          item.day === 8
                            ? "oklch(0.75 0.14 55)"
                            : "oklch(0.85 0.13 192)",
                      }}
                    >
                      {item.day}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">
                        Day {item.day}: {item.title}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {item.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* EXPERIENCE HIGHLIGHTS */}
            <section>
              <h2 className="font-display font-extrabold text-2xl text-foreground mb-6">
                Experience Highlights
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    label: "Above the Clouds",
                    img: "/assets/generated/experience-above-clouds.dim_800x500.jpg",
                  },
                  {
                    label: "Snow Training",
                    img: "/assets/generated/experience-snow-training.dim_800x500.jpg",
                  },
                  {
                    label: "Summit Sunrise",
                    img: "/assets/generated/experience-summit-sunrise.dim_800x500.jpg",
                  },
                ].map((exp) => (
                  <div
                    key={exp.label}
                    className="rounded-xl overflow-hidden relative group"
                  >
                    <img
                      src={exp.img}
                      alt={exp.label}
                      className="w-full h-40 object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div
                      className="absolute bottom-0 left-0 right-0 p-3"
                      style={{
                        background:
                          "linear-gradient(to top, oklch(0.09 0.018 232 / 0.9), transparent)",
                      }}
                    >
                      <p className="text-xs font-semibold text-foreground">
                        {exp.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* INCLUSIONS / EXCLUSIONS */}
            <section>
              <h2 className="font-display font-extrabold text-2xl text-foreground mb-6">
                What&apos;s Included
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="glass-card rounded-xl p-5 space-y-3">
                  <h4 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-cyan" /> Included
                  </h4>
                  {INCLUSIONS.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2.5 text-sm"
                    >
                      <span className="text-cyan font-bold">✓</span>
                      <span className="text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="glass-card rounded-xl p-5 space-y-3">
                  <h4 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-orange" /> Not Included
                  </h4>
                  {EXCLUSIONS.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2.5 text-sm"
                    >
                      <span className="text-orange">✗</span>
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* DIFFICULTY */}
            <section>
              <h2 className="font-display font-extrabold text-2xl text-foreground mb-6">
                Difficulty &amp; Preparation
              </h2>
              <div className="glass-card rounded-2xl p-6 space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Easy</span>
                    <span className="text-sm font-bold text-orange">
                      Moderate-Hard (3.5/5)
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Expert
                    </span>
                  </div>
                  <div
                    className="h-3 rounded-full overflow-hidden"
                    style={{ background: "oklch(0.22 0.025 230)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: "70%",
                        background:
                          "linear-gradient(to right, oklch(0.85 0.13 192), oklch(0.75 0.14 55))",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-3">
                    Fitness Requirements
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Can hike 8-10km/day • No technical climbing experience
                    required • Prior trekking experience preferred
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-3">
                    Preparation Tips
                  </h4>
                  <ul className="space-y-2">
                    {PREP_TIPS.map((tip) => (
                      <li
                        key={tip}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="text-cyan mt-0.5">→</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* GALLERY */}
            <section>
              <h2 className="font-display font-extrabold text-2xl text-foreground mb-6">
                Gallery
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {GALLERY_IMAGES.map((img, i) => (
                  <motion.div
                    key={GALLERY_ALTS[i]}
                    data-ocid={`gallery.item.${i + 1}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="rounded-xl overflow-hidden group cursor-pointer"
                    style={{
                      aspectRatio: i === 0 || i === 5 ? "4/3" : "1/1",
                    }}
                  >
                    <img
                      src={img}
                      alt={GALLERY_ALTS[i]}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  </motion.div>
                ))}
              </div>
            </section>

            {/* MOBILE BOOKING */}
            <section className="lg:hidden">
              <div
                className="glass-card rounded-2xl p-6"
                style={{
                  boxShadow:
                    "0 0 40px oklch(0.85 0.13 192 / 0.1), 0 0 0 1px oklch(0.85 0.13 192 / 0.15)",
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-display font-extrabold text-3xl text-cyan">
                    ₹28,500
                  </span>
                  <span className="text-sm text-muted-foreground">/person</span>
                </div>
                <div className="flex items-center gap-1 mb-4">
                  {["1", "2", "3", "4", "5"].map((n) => (
                    <Star
                      key={`star-mobile-${n}`}
                      className="w-4 h-4"
                      style={{
                        fill: "oklch(0.82 0.17 85)",
                        color: "oklch(0.82 0.17 85)",
                      }}
                    />
                  ))}
                  <span className="text-sm text-muted-foreground ml-1">
                    4.9 (156 reviews)
                  </span>
                </div>
                <Button
                  data-ocid="trek.mobile_button"
                  onClick={() => openBooking("Friendship Peak")}
                  className="w-full pill-btn font-bold"
                  style={{
                    background: "oklch(0.85 0.13 192)",
                    color: "oklch(0.13 0.04 195)",
                  }}
                >
                  Book Now
                </Button>
              </div>
            </section>
          </div>

          {/* STICKY BOOKING CARD */}
          <div className="hidden lg:block">
            <div
              className="sticky top-24 glass-card rounded-2xl p-6 space-y-5"
              style={{
                boxShadow:
                  "0 0 60px oklch(0.85 0.13 192 / 0.12), 0 0 0 1px oklch(0.85 0.13 192 / 0.2)",
              }}
            >
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display font-extrabold text-3xl text-cyan">
                    ₹28,500
                  </span>
                  <span className="text-sm text-muted-foreground">/person</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {["1", "2", "3", "4", "5"].map((n) => (
                    <Star
                      key={`star-sidebar-${n}`}
                      className="w-3.5 h-3.5"
                      style={{
                        fill: "oklch(0.82 0.17 85)",
                        color: "oklch(0.82 0.17 85)",
                      }}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">
                    4.9 (156 reviews)
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="trek-date"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1"
                  >
                    Trek Date
                  </label>
                  <input
                    id="trek-date"
                    data-ocid="booking.input"
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm text-foreground"
                    style={{
                      background: "oklch(0.14 0.025 232)",
                      border: "1px solid oklch(0.31 0.03 230)",
                      colorScheme: "dark",
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="trek-guests"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1"
                  >
                    Guests
                  </label>
                  <select
                    id="trek-guests"
                    data-ocid="booking.select"
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm text-foreground"
                    style={{
                      background: "oklch(0.14 0.025 232)",
                      border: "1px solid oklch(0.31 0.03 230)",
                    }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "person" : "people"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                className="pt-2 pb-2"
                style={{
                  borderTop: "1px solid oklch(0.31 0.03 230 / 0.4)",
                  borderBottom: "1px solid oklch(0.31 0.03 230 / 0.4)",
                }}
              >
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    ₹28,500 × {guests} person{Number(guests) > 1 ? "s" : ""}
                  </span>
                  <span className="text-foreground font-semibold">
                    ₹{(28500 * Number(guests)).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <Button
                data-ocid="booking.submit_button"
                onClick={() => openBooking("Friendship Peak")}
                className="w-full pill-btn font-bold tracking-wider"
                style={{
                  background: "oklch(0.85 0.13 192)",
                  color: "oklch(0.13 0.04 195)",
                  boxShadow: "0 0 30px oklch(0.85 0.13 192 / 0.35)",
                }}
              >
                Book Now
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Free cancellation up to 14 days before departure
              </p>

              <div
                className="flex items-center gap-2 p-3 rounded-xl text-xs text-muted-foreground"
                style={{ background: "oklch(0.16 0.025 232)" }}
              >
                <span className="text-cyan">ℹ️</span>
                Next available date: April 15, 2026 • Limited to 8 trekkers
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer
        className="py-8 mt-16"
        style={{ borderTop: "1px solid oklch(0.31 0.03 230 / 0.4)" }}
      >
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/assets/generated/mountain-explorers-logo-transparent.dim_300x300.png"
              alt="Mountain Explorers"
              className="w-8 h-8 rounded-full object-cover"
            />
            <span className="font-display font-bold text-sm text-foreground">
              MOUNTAIN <span className="text-cyan">EXPLORERS</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Mountain Explorers India. Built with ❤️
            using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              className="text-cyan hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

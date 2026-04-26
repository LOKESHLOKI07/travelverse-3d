import { Button } from "@/components/ui/button";
import { LOGO_URL } from "@/branding";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Youtube,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Page } from "../types";

interface Props {
  setPage: (page: Page) => void;
}

const TEAM_MEMBERS = [
  {
    id: "team-2",
    name: "Tauffik",
    role: "Digital Media Head",
    image: "/assets/Team/Tauffik.jpg",
  },
  {
    id: "team-1",
    name: "Ninad Pandit",
    role: "Proprietor",
    image: "/assets/Team/ninad.jpg",
  },
  {
    id: "team-3",
    name: "Kamal Negi",
    role: "MD & Head guide",
    image: "/assets/Team/Kamal%20negi.jpg",
  },
  {
    id: "team-4",
    name: "Radhika Khaire",
    role: "Tour consultant",
    image: "/assets/Team/Radhika%20khaire.jpg",
  },
  {
    id: "team-5",
    name: "Vishal Thakur",
    role: "Instructor",
    image: "/assets/Team/vishal%20thakur.jpg",
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

export default function TeamPage({ setPage }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(4);
  const maxStart = Math.max(0, TEAM_MEMBERS.length - visibleCount);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1280) setVisibleCount(4);
      else if (window.innerWidth >= 1024) setVisibleCount(3);
      else if (window.innerWidth >= 640) setVisibleCount(2);
      else setVisibleCount(1);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setCurrentIndex((idx) => Math.min(idx, Math.max(0, TEAM_MEMBERS.length - visibleCount)));
  }, [visibleCount]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentIndex((idx) => (idx >= maxStart ? 0 : idx + 1));
    }, 3500);
    return () => window.clearInterval(timer);
  }, [maxStart]);

  const slideBy = (direction: "left" | "right") => {
    setCurrentIndex((idx) => {
      if (direction === "left") return idx <= 0 ? maxStart : idx - 1;
      return idx >= maxStart ? 0 : idx + 1;
    });
  };

  const cardWidthClass =
    visibleCount === 4
      ? "basis-1/4"
      : visibleCount === 3
        ? "basis-1/3"
        : visibleCount === 2
          ? "basis-1/2"
          : "basis-full";

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
            Our <span style={{ color: "oklch(var(--brand-blue))" }}>Team</span>
          </span>
        </div>
      </header>

      <section
        className="relative py-16 px-6 text-white overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(0deg, oklch(0.30 0.08 254 / 0.70), oklch(0.30 0.08 254 / 0.70)), url(https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1600&fit=crop)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-7xl mx-auto flex items-end justify-between gap-5">
          <h1 className="font-display text-5xl font-black">Our Team</h1>
          <div className="bg-white text-slate-700 px-5 py-3 rounded-md text-sm font-semibold">
            Home / <span className="text-sky-600">Our Team</span>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          <div className="overflow-hidden rounded-md">
            <img
              src="https://images.unsplash.com/photo-1464219789935-c2d9d9aba644?w=1200&fit=crop"
              alt="Mountain cable cars"
              className="w-full h-full min-h-[320px] object-cover"
            />
          </div>
          <div className="py-2">
            <p className="text-cyan font-semibold text-2xl">We work for</p>
            <h2 className="font-display text-6xl font-black leading-tight text-foreground">
              Insuring your
              <br />
              future
            </h2>
            <p className="mt-5 text-muted-foreground text-lg leading-relaxed max-w-xl">
              Welcome to our Mountain Explorers! We are a passionate and dynamic
              team of adventurers who are dedicated to exploring the great
              outdoors and embarking on thrilling expeditions.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-6 max-w-lg">
              <div className="pr-6 border-r border-border">
                <p className="font-display text-6xl font-black text-foreground">6,805</p>
                <p className="text-sm tracking-widest text-muted-foreground mt-1">
                  PROJECT COMPLETED
                </p>
              </div>
              <div>
                <p className="font-display text-6xl font-black text-foreground">9,760</p>
                <p className="text-sm tracking-widest text-muted-foreground mt-1">
                  HAPPY CUSTOMERS
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-10">
        <p className="text-center text-cyan text-2xl font-semibold">Professional people</p>
        <h3 className="font-display text-center text-6xl font-black text-foreground mt-2 mb-8">
          Meet the Team
        </h3>
        <div className="relative group">
          <button
            type="button"
            onClick={() => slideBy("left")}
            className="absolute left-2 top-[36%] z-10 w-11 h-11 rounded-full bg-white/95 border border-white shadow-lg flex items-center justify-center text-slate-700 hover:bg-white transition-all opacity-90 md:opacity-0 md:group-hover:opacity-100"
            aria-label="Previous team members"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="overflow-hidden pb-2">
            <div
              className="flex gap-6 transition-transform duration-700 ease-out will-change-transform"
              style={{
                transform: `translateX(calc(-${currentIndex * (100 / visibleCount)}% - ${currentIndex * 1.5}rem))`,
              }}
            >
              {TEAM_MEMBERS.map((member) => (
                <article key={member.id} className={`${cardWidthClass} shrink-0 min-w-0`}>
                  <div className="rounded-2xl overflow-hidden border border-white/60 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.1)]">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-[320px] object-cover"
                    />
                  </div>
                  <div className="py-4 text-center">
                    <p className="font-display text-3xl font-bold text-foreground">
                      {member.name}
                    </p>
                    <p className="text-sm tracking-[0.2em] uppercase text-cyan mt-1">
                      {member.role}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => slideBy("right")}
            className="absolute right-2 top-[36%] z-10 w-11 h-11 rounded-full bg-white/95 border border-white shadow-lg flex items-center justify-center text-slate-700 hover:bg-white transition-all opacity-90 md:opacity-0 md:group-hover:opacity-100"
            aria-label="Next team members"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: maxStart + 1 }).map((_, idx) => (
            <button
              key={`dot-${idx}`}
              type="button"
              aria-label={`Go to slide ${idx + 1}`}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2.5 rounded-full transition-all ${
                idx === currentIndex
                  ? "w-7 bg-cyan"
                  : "w-2.5 bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
      </section>

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

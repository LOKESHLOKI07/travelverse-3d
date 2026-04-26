import { Button } from "@/components/ui/button";
import { LOGO_URL } from "@/branding";
import {
  ArrowLeft,
  Building2,
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

type JobPost = {
  id: string;
  title: string;
  type: "FULL TIME" | "PART TIME";
  company: string;
  location: string;
  image: string;
};

const JOB_POSTS: JobPost[] = [
  {
    id: "job-1",
    title: "Caretaker for farmhouse",
    type: "FULL TIME",
    company: "Mountain Explorers",
    location: "Karjat, Alibug",
    image:
      "https://images.unsplash.com/photo-1618732827915-8e0de7df0f0f?w=300&fit=crop",
  },
  {
    id: "job-2",
    title: "Cook for travel tours",
    type: "PART TIME",
    company: "Mountain Explorers",
    location: "Himachal Pradesh, Uttarakhand",
    image:
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=300&fit=crop",
  },
  {
    id: "job-3",
    title: "Trip Coordinator",
    type: "FULL TIME",
    company: "Mountain Explorers",
    location: "Manali, Himachal Pradesh",
    image:
      "https://images.unsplash.com/photo-1529078155058-5d716f45d604?w=300&fit=crop",
  },
];

const SIDE_POSTS = [
  {
    id: "blog-1",
    title: "A Memorable Journey to Yunum Peak: My Trekking Experience",
    image:
      "https://images.unsplash.com/photo-1464822759844-d150baec0494?w=220&fit=crop",
  },
  {
    id: "blog-2",
    title: "Exploring Manali: Top Attractions in the Heart of the Himalayas",
    image:
      "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=220&fit=crop",
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

export default function CareersPage({ setPage }: Props) {
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
            Careers <span style={{ color: "oklch(var(--brand-blue))" }}>&amp; jobs</span>
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <section className="space-y-5">
            {JOB_POSTS.map((job) => (
              <article key={job.id} className="border border-border bg-white">
                <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[170px_1fr]">
                  <div className="border-r border-border p-4 flex items-center justify-center">
                    <img
                      src={job.image}
                      alt=""
                      className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-sm"
                    />
                  </div>
                  <div className="p-5">
                    <div className="inline-flex items-center px-3 h-7 text-[11px] font-semibold tracking-wider text-white bg-sky-600 mb-4">
                      {job.type}
                    </div>
                    <h2 className="font-display text-3xl font-bold leading-tight text-foreground">
                      {job.title}
                    </h2>
                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="w-4 h-4" />
                        {job.company}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        {job.location}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <aside className="space-y-5">
            <div className="border border-border rounded-md p-4 bg-white">
              <h3 className="font-display font-bold text-foreground mb-3">
                Latest Stories
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
                        <MessageSquare className="w-3 h-3" />
                        0 comments
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
                src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=680&fit=crop"
                alt=""
                className="w-full h-60 object-cover"
              />
            </div>
          </aside>
        </div>
      </main>

      <footer
        className="pt-16 pb-8 mt-12"
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

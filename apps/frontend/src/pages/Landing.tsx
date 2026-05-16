import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BarChart3, Layers, LayoutGrid, Users, Database, PauseCircle, Menu, ArrowRight, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import dashboardPreview from "@/assets/dashboard-preview.png";
import dashboardPreviewDark from "@/assets/dashboard-preview-dark.png";
import footballTexture from "@/assets/football-texture.jpg";
import footballSvg from "@/assets/football.svg";
import BuiltForEveryLevel from "@/components/landing/BuiltForEveryLevel";
import Testimonials from "@/components/landing/Testimonials";
import InteractivePitchBackground from "@/components/landing/InteractivePitchBackground";
import { useThemeAsset } from "@/lib/useThemeAsset";
import ThemeToggle from "@/components/ThemeToggle";

const features = [
  {
    icon: PauseCircle,
    title: "AI-Powered Match Analysis",
    description:
      "Automatically analyzes match and training footage using computer vision to generate real-time performance insights.",
  },
  {
    icon: Layers,
    title: "Performance & Player Metrics",
    description:
      "Tracks key stats like positioning, speed, passing accuracy, and heatmaps to evaluate individual and team output.",
  },
  {
    icon: BarChart3,
    title: "Tactical & Formation Insights",
    description:
      "Breaks down formations, pressing patterns, defensive lines, and attacking movements for smarter coaching decisions.",
  },
  {
    icon: LayoutGrid,
    title: "Video Breakdown & Smart Tagging",
    description:
      "Automatically detects and tags key events (goals, assists, tackles) for fast and efficient match breakdown.",
  },
  {
    icon: Users,
    title: "Player & Coach Management",
    description:
      "Registers players and coaching staff, stores profiles, tracks development history, and manages team data in one place.",
  },
  {
    icon: Database,
    title: "Centralized Analytics Dashboard",
    description:
      "Provides a unified dashboard for reports, visualizations, scouting insights, and performance summaries.",
  },
];

/* Floating football that follows cursor subtly */
const FloatingBall = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <img
    src={footballSvg}
    alt=""
    aria-hidden="true"
    className={`pointer-events-none select-none ${className ?? ""}`}
    style={style}
    draggable={false}
  />
);

const Landing = () => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLElement>(null);
  const dashboardSrc = useThemeAsset(dashboardPreview, dashboardPreviewDark);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      setMousePos({
        x: ((e.clientX - rect.left) / rect.width - 0.5) * 2,
        y: ((e.clientY - rect.top) / rect.height - 0.5) * 2,
      });
    };
    const scrollHandler = () => setScrollY(window.scrollY);
    window.addEventListener("mousemove", handler);
    window.addEventListener("scroll", scrollHandler, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handler);
      window.removeEventListener("scroll", scrollHandler);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 md:px-16 lg:px-24">
        <h1 className="text-2xl font-black italic tracking-tight">
          <span className="text-primary">TOUCH</span>
          <span className="text-foreground">LINE</span>
        </h1>

        <div className="hidden items-center gap-10 md:flex">
          <span className="cursor-default text-sm font-semibold text-foreground">Home</span>
          <a href="/blog" className="cursor-pointer text-sm font-medium text-muted-foreground/70 hover:text-foreground transition-colors">Blog</a>
          <a href="/contact" className="cursor-pointer text-sm font-medium text-muted-foreground/70 hover:text-foreground transition-colors">Contact</a>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <Button
            variant="default"
            className="rounded-lg px-6 font-bold italic"
            onClick={() => navigate("/auth")}
          >
            Get Started
          </Button>
        </div>

        {/* Mobile hamburger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button className="inline-flex items-center justify-center rounded-md p-2 text-foreground md:hidden">
              <Menu size={24} />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="flex w-[280px] flex-col gap-6 pt-12">
            <h1 className="text-2xl font-black italic tracking-tight">
              <span className="text-primary">TOUCH</span>
              <span className="text-foreground">LINE</span>
            </h1>
            <div className="flex flex-col gap-4">
              <span className="cursor-default text-sm font-semibold text-foreground">Home</span>
              <a href="/blog" className="cursor-pointer text-sm font-medium text-muted-foreground">Blog</a>
              <a href="/contact" className="cursor-pointer text-sm font-medium text-muted-foreground">Contact</a>
            </div>
            <Button
              variant="default"
              className="w-full rounded-lg font-bold italic"
              onClick={() => { setMobileOpen(false); navigate("/auth"); }}
            >
              Get Started
            </Button>
          </SheetContent>
        </Sheet>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden">
        {/* Background texture overlay */}
        <div className="absolute inset-0 z-0">
         <img
            src={footballTexture}
            alt=""
            className="h-full w-full object-cover opacity-[0.08]"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
        </div>

        {/* Interactive pitch lines + football particles – cursor-reactive */}
        <InteractivePitchBackground />

        {/* Floating footballs – parallax with mouse */}
        <FloatingBall
          className="absolute z-[2] w-10 h-10 opacity-[0.08] hidden md:block"
          style={{
            top: "15%",
            left: "8%",
            transform: `translate(${mousePos.x * -12}px, ${mousePos.y * -8}px) rotate(${mousePos.x * 15}deg)`,
            transition: "transform 0.3s ease-out",
          }}
        />
        <FloatingBall
          className="absolute z-[2] w-7 h-7 opacity-[0.06] hidden md:block"
          style={{
            top: "65%",
            right: "10%",
            transform: `translate(${mousePos.x * 8}px, ${mousePos.y * 10}px) rotate(${mousePos.x * -20}deg)`,
            transition: "transform 0.3s ease-out",
          }}
        />
        <FloatingBall
          className="absolute z-[2] w-14 h-14 opacity-[0.05] hidden lg:block"
          style={{
            top: "40%",
            right: "5%",
            transform: `translate(${mousePos.x * 15}px, ${mousePos.y * -12}px) rotate(${mousePos.x * 10}deg)`,
            transition: "transform 0.3s ease-out",
          }}
        />
        <FloatingBall
          className="absolute z-[2] w-6 h-6 opacity-[0.07] hidden lg:block"
          style={{
            bottom: "20%",
            left: "15%",
            transform: `translate(${mousePos.x * -10}px, ${mousePos.y * 6}px) rotate(${mousePos.y * 12}deg)`,
            transition: "transform 0.3s ease-out",
          }}
        />

        <div className="relative z-10 mx-auto max-w-5xl px-6 pt-20 pb-16 md:pt-28 md:pb-20">
          <div className="flex flex-col items-center text-center">
            {/* Pill badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-semibold tracking-wide text-primary uppercase">Now in Early Access</span>
            </div>

            <h2 className="font-black italic text-4xl leading-[1.1] tracking-tight text-foreground md:text-6xl lg:text-7xl">
              The{" "}
              <span className="text-primary">digital</span>
              <br className="hidden sm:block" />
              {" "}touchline for
              <br />
              modern football
            </h2>

            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground/80 md:text-lg">
              Manage teams, analyse matches, and develop players — all from one
              AI-powered platform built for coaches, clubs, and organisations.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
              <Button
                variant="default"
                size="lg"
                className="rounded-lg px-8 font-bold italic gap-2"
                onClick={() => navigate("/early-access")}
              >
                Get Early Access
                <ArrowRight size={18} />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-lg px-8 font-semibold text-muted-foreground/70 border-border/60 hover:text-foreground"
              >
                See Features
              </Button>
            </div>
          </div>

          {/* Dashboard preview with depth */}
          <div
            className="relative mt-16 flex items-center justify-center"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 100;
              const y = ((e.clientY - rect.top) / rect.height) * 100;
              e.currentTarget.style.setProperty("--glow-x", `${x}%`);
              e.currentTarget.style.setProperty("--glow-y", `${y}%`);
            }}
            style={{ "--glow-x": "50%", "--glow-y": "50%" } as React.CSSProperties}
          >
            <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-primary/5 blur-2xl" />
            {/* Cursor-following green glow */}
            <div
              className="absolute -inset-12 rounded-3xl pointer-events-none z-0"
              style={{
                background: `radial-gradient(500px circle at var(--glow-x) var(--glow-y), hsl(var(--primary) / 0.25), hsl(var(--primary) / 0.08) 40%, transparent 70%)`,
                filter: "blur(40px)",
                transition: "background 0.15s ease-out",
              }}
            />
            {/* Decorative goal frame behind image */}
            <div className="absolute -inset-3 rounded-2xl border border-primary/[0.06] hidden md:block" />
            <div className="absolute -inset-6 rounded-3xl border border-primary/[0.03] hidden lg:block" />
            <div className="relative overflow-hidden rounded-xl border border-border shadow-2xl shadow-primary/10">
              <img
                src={dashboardSrc}
                alt="Touchline dashboard showing team performance analytics, player stats, and match insights"
                className="w-full object-cover"
                loading="lazy"
              />
              {/* Bottom accent bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-border/60 bg-card/40">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-8 px-6 py-8 md:justify-between md:gap-0">
          {[
            { value: "50+", label: "Clubs Onboarded" },
            { value: "1,200+", label: "Players Tracked" },
            { value: "98%", label: "Uptime" },
            { value: "AI", label: "Powered Insights" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1 px-6">
              <span className="text-2xl font-black italic text-primary md:text-3xl">{stat.value}</span>
              <span className="text-[10px] font-medium tracking-widest text-muted-foreground/60 uppercase">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* All-in-one Platform */}
      <section className="relative mx-auto max-w-5xl px-6 py-24 text-center">
        {/* Subtle decorative ball */}
        <FloatingBall
          className="absolute z-0 w-20 h-20 opacity-[0.03] -top-4 right-8 hidden md:block"
        />
        <span className="text-xs font-bold italic tracking-widest text-primary/80 uppercase">All-in-one Platform</span>
        <h2 className="mt-3 font-black italic text-3xl tracking-tight text-foreground md:text-4xl">
          Everything your club needs,
          <br className="hidden sm:block" />
          <span className="text-primary"> in one place</span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-base text-muted-foreground/70">
          From match analysis to player management — Touchline brings every tool under one roof.
        </p>

        {/* Feature Cards */}
        <div className="relative z-10 mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="group relative flex flex-col items-start rounded-xl border border-border/60 bg-card/80 p-6 text-left transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:bg-card"
            >
              {/* Accent corner */}
              <div className="absolute top-0 right-0 h-8 w-8 overflow-hidden rounded-bl-xl rounded-tr-xl">
                <div className="h-full w-full bg-primary/10 group-hover:bg-primary/20 transition-colors" />
              </div>

              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon size={22} className="text-primary" />
              </div>
              <h3 className="text-sm font-bold italic text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground/70">
                {feature.description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Learn more <ChevronRight size={14} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Built for Every Level */}
      <BuiltForEveryLevel />

      {/* Testimonials */}
      <Testimonials />

      {/* CTA Section */}
      <section className="relative overflow-hidden border-y border-border/60">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        {/* Decorative pitch center circle */}
        <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] opacity-[0.03] pointer-events-none" viewBox="0 0 500 500" fill="none">
          <circle cx="250" cy="250" r="200" stroke="hsl(var(--primary))" strokeWidth="2" />
          <circle cx="250" cy="250" r="6" fill="hsl(var(--primary))" />
          <line x1="0" y1="250" x2="500" y2="250" stroke="hsl(var(--primary))" strokeWidth="1.5" />
        </svg>
        <FloatingBall
          className="absolute z-0 w-12 h-12 opacity-[0.06] top-6 left-10 hidden md:block"
        />
        <div className="relative mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="font-black italic text-3xl tracking-tight text-foreground md:text-4xl">
            Ready to step onto the
            <span className="text-primary"> digital touchline</span>?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground/70">
            Join clubs already using Touchline to gain a competitive edge through data-driven football management.
          </p>
          <Button
            variant="default"
            size="lg"
            className="mt-8 rounded-lg px-10 font-bold italic gap-2"
            onClick={() => navigate("/early-access")}
          >
            Join Early Access
            <ArrowRight size={18} />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/40 px-8 py-12 md:px-16 lg:px-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="flex flex-col gap-4">
              <h1 className="text-2xl font-black italic tracking-tight">
                <span className="text-primary">TOUCH</span>
                <span className="text-foreground">LINE</span>
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground/60">
                AI-powered football analytics platform for teams, coaches, and fans.
              </p>
              <div className="flex items-center gap-3">
                {(["twitter", "instagram", "youtube"] as const).map((platform) => (
                  <span
                    key={platform}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/60 text-primary/70 transition-colors hover:bg-primary hover:text-primary-foreground cursor-pointer"
                  >
                    {platform === "twitter" && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
                    )}
                    {platform === "instagram" && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                    )}
                    {platform === "youtube" && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Product */}
            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-bold italic text-foreground">Product</h4>
              <span className="text-sm text-muted-foreground/60 cursor-default hover:text-foreground transition-colors">Features</span>
              <span className="text-sm text-muted-foreground/60 cursor-default hover:text-foreground transition-colors">Pricing</span>
              <span className="text-sm text-muted-foreground/60 cursor-default hover:text-foreground transition-colors">Integrations</span>
              <span className="text-sm text-muted-foreground/60 cursor-default hover:text-foreground transition-colors">Changelog</span>
            </div>

            {/* Company */}
            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-bold italic text-foreground">Company</h4>
              <span className="text-sm text-muted-foreground/60 cursor-default hover:text-foreground transition-colors">About</span>
              <span className="text-sm text-muted-foreground/60 cursor-default hover:text-foreground transition-colors">Blog</span>
              <span className="text-sm text-muted-foreground/60 cursor-default hover:text-foreground transition-colors">Careers</span>
              <span className="text-sm text-muted-foreground/60 cursor-default hover:text-foreground transition-colors">Contact</span>
            </div>

            {/* Legal */}
            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-bold italic text-foreground">Legal</h4>
              <span className="text-sm text-muted-foreground/60 cursor-default hover:text-foreground transition-colors">Privacy Policy</span>
              <span className="text-sm text-muted-foreground/60 cursor-default hover:text-foreground transition-colors">Terms of Service</span>
              <span className="text-sm text-muted-foreground/60 cursor-default hover:text-foreground transition-colors">Cookie Policy</span>
            </div>
          </div>

          <div className="mt-10 border-t border-border/40 pt-6 text-center">
            <p className="text-xs text-muted-foreground/50">
              © {new Date().getFullYear()} Touchline. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Play, BarChart3, Layers, LayoutGrid, Users, Database, PauseCircle, Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import dashboardPreview from "@/assets/dashboard-preview.png";
import platformPreview from "@/assets/platform-preview.png";

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
    title: "Player & Coach Management System",
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

const Landing = () => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 md:px-16 lg:px-24">
        <h1 className="text-2xl font-black italic tracking-tight">
          <span className="text-primary">TOUCH</span>
          <span className="text-foreground">LINE</span>
        </h1>

        <div className="hidden items-center gap-10 md:flex">
          <span className="cursor-default text-sm font-medium text-foreground">Home</span>
          <span className="cursor-default text-sm font-medium text-muted-foreground">Blog</span>
          <span className="cursor-default text-sm font-medium text-muted-foreground">Contact</span>
        </div>

        <Button
          variant="default"
          className="hidden rounded-lg px-6 md:inline-flex"
          onClick={() => navigate("/auth")}
        >
          Get Started
        </Button>

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
              <span className="cursor-default text-sm font-medium text-foreground">Home</span>
              <span className="cursor-default text-sm font-medium text-muted-foreground">Blog</span>
              <span className="cursor-default text-sm font-medium text-muted-foreground">Contact</span>
            </div>
            <Button
              variant="default"
              className="w-full rounded-lg"
              onClick={() => { setMobileOpen(false); navigate("/auth"); }}
            >
              Get Started
            </Button>
          </SheetContent>
        </Sheet>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-12 text-center md:pt-24 md:pb-16">
        <h2 className="text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
          AI-powered football
          <br />
          analysis platform
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
          Touchline is an AI-powered football analytics platform that helps teams, coaches, players, and fans understand
          the game through advanced machine learning, computer vision, and real-time data insights.
        </p>

        <div className="mt-10 flex items-center justify-center gap-4">
          <Button
            variant="default"
            size="lg"
            className="rounded-lg px-8"
            onClick={() => navigate("/early-access")}
          >
            Early Access
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="rounded-lg px-8"
          >
            See Features
          </Button>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="overflow-hidden rounded-xl border border-border shadow-lg">
          <img
            src={dashboardPreview}
            alt="Touchline dashboard showing team performance analytics, player stats, and match insights"
            className="w-full object-cover"
            loading="lazy"
          />
        </div>
      </section>

      {/* All-in-one Platform */}
      <section className="mx-auto max-w-5xl px-6 pb-24 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          All-in-one Platform
        </h2>
        <p className="mt-3 text-base text-muted-foreground">
          Deliver an exceptional experience
        </p>

        {/* Feature Cards */}
        <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
                <feature.icon size={24} className="text-primary" />
              </div>
              <h3 className="text-sm font-bold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-8 py-12 md:px-16 lg:px-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="flex flex-col gap-4">
              <h1 className="text-2xl font-black italic tracking-tight">
                <span className="text-primary">TOUCH</span>
                <span className="text-foreground">LINE</span>
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                AI-powered football analytics platform for teams, coaches, and fans.
              </p>
              <div className="flex items-center gap-3">
                {(["twitter", "instagram", "youtube"] as const).map((platform) => (
                  <span
                    key={platform}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-primary transition-colors hover:bg-primary hover:text-primary-foreground cursor-pointer"
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
              <h4 className="text-sm font-bold text-foreground">Product</h4>
              <span className="text-sm text-muted-foreground cursor-default">Features</span>
              <span className="text-sm text-muted-foreground cursor-default">Pricing</span>
              <span className="text-sm text-muted-foreground cursor-default">Integrations</span>
              <span className="text-sm text-muted-foreground cursor-default">Changelog</span>
            </div>

            {/* Company */}
            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-bold text-foreground">Company</h4>
              <span className="text-sm text-muted-foreground cursor-default">About</span>
              <span className="text-sm text-muted-foreground cursor-default">Blog</span>
              <span className="text-sm text-muted-foreground cursor-default">Careers</span>
              <span className="text-sm text-muted-foreground cursor-default">Contact</span>
            </div>

            {/* Legal */}
            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-bold text-foreground">Legal</h4>
              <span className="text-sm text-muted-foreground cursor-default">Privacy Policy</span>
              <span className="text-sm text-muted-foreground cursor-default">Terms of Service</span>
              <span className="text-sm text-muted-foreground cursor-default">Cookie Policy</span>
            </div>
          </div>

          <div className="mt-10 border-t border-border pt-6 text-center">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Touchline. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

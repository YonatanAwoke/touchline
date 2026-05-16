import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Phone, Instagram, Twitter, MapPin, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import footballSvg from "@/assets/football.svg";
import ThemeToggle from "@/components/ThemeToggle";

const PageNav: React.FC = () => {
  const navigate = useNavigate();
  return (
    <nav className="flex items-center justify-between px-8 py-5 md:px-16 lg:px-24">
      <h1 className="cursor-pointer text-2xl font-black italic tracking-tight" onClick={() => navigate("/")}>
        <span className="text-primary">TOUCH</span>
        <span className="text-foreground">LINE</span>
      </h1>
      <div className="hidden items-center gap-10 md:flex">
        <Link to="/" className="text-sm font-medium text-muted-foreground/70 hover:text-foreground transition-colors">Home</Link>
        <Link to="/blog" className="text-sm font-medium text-muted-foreground/70 hover:text-foreground transition-colors">Blog</Link>
        <Link to="/contact" className="text-sm font-semibold text-foreground">Contact</Link>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Button className="hidden rounded-lg px-6 font-bold italic md:inline-flex" onClick={() => navigate("/auth")}>
          Get Started
        </Button>
      </div>
    </nav>
  );
};

const ContactCard: React.FC = () => {
  const items = [
    { icon: Mail, label: "Email us", value: "hello@touchline.app" },
    { icon: Phone, label: "Call us", value: "+1 (555) 012-3456" },
    { icon: MapPin, label: "Visit", value: "Amsterdam, NL" },
  ];
  const socials = [
    { icon: Instagram, handle: "@touchline" },
    { icon: Twitter, handle: "@touchline" },
  ];
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-xl">
      {/* Decorative gradient blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15">
            <img src={footballSvg} alt="" aria-hidden className="h-6 w-6" />
          </span>
          <div>
            <h2 className="font-black italic text-2xl text-foreground leading-none">Get in touch</h2>
            <p className="mt-1 text-xs font-medium uppercase tracking-widest text-primary">Let's talk football</p>
          </div>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
          Have a question about Touchline, partnerships, or onboarding your club? Reach out — we usually reply within a day.
        </p>

        <ul className="mt-7 space-y-2">
          {items.map((it) => (
            <li
              key={it.label}
              className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-background/60 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-background"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <it.icon size={16} />
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{it.label}</span>
                <span className="text-sm font-semibold text-foreground">{it.value}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-7 flex items-center justify-between border-t border-border/60 pt-5">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Follow</span>
          <div className="flex items-center gap-2">
            {socials.map((s) => (
              <a
                key={s.handle + s.icon.name}
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
                aria-label={s.handle}
              >
                <s.icon size={15} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Contact: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      toast({ title: "Missing details", description: "Please fill in every field.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast({ title: "Message sent", description: "We'll get back to you within 24 hours." });
      setName("");
      setEmail("");
      setMessage("");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-secondary/40">
      <PageNav />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-6 md:px-10">

        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div>
            <h1 className="font-black italic text-5xl leading-none text-foreground md:text-7xl">Contact</h1>
            <form onSubmit={onSubmit} className="mt-12 space-y-7 max-w-md">
              <div>
                <label htmlFor="name" className="text-sm font-medium text-muted-foreground">Full name</label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 h-11 rounded-none border-0 border-b border-foreground/40 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary"
                />
              </div>
              <div>
                <label htmlFor="email" className="text-sm font-medium text-muted-foreground">Email address</label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 h-11 rounded-none border-0 border-b border-foreground/40 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary"
                />
              </div>
              <div>
                <label htmlFor="message" className="text-sm font-medium text-muted-foreground">Message</label>
                <Textarea
                  id="message"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-2 min-h-[44px] rounded-none border-0 border-b border-foreground/40 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary resize-none"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="mt-4 rounded-full bg-foreground px-10 py-6 font-bold italic text-background hover:bg-foreground/90"
              >
                {submitting ? "Sending..." : "Submit"}
              </Button>
            </form>
          </div>

          <ContactCard />
        </div>
      </main>
    </div>
  );
};

export default Contact;

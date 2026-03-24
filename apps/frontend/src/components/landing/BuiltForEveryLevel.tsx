import { Users, Building2, Globe } from "lucide-react";
import { CheckCircle2 } from "lucide-react";

const tiers = [
  {
    icon: Users,
    title: "Coaches",
    description:
      "Make better decisions faster with AI insights tailored for match preparation, in-game adjustments, and player development.",
    features: [
      "Pre-match AI briefings",
      "Session planning tools",
      "Player development tracking",
      "Live substitution suggestions",
    ],
  },
  {
    icon: Building2,
    title: "Clubs",
    description:
      "Centralise operations with unified data, reserves and first team staff collaboration, and recruitment tools.",
    features: [
      "Multi-team management",
      "Recruitment pipeline",
      "Medical & fitness integration",
      "Financial tracking",
    ],
  },
  {
    icon: Globe,
    title: "Organizations",
    description:
      "Federations, leagues, and academies can manage multiple clubs, standardise processes, and aggregate performance data at scale.",
    features: [
      "Federation-level dashboards",
      "League-wide analytics",
      "Custom compliance rules",
      "API & data export",
    ],
  },
];

const BuiltForEveryLevel = () => {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <span className="text-xs font-bold italic tracking-widest text-primary/80 uppercase">
        Use It For
      </span>
      <h2 className="mt-3 font-black italic text-3xl tracking-tight text-foreground md:text-4xl">
        Built for Every Level of the
        <br className="hidden sm:block" />
        <span className="text-primary"> Game</span>
      </h2>
      <p className="mt-4 max-w-lg text-base text-muted-foreground/70">
        Whether you're managing a local academy or a professional club, Touchline scales to your needs.
      </p>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.title}
            className="group relative flex flex-col rounded-xl border border-border/60 bg-card/80 p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:bg-card"
          >
            {/* Icon */}
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <tier.icon size={22} className="text-primary" />
            </div>

            <h3 className="text-lg font-bold italic text-foreground">{tier.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground/70">
              {tier.description}
            </p>

            {/* Feature list */}
            <ul className="mt-5 flex flex-col gap-2.5">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-primary/80">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};

export default BuiltForEveryLevel;

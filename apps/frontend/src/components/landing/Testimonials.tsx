import { Star } from "lucide-react";

const testimonials = [
  {
    quote:
      "Touchline completely changed how we prepare for matches. The AI scouting reports on opponents give us an edge that no spreadsheet ever could. It's like having an extra analyst on the bench.",
    name: "Marcus Henriksson",
    role: "Head Coach · IF Elfsborg",
    initials: "MH",
  },
  {
    quote:
      "We manage 14 youth teams with Touchline. The player development tracking across age groups is unmatched. Parents, coaches, and directors all have the visibility they need.",
    name: "Sarah Kim",
    role: "Technical Director · Bay Area Soccer Academy",
    initials: "SK",
  },
  {
    quote:
      "The injury prediction model alone has saved us thousands. We reduced muscle injuries by 34% in our first season using Touchline's load monitoring and AI alerts.",
    name: "James Okonkwo",
    role: "Performance Director · Lagos United",
    initials: "JO",
  },
];

const Testimonials = () => {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <span className="text-xs font-bold italic tracking-widest text-primary/80 uppercase">
        Testimonials
      </span>
      <h2 className="mt-3 font-black italic text-3xl tracking-tight text-foreground md:text-4xl">
        Trusted by Coaches Worldwide
      </h2>
      <p className="mt-4 max-w-lg text-base text-muted-foreground/70">
        Hear from the people using Touchline every day on the training ground and in the dugout.
      </p>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((t) => (
          <div
            key={t.name}
            className="group relative flex flex-col rounded-xl border border-border/60 bg-card/80 p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:bg-card"
          >
            {/* Stars */}
            <div className="mb-4 flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={14} className="fill-primary text-primary" />
              ))}
            </div>

            <p className="flex-1 text-sm leading-relaxed text-muted-foreground/80 italic">
              "{t.quote}"
            </p>

            {/* Author */}
            <div className="mt-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {t.initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground/60">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Testimonials;

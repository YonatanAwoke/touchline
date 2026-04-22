import React from "react";
import footballSvg from "@/assets/football.svg";

interface Movement { metric: string; value: number }
interface Summary { topSpeed?: number; avgSpeed?: number; maxJump?: number; avgJump?: number; distance?: number; sprints?: number }

interface Props {
  playerName: string;
  position: string;
  team?: string;
  movement: Movement[];
  summary: Summary;
}

/**
 * Derive 6 FIFA-style metrics (PAC, SHO, PAS, DRI, DEF, PHY) from
 * movement + summary data. Falls back to dummy baseline so the card
 * always looks complete even with sparse data.
 */
function deriveMetrics(movement: Movement[], summary: Summary, position: string) {
  const m = (k: string, fallback: number) =>
    Math.round(movement.find(x => x.metric.toLowerCase() === k.toLowerCase())?.value ?? fallback);

  const acc = m("Acceleration", 70);
  const agi = m("Agility", 72);
  const end = m("Endurance", 68);
  const bal = m("Balance", 70);
  const rea = m("Reaction", 74);
  const coo = m("Coordination", 71);

  // Speed-influenced metrics
  const topSpeed = summary.topSpeed ?? 7;
  const speedScore = Math.min(99, Math.round((topSpeed / 10) * 100));

  const PAC = Math.round((acc * 0.55 + speedScore * 0.45));
  const SHO = Math.round((coo * 0.5 + rea * 0.3 + (summary.maxJump ?? 50) * 0.2));
  const PAS = Math.round((coo * 0.45 + rea * 0.25 + bal * 0.3));
  const DRI = Math.round((agi * 0.5 + bal * 0.3 + coo * 0.2));
  const DEF = Math.round((bal * 0.4 + rea * 0.35 + end * 0.25));
  const PHY = Math.round((end * 0.5 + ((summary.maxJump ?? 50) / 80) * 100 * 0.3 + bal * 0.2));

  const clamp = (v: number) => Math.max(40, Math.min(99, v));
  const stats = {
    PAC: clamp(PAC),
    SHO: clamp(SHO),
    PAS: clamp(PAS),
    DRI: clamp(DRI),
    DEF: clamp(DEF),
    PHY: clamp(PHY),
  };

  // Position-weighted overall
  const pos = position?.toLowerCase() || "";
  let overall: number;
  if (pos.includes("goal")) overall = Math.round((stats.DEF + stats.PHY + stats.PAC + stats.PAS) / 4);
  else if (pos.includes("def")) overall = Math.round((stats.DEF * 1.4 + stats.PHY + stats.PAC + stats.PAS) / 4.4);
  else if (pos.includes("mid")) overall = Math.round((stats.PAS * 1.3 + stats.DRI + stats.PAC + stats.PHY) / 4.3);
  else if (pos.includes("for") || pos.includes("strik") || pos.includes("wing")) overall = Math.round((stats.SHO * 1.3 + stats.PAC + stats.DRI + stats.PHY) / 4.3);
  else overall = Math.round((stats.PAC + stats.SHO + stats.PAS + stats.DRI + stats.DEF + stats.PHY) / 6);

  return { stats, overall: clamp(overall) };
}

const positionAbbrev = (pos: string) => {
  const p = pos?.toLowerCase() || "";
  if (p.includes("goal")) return "GK";
  if (p.includes("def")) return "DEF";
  if (p.includes("mid")) return "MID";
  if (p.includes("for") || p.includes("strik")) return "ST";
  if (p.includes("wing")) return "WG";
  return pos?.slice(0, 3).toUpperCase() || "—";
};

const PlayerRatingCard = React.forwardRef<HTMLDivElement, Props>(({ playerName, position, team, movement, summary }, ref) => {
  const { stats, overall } = deriveMetrics(movement, summary, position);
  const initials = playerName.split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div ref={ref} className="relative mx-auto" style={{ width: 320, aspectRatio: "0.72" }}>
      {/* Outer frame with embossed gradient */}
      <div
        className="absolute inset-0 rounded-[28px]"
        style={{
          background:
            "linear-gradient(155deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.6) 35%, hsl(var(--background)) 60%, hsl(var(--primary) / 0.55) 100%)",
          padding: 3,
          boxShadow:
            "0 25px 50px -12px hsl(var(--primary) / 0.45), inset 0 0 0 1px hsl(var(--primary) / 0.4)",
        }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-[26px] bg-card">
          {/* Soft radial green glow */}
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(ellipse at top, hsl(var(--primary) / 0.35), transparent 55%), linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)",
            }}
          />
          {/* Subtle pitch texture pattern */}
          <svg className="absolute inset-0 h-full w-full opacity-[0.07]" viewBox="0 0 200 280" preserveAspectRatio="none">
            <defs>
              <pattern id="lines" width="14" height="14" patternUnits="userSpaceOnUse">
                <path d="M 14 0 L 0 0 0 14" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="200" height="280" fill="url(#lines)" />
          </svg>

          {/* Content */}
          <div className="relative flex h-full flex-col p-5">
            {/* Header: Overall + Position + Logo */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col items-start">
                <span className="font-black italic leading-none text-primary" style={{ fontSize: 44 }}>
                  {overall}
                </span>
                <span className="mt-1 rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold tracking-widest text-primary">
                  {positionAbbrev(position)}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <img src={footballSvg} alt="" className="h-7 w-7 opacity-80" />
                <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Touchline
                </span>
              </div>
            </div>

            {/* Player avatar circle */}
            <div className="mt-3 flex justify-center">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-black italic text-primary-foreground"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, hsl(var(--primary)), hsl(var(--primary) / 0.6))",
                  boxShadow: "0 10px 25px -5px hsl(var(--primary) / 0.5)",
                }}
              >
                {initials}
              </div>
            </div>

            {/* Name + team */}
            <div className="mt-3 text-center">
              <h3 className="font-black italic uppercase tracking-wide text-foreground" style={{ fontSize: 18, lineHeight: 1.1 }}>
                {playerName}
              </h3>
              {team && (
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {team}
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="my-3 h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            {/* Metrics grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 px-4">
              {[
                ["PAC", stats.PAC],
                ["DRI", stats.DRI],
                ["SHO", stats.SHO],
                ["DEF", stats.DEF],
                ["PAS", stats.PAS],
                ["PHY", stats.PHY],
              ].map(([label, value]) => (
                <div key={label as string} className="flex items-baseline justify-between">
                  <span className="font-black italic text-foreground" style={{ fontSize: 16 }}>
                    {value}
                  </span>
                  <span className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer mark */}
            <div className="mt-auto flex items-center justify-between pt-3 text-[8px] uppercase tracking-[0.25em] text-muted-foreground/70">
              <span>Performance Card</span>
              <span>{new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
PlayerRatingCard.displayName = "PlayerRatingCard";

export default PlayerRatingCard;
export { deriveMetrics };

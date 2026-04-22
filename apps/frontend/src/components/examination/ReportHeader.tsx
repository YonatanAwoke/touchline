import React from "react";
import footballSvg from "@/assets/football.svg";

interface Props {
  title: string;
  subtitle?: string;
  date: string;
  badge?: string;
}

/**
 * Header used inside the printable report area (PDF/PNG export).
 * Mirrors Touchline brand: bold italic title + green accent + footer date.
 */
const ReportHeader: React.FC<Props> = ({ title, subtitle, date, badge }) => (
  <div className="mb-6 flex items-center justify-between border-b border-primary/30 pb-4">
    <div className="flex items-center gap-3">
      <img src={footballSvg} alt="Touchline" className="h-10 w-10" />
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
          Touchline · Report
        </div>
        <h1 className="mt-0.5 font-black italic text-2xl text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
    <div className="text-right">
      {badge && (
        <span className="inline-block rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
          {badge}
        </span>
      )}
      <p className="mt-1 text-xs text-muted-foreground">{date}</p>
    </div>
  </div>
);

export default ReportHeader;

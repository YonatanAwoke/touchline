import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const performanceData = [
  { week: "W1", goals: 4, conceded: 2 },
  { week: "W2", goals: 6, conceded: 3 },
  { week: "W3", goals: 5, conceded: 1 },
  { week: "W4", goals: 8, conceded: 2 },
  { week: "W5", goals: 7, conceded: 4 },
  { week: "W6", goals: 10, conceded: 3 },
  { week: "W7", goals: 9, conceded: 2 },
  { week: "W8", goals: 12, conceded: 5 },
];

const possessionData = [
  { name: "Possession", value: 58, color: "hsl(var(--primary))" },
  { name: "Opponent", value: 42, color: "hsl(var(--muted-foreground) / 0.4)" },
];

const trainingLoadData = [
  { day: "Mon", load: 60 },
  { day: "Tue", load: 80 },
  { day: "Wed", load: 45 },
  { day: "Thu", load: 90 },
  { day: "Fri", load: 70 },
  { day: "Sat", load: 100 },
  { day: "Sun", load: 30 },
];

const topScorers = [
  { name: "L. Vargas", role: "Forward", goals: 14, trend: "+3" },
  { name: "M. Okonkwo", role: "Midfielder", goals: 9, trend: "+2" },
  { name: "J. Ibrahim", role: "Forward", goals: 7, trend: "+1" },
  { name: "K. Sato", role: "Winger", goals: 6, trend: "+1" },
];

const tooltipStyle = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(var(--popover-foreground))",
};

const DashboardMetrics: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Top row: line chart spans 2, donut + visitors */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-primary" />
                <h3 className="text-base font-semibold text-foreground">Season Performance</h3>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-primary" /> Goals
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-destructive/80" /> Conceded
                </span>
              </div>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="goalsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="goals" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#goalsFill)" />
                  <Area type="monotone" dataKey="conceded" stroke="hsl(var(--destructive))" strokeWidth={2} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5">
            <h3 className="text-base font-semibold text-foreground">Avg. Possession</h3>
            <p className="mt-1 text-xs text-muted-foreground">Across last 10 matches</p>
            <div className="relative mx-auto mt-2 h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={possessionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {possessionData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black italic text-foreground">58%</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Ball control</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second row: bar chart + scorers list */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Weekly Training Load</h3>
              <span className="text-xs text-muted-foreground">Average across squad</span>
            </div>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trainingLoadData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted) / 0.5)" }} />
                  <Bar dataKey="load" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Top Scorers</h3>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">This season</span>
            </div>
            <ul className="space-y-3">
              {topScorers.map((p) => (
                <li key={p.name} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {p.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{p.goals}</p>
                    <p className="text-[10px] font-semibold text-primary">{p.trend}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardMetrics;

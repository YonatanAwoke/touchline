import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Flame, CornerDownRight, ShieldAlert, Target, Zap, ArrowUp, Activity, User, Timer, TrendingUp, Plus, Upload, Edit3, Trash2, Eye, ArrowLeft, Users,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from "recharts";
import { toast } from "sonner";

/* ───────── TYPES ───────── */

interface MatchAnalysis {
  id: string;
  title: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  videoFile?: string;
  notes: string;
  inputMode: "manual" | "video";
  matchStats: typeof defaultMatchStats;
  matchEvents: typeof defaultMatchEvents;
}

interface TrainingAnalysis {
  id: string;
  title: string;
  date: string;
  playerId: string;
  videoFile?: string;
  notes: string;
  inputMode: "manual" | "video";
  playerData: typeof defaultPlayerData;
}

/* ───────── DEFAULT / TEST DATA ───────── */

const defaultMatchEvents = [
  { minute: 5, type: "foul", team: "home", player: "James Carter" },
  { minute: 12, type: "corner", team: "away", player: "Luis Mendes" },
  { minute: 18, type: "freeKick", team: "home", player: "Omar Hassan" },
  { minute: 23, type: "foul", team: "away", player: "Kenji Tanaka" },
  { minute: 27, type: "corner", team: "home", player: "James Carter" },
  { minute: 34, type: "foul", team: "home", player: "Daniel Smith" },
  { minute: 38, type: "freeKick", team: "away", player: "Luis Mendes" },
  { minute: 42, type: "corner", team: "away", player: "Kenji Tanaka" },
  { minute: 48, type: "foul", team: "away", player: "Marco Rossi" },
  { minute: 55, type: "freeKick", team: "home", player: "Omar Hassan" },
  { minute: 61, type: "corner", team: "home", player: "James Carter" },
  { minute: 67, type: "foul", team: "home", player: "Daniel Smith" },
  { minute: 72, type: "freeKick", team: "away", player: "Luis Mendes" },
  { minute: 78, type: "corner", team: "away", player: "Marco Rossi" },
  { minute: 83, type: "foul", team: "away", player: "Kenji Tanaka" },
  { minute: 88, type: "freeKick", team: "home", player: "Omar Hassan" },
  { minute: 90, type: "corner", team: "home", player: "James Carter" },
];

const defaultMatchStats = {
  home: { possession: 35, goalAttempts: 2, shotsOnGoal: 0, shotsOffGoal: 1, blockedShots: 1, freeKicks: 19, cornerKicks: 0, offsides: 3, throwIns: 11, goalkeeperSaves: 6, fouls: 11, totalPasses: 384, completedPasses: 318, attacks: 49, dangerousAttacks: 20 },
  away: { possession: 65, goalAttempts: 12, shotsOnGoal: 7, shotsOffGoal: 1, blockedShots: 4, freeKicks: 12, cornerKicks: 9, offsides: 4, throwIns: 20, goalkeeperSaves: 0, fouls: 12, totalPasses: 680, completedPasses: 606, attacks: 142, dangerousAttacks: 45 },
};

const defaultPlayerData = {
  speed: [
    { time: "0:00", value: 0 }, { time: "0:30", value: 5.2 }, { time: "1:00", value: 7.1 },
    { time: "1:30", value: 8.4 }, { time: "2:00", value: 6.8 }, { time: "2:30", value: 9.1 },
    { time: "3:00", value: 7.5 }, { time: "3:30", value: 4.2 }, { time: "4:00", value: 6.9 },
    { time: "4:30", value: 8.8 }, { time: "5:00", value: 7.0 },
  ],
  jumpHeight: [
    { time: "Jump 1", value: 52 }, { time: "Jump 2", value: 55 }, { time: "Jump 3", value: 48 },
    { time: "Jump 4", value: 58 }, { time: "Jump 5", value: 54 }, { time: "Jump 6", value: 60 },
  ],
  movement: [
    { metric: "Agility", value: 85, fullMark: 100 }, { metric: "Acceleration", value: 90, fullMark: 100 },
    { metric: "Endurance", value: 72, fullMark: 100 }, { metric: "Balance", value: 78, fullMark: 100 },
    { metric: "Reaction", value: 88, fullMark: 100 }, { metric: "Coordination", value: 82, fullMark: 100 },
  ],
  summary: { topSpeed: 9.1, avgSpeed: 6.5, maxJump: 60, avgJump: 54.5, distance: 1240, sprints: 14 },
};

const generateHeatMapData = () => {
  const data: { x: number; y: number; intensity: number }[] = [];
  for (let r = 0; r < 14; r++) {
    for (let c = 0; c < 20; c++) {
      const dist = Math.sqrt((c - 14) ** 2 + (r - 7) ** 2);
      data.push({ x: c, y: r, intensity: Math.min(1, Math.max(0, 1 - dist / 10) + Math.random() * 0.15) });
    }
  }
  return data;
};

const heatMapData = generateHeatMapData();

const players = [
  { id: "p1", name: "James Carter", position: "Forward" },
  { id: "p2", name: "Omar Hassan", position: "Midfielder" },
  { id: "p3", name: "Daniel Smith", position: "Defender" },
  { id: "p4", name: "Luis Mendes", position: "Goalkeeper" },
  { id: "p5", name: "Kenji Tanaka", position: "Midfielder" },
];

const allPlayerData: Record<string, typeof defaultPlayerData> = {
  p1: defaultPlayerData,
  p2: {
    speed: [
      { time: "0:00", value: 0 }, { time: "0:30", value: 4.8 }, { time: "1:00", value: 6.5 },
      { time: "1:30", value: 7.2 }, { time: "2:00", value: 5.9 }, { time: "2:30", value: 8.0 },
      { time: "3:00", value: 6.8 }, { time: "3:30", value: 5.1 }, { time: "4:00", value: 7.4 },
      { time: "4:30", value: 6.2 }, { time: "5:00", value: 5.8 },
    ],
    jumpHeight: [
      { time: "Jump 1", value: 45 }, { time: "Jump 2", value: 48 }, { time: "Jump 3", value: 42 },
      { time: "Jump 4", value: 50 }, { time: "Jump 5", value: 47 }, { time: "Jump 6", value: 44 },
    ],
    movement: [
      { metric: "Agility", value: 78, fullMark: 100 }, { metric: "Acceleration", value: 75, fullMark: 100 },
      { metric: "Endurance", value: 88, fullMark: 100 }, { metric: "Balance", value: 82, fullMark: 100 },
      { metric: "Reaction", value: 70, fullMark: 100 }, { metric: "Coordination", value: 85, fullMark: 100 },
    ],
    summary: { topSpeed: 8.0, avgSpeed: 5.9, maxJump: 50, avgJump: 46, distance: 1580, sprints: 10 },
  },
  p3: {
    speed: [
      { time: "0:00", value: 0 }, { time: "0:30", value: 3.9 }, { time: "1:00", value: 5.4 },
      { time: "1:30", value: 6.1 }, { time: "2:00", value: 5.0 }, { time: "2:30", value: 6.8 },
      { time: "3:00", value: 5.5 }, { time: "3:30", value: 4.0 }, { time: "4:00", value: 5.9 },
      { time: "4:30", value: 6.3 }, { time: "5:00", value: 5.2 },
    ],
    jumpHeight: [
      { time: "Jump 1", value: 55 }, { time: "Jump 2", value: 58 }, { time: "Jump 3", value: 52 },
      { time: "Jump 4", value: 61 }, { time: "Jump 5", value: 57 }, { time: "Jump 6", value: 63 },
    ],
    movement: [
      { metric: "Agility", value: 65, fullMark: 100 }, { metric: "Acceleration", value: 60, fullMark: 100 },
      { metric: "Endurance", value: 90, fullMark: 100 }, { metric: "Balance", value: 88, fullMark: 100 },
      { metric: "Reaction", value: 72, fullMark: 100 }, { metric: "Coordination", value: 70, fullMark: 100 },
    ],
    summary: { topSpeed: 6.8, avgSpeed: 5.1, maxJump: 63, avgJump: 57.7, distance: 980, sprints: 6 },
  },
  p4: {
    speed: [
      { time: "0:00", value: 0 }, { time: "0:30", value: 3.2 }, { time: "1:00", value: 4.5 },
      { time: "1:30", value: 5.0 }, { time: "2:00", value: 3.8 }, { time: "2:30", value: 5.5 },
      { time: "3:00", value: 4.2 }, { time: "3:30", value: 3.0 }, { time: "4:00", value: 4.8 },
      { time: "4:30", value: 5.1 }, { time: "5:00", value: 4.0 },
    ],
    jumpHeight: [
      { time: "Jump 1", value: 62 }, { time: "Jump 2", value: 65 }, { time: "Jump 3", value: 58 },
      { time: "Jump 4", value: 68 }, { time: "Jump 5", value: 64 }, { time: "Jump 6", value: 70 },
    ],
    movement: [
      { metric: "Agility", value: 72, fullMark: 100 }, { metric: "Acceleration", value: 55, fullMark: 100 },
      { metric: "Endurance", value: 80, fullMark: 100 }, { metric: "Balance", value: 92, fullMark: 100 },
      { metric: "Reaction", value: 95, fullMark: 100 }, { metric: "Coordination", value: 88, fullMark: 100 },
    ],
    summary: { topSpeed: 5.5, avgSpeed: 3.9, maxJump: 70, avgJump: 64.5, distance: 620, sprints: 4 },
  },
  p5: {
    speed: [
      { time: "0:00", value: 0 }, { time: "0:30", value: 5.0 }, { time: "1:00", value: 6.8 },
      { time: "1:30", value: 7.8 }, { time: "2:00", value: 6.2 }, { time: "2:30", value: 8.5 },
      { time: "3:00", value: 7.0 }, { time: "3:30", value: 4.8 }, { time: "4:00", value: 7.2 },
      { time: "4:30", value: 8.0 }, { time: "5:00", value: 6.5 },
    ],
    jumpHeight: [
      { time: "Jump 1", value: 48 }, { time: "Jump 2", value: 51 }, { time: "Jump 3", value: 46 },
      { time: "Jump 4", value: 53 }, { time: "Jump 5", value: 50 }, { time: "Jump 6", value: 49 },
    ],
    movement: [
      { metric: "Agility", value: 82, fullMark: 100 }, { metric: "Acceleration", value: 80, fullMark: 100 },
      { metric: "Endurance", value: 85, fullMark: 100 }, { metric: "Balance", value: 75, fullMark: 100 },
      { metric: "Reaction", value: 78, fullMark: 100 }, { metric: "Coordination", value: 90, fullMark: 100 },
    ],
    summary: { topSpeed: 8.5, avgSpeed: 6.2, maxJump: 53, avgJump: 49.5, distance: 1380, sprints: 12 },
  },
};

const statLabels: { key: keyof typeof defaultMatchStats.home; label: string }[] = [
  { key: "possession", label: "Ball Possession" }, { key: "goalAttempts", label: "Goal Attempts" },
  { key: "shotsOnGoal", label: "Shots on Goal" }, { key: "shotsOffGoal", label: "Shots off Goal" },
  { key: "blockedShots", label: "Blocked Shots" }, { key: "freeKicks", label: "Free Kicks" },
  { key: "cornerKicks", label: "Corner Kicks" }, { key: "offsides", label: "Offsides" },
  { key: "throwIns", label: "Throw-in" }, { key: "goalkeeperSaves", label: "Goalkeeper Saves" },
  { key: "fouls", label: "Fouls" }, { key: "totalPasses", label: "Total Passes" },
  { key: "completedPasses", label: "Completed Passes" }, { key: "attacks", label: "Attacks" },
  { key: "dangerousAttacks", label: "Dangerous Attacks" },
];

/* ───────── INITIAL SAMPLE ANALYSES ───────── */

const initialMatchAnalyses: MatchAnalysis[] = [
  {
    id: "ma1", title: "League Match — Round 12", date: "2025-03-15", homeTeam: "FC United", awayTeam: "City Rovers",
    notes: "Dominant second half by away team.", inputMode: "manual", matchStats: defaultMatchStats, matchEvents: defaultMatchEvents,
  },
];

const initialTrainingAnalyses: TrainingAnalysis[] = [
  {
    id: "ta1", title: "Pre-season Sprint Test", date: "2025-02-20", playerId: "p1",
    notes: "Excellent acceleration. Needs endurance work.", inputMode: "manual", playerData: allPlayerData.p1,
  },
];

/* ───────── SMALL COMPONENTS ───────── */

const intensityToColor = (v: number) => {
  if (v < 0.15) return "hsl(240, 80%, 20%)";
  if (v < 0.3) return "hsl(270, 70%, 35%)";
  if (v < 0.5) return "hsl(300, 60%, 45%)";
  if (v < 0.7) return "hsl(30, 80%, 55%)";
  if (v < 0.85) return "hsl(40, 95%, 60%)";
  return "hsl(55, 100%, 65%)";
};

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: string; unit: string }> = ({ icon, label, value, unit }) => (
  <Card className="border-border bg-card">
    <CardContent className="flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-primary">{value}<span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span></p>
      </div>
    </CardContent>
  </Card>
);

const StatBar: React.FC<{ label: string; homeVal: number; awayVal: number; isPercent?: boolean }> = ({ label, homeVal, awayVal, isPercent }) => {
  const max = Math.max(homeVal, awayVal, 1);
  return (
    <div className="grid grid-cols-[60px_1fr_auto_1fr_60px] items-center gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-sm font-medium text-foreground text-right">{homeVal}{isPercent ? "%" : ""}</span>
      <div className="flex justify-end"><div className="h-3 rounded-l-sm bg-muted-foreground/70 transition-all" style={{ width: `${(homeVal / max) * 100}%` }} /></div>
      <span className="text-xs text-muted-foreground text-center whitespace-nowrap min-w-[120px]">{label}</span>
      <div className="flex justify-start"><div className="h-3 rounded-r-sm bg-destructive/80 transition-all" style={{ width: `${(awayVal / max) * 100}%` }} /></div>
      <span className="text-sm font-medium text-foreground">{awayVal}{isPercent ? "%" : ""}</span>
    </div>
  );
};

/* ───────── HEAT MAP ───────── */

const HeatMap: React.FC = () => (
  <Card className="border-border bg-card">
    <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Flame className="h-5 w-5 text-primary" /> Player Heat Map</CardTitle></CardHeader>
    <CardContent>
      <div className="relative w-full" style={{ paddingBottom: "66%" }}>
        <svg viewBox="0 0 100 66" className="absolute inset-0 h-full w-full rounded-lg overflow-hidden" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="100" height="66" fill="hsl(240, 80%, 15%)" />
          {heatMapData.map((cell, i) => (
            <rect key={i} x={cell.x * 5} y={cell.y * (100 / 14)} width={5.2} height={(100 / 14) + 0.2} fill={intensityToColor(cell.intensity)} opacity={0.85} />
          ))}
          <rect x="2" y="2" width="96" height="62" fill="none" stroke="white" strokeWidth="0.4" />
          <line x1="50" y1="2" x2="50" y2="64" stroke="white" strokeWidth="0.4" />
          <circle cx="50" cy="33" r="8" fill="none" stroke="white" strokeWidth="0.4" />
          <circle cx="50" cy="33" r="0.5" fill="white" />
          <rect x="2" y="17" width="14" height="32" fill="none" stroke="white" strokeWidth="0.4" />
          <rect x="2" y="24" width="5" height="18" fill="none" stroke="white" strokeWidth="0.4" />
          <circle cx="12" cy="33" r="0.5" fill="white" />
          <rect x="84" y="17" width="14" height="32" fill="none" stroke="white" strokeWidth="0.4" />
          <rect x="93" y="24" width="5" height="18" fill="none" stroke="white" strokeWidth="0.4" />
          <circle cx="88" cy="33" r="0.5" fill="white" />
        </svg>
        <div className="absolute right-2 top-2 flex flex-col items-center gap-0.5">
          <span className="text-[10px] text-white/80">High</span>
          <div className="h-20 w-3 rounded-sm" style={{ background: "linear-gradient(to bottom, hsl(55,100%,65%), hsl(40,95%,60%), hsl(30,80%,55%), hsl(300,60%,45%), hsl(270,70%,35%), hsl(240,80%,20%))" }} />
          <span className="text-[10px] text-white/80">Low</span>
        </div>
      </div>
    </CardContent>
  </Card>
);

/* ───────── MATCH DETAIL VIEW ───────── */

const MatchDetailView: React.FC<{ analysis: MatchAnalysis; onBack: () => void }> = ({ analysis, onBack }) => {
  const { matchStats: ms, matchEvents: evts } = analysis;
  const corners = { home: evts.filter(e => e.type === "corner" && e.team === "home").length, away: evts.filter(e => e.type === "corner" && e.team === "away").length };
  const fouls = { home: evts.filter(e => e.type === "foul" && e.team === "home").length, away: evts.filter(e => e.type === "foul" && e.team === "away").length };
  const freeKicks = { home: evts.filter(e => e.type === "freeKick" && e.team === "home").length, away: evts.filter(e => e.type === "freeKick" && e.team === "away").length };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h2 className="text-xl font-bold text-foreground">{analysis.title}</h2>
          <p className="text-sm text-muted-foreground">{analysis.homeTeam} vs {analysis.awayTeam} · {analysis.date}</p>
        </div>
      </div>

      {analysis.notes && (
        <Card className="border-border bg-card"><CardContent className="p-4 text-sm text-muted-foreground">{analysis.notes}</CardContent></Card>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { icon: CornerDownRight, label: "Corners", home: corners.home, away: corners.away },
          { icon: ShieldAlert, label: "Fouls", home: fouls.home, away: fouls.away },
          { icon: Target, label: "Free Kicks", home: freeKicks.home, away: freeKicks.away },
          { icon: Zap, label: "Dangerous Attacks", home: ms.home.dangerousAttacks, away: ms.away.dangerousAttacks },
        ].map((s) => (
          <Card key={s.label} className="border-border bg-card">
            <CardContent className="flex flex-col items-center gap-2 p-4">
              <s.icon className="h-6 w-6 text-primary" />
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-foreground">{s.home}</span>
                <span className="text-xs text-muted-foreground">vs</span>
                <span className="text-lg font-bold text-destructive">{s.away}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <HeatMap />

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Match Statistics</span>
            <div className="flex items-center gap-4 text-sm font-normal">
              <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-sm bg-muted-foreground/70" /><span className="text-muted-foreground">Home</span></div>
              <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-sm bg-destructive/80" /><span className="text-muted-foreground">Away</span></div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {statLabels.map((s) => <StatBar key={s.key} label={s.label} homeVal={ms.home[s.key]} awayVal={ms.away[s.key]} isPercent={s.key === "possession"} />)}
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-lg">Match Events Timeline</CardTitle></CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-3 pl-10">
              {evts.map((ev, i) => (
                <div key={i} className="relative flex items-center gap-3">
                  <div className={`absolute -left-6 h-3 w-3 rounded-full ${ev.team === "home" ? "bg-primary" : "bg-destructive"}`} />
                  <Badge variant="outline" className="text-xs">{ev.minute}'</Badge>
                  <span className="text-sm capitalize text-muted-foreground">{ev.type.replace("freeKick", "Free Kick")}</span>
                  <span className="text-sm font-medium text-foreground">{ev.player}</span>
                  <Badge variant="secondary" className="text-xs ml-auto">{ev.team}</Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/* ───────── TRAINING DETAIL VIEW ───────── */

const TrainingDetailView: React.FC<{ analysis: TrainingAnalysis; allAnalyses: TrainingAnalysis[]; onBack: () => void }> = ({ analysis, allAnalyses, onBack }) => {
  const [compareMode, setCompareMode] = useState(false);
  const [comparePlayerId, setComparePlayerId] = useState<string>("");
  const player = players.find(p => p.id === analysis.playerId)!;
  const data = analysis.playerData;

  // Build comparison radar data
  const compareAnalysis = allAnalyses.find(a => a.playerId === comparePlayerId);
  const comparePlayer = players.find(p => p.id === comparePlayerId);
  const compareData = compareAnalysis?.playerData || (comparePlayerId ? allPlayerData[comparePlayerId] : null);

  const radarData = data.movement.map(m => {
    const entry: Record<string, string | number> = { metric: m.metric, [player.name]: m.value, fullMark: m.fullMark };
    if (compareMode && compareData) {
      const cm = compareData.movement.find(cm => cm.metric === m.metric);
      if (cm && comparePlayer) entry[comparePlayer.name] = cm.value;
    }
    return entry;
  });

  const otherPlayers = players.filter(p => p.id !== analysis.playerId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">{analysis.title}</h2>
          <p className="text-sm text-muted-foreground">{player.name} · {player.position} · {analysis.date}</p>
        </div>
      </div>

      {analysis.notes && (
        <Card className="border-border bg-card"><CardContent className="p-4 text-sm text-muted-foreground">{analysis.notes}</CardContent></Card>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <MetricCard icon={<Zap className="h-5 w-5" />} label="Top Speed" value={data.summary.topSpeed.toFixed(1)} unit="m/s" />
        <MetricCard icon={<TrendingUp className="h-5 w-5" />} label="Avg Speed" value={data.summary.avgSpeed.toFixed(1)} unit="m/s" />
        <MetricCard icon={<ArrowUp className="h-5 w-5" />} label="Max Jump" value={String(data.summary.maxJump)} unit="cm" />
        <MetricCard icon={<ArrowUp className="h-5 w-5" />} label="Avg Jump" value={data.summary.avgJump.toFixed(1)} unit="cm" />
        <MetricCard icon={<Activity className="h-5 w-5" />} label="Distance" value={String(data.summary.distance)} unit="m" />
        <MetricCard icon={<Timer className="h-5 w-5" />} label="Sprints" value={String(data.summary.sprints)} unit="" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="text-lg">Speed Over Time</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.speed}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit=" m/s" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--primary))" }} name="Speed" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="text-lg">Jump Height</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.jumpHeight}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit=" cm" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Height" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Radar with comparison */}
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between flex-wrap gap-3">
              <span>Movement Pattern Analysis</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="compare-toggle" className="text-sm font-normal text-muted-foreground">Compare</Label>
                  <Switch id="compare-toggle" checked={compareMode} onCheckedChange={setCompareMode} />
                </div>
                {compareMode && (
                  <Select value={comparePlayerId} onValueChange={setComparePlayerId}>
                    <SelectTrigger className="w-[180px] h-8"><SelectValue placeholder="Select player" /></SelectTrigger>
                    <SelectContent>
                      {otherPlayers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={380}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Radar name={player.name} dataKey={player.name} stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} />
                {compareMode && comparePlayer && compareData && (
                  <Radar name={comparePlayer.name} dataKey={comparePlayer.name} stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.15} strokeWidth={2} />
                )}
                <Legend />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

/* ───────── CREATE MATCH ANALYSIS DIALOG ───────── */

const CreateMatchDialog: React.FC<{ open: boolean; onClose: () => void; onCreate: (a: MatchAnalysis) => void }> = ({ open, onClose, onCreate }) => {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [notes, setNotes] = useState("");
  const [inputMode, setInputMode] = useState<"manual" | "video">("manual");
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const handleSubmit = () => {
    if (!title || !date || !homeTeam || !awayTeam) { toast.error("Please fill in all required fields."); return; }
    onCreate({
      id: `ma_${Date.now()}`, title, date, homeTeam, awayTeam, notes, inputMode,
      videoFile: videoFile?.name,
      matchStats: defaultMatchStats,
      matchEvents: defaultMatchEvents,
    });
    setTitle(""); setDate(""); setHomeTeam(""); setAwayTeam(""); setNotes(""); setVideoFile(null);
    onClose();
    toast.success("Match analysis created!");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Match Analysis</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. League Match Round 5" /></div>
          <div className="space-y-2"><Label>Date *</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Home Team *</Label><Input value={homeTeam} onChange={e => setHomeTeam(e.target.value)} placeholder="Home team" /></div>
            <div className="space-y-2"><Label>Away Team *</Label><Input value={awayTeam} onChange={e => setAwayTeam(e.target.value)} placeholder="Away team" /></div>
          </div>

          <div className="space-y-2">
            <Label>Data Input Method</Label>
            <div className="flex gap-3">
              <Button variant={inputMode === "manual" ? "default" : "outline"} size="sm" onClick={() => setInputMode("manual")}>
                <Edit3 className="h-4 w-4 mr-1" /> Manual Input
              </Button>
              <Button variant={inputMode === "video" ? "default" : "outline"} size="sm" onClick={() => setInputMode("video")}>
                <Upload className="h-4 w-4 mr-1" /> Video Upload
              </Button>
            </div>
          </div>

          {inputMode === "video" && (
            <div className="space-y-2">
              <Label>Upload Match Video</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">Drag & drop or click to upload</p>
                <Input type="file" accept="video/*" className="max-w-[240px] mx-auto" onChange={e => setVideoFile(e.target.files?.[0] || null)} />
                {videoFile && <p className="text-sm text-primary mt-2">{videoFile.name}</p>}
              </div>
              <p className="text-xs text-muted-foreground">AI will process the video to extract match events and statistics automatically.</p>
            </div>
          )}

          {inputMode === "manual" && (
            <p className="text-xs text-muted-foreground border border-border rounded-lg p-3">
              Test data will be used for this analysis. In production, you would manually enter each match event and statistic.
            </p>
          )}

          <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional observations..." rows={3} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Create Analysis</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ───────── CREATE TRAINING ANALYSIS DIALOG ───────── */

const CreateTrainingDialog: React.FC<{ open: boolean; onClose: () => void; onCreate: (a: TrainingAnalysis) => void }> = ({ open, onClose, onCreate }) => {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [playerId, setPlayerId] = useState("p1");
  const [notes, setNotes] = useState("");
  const [inputMode, setInputMode] = useState<"manual" | "video">("manual");
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const handleSubmit = () => {
    if (!title || !date) { toast.error("Please fill in all required fields."); return; }
    onCreate({
      id: `ta_${Date.now()}`, title, date, playerId, notes, inputMode,
      videoFile: videoFile?.name,
      playerData: allPlayerData[playerId] || defaultPlayerData,
    });
    setTitle(""); setDate(""); setPlayerId("p1"); setNotes(""); setVideoFile(null);
    onClose();
    toast.success("Training analysis created!");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Training Analysis</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Agility Drill Assessment" /></div>
          <div className="space-y-2"><Label>Date *</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>Player *</Label>
            <Select value={playerId} onValueChange={setPlayerId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{players.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {p.position}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data Input Method</Label>
            <div className="flex gap-3">
              <Button variant={inputMode === "manual" ? "default" : "outline"} size="sm" onClick={() => setInputMode("manual")}>
                <Edit3 className="h-4 w-4 mr-1" /> Manual Input
              </Button>
              <Button variant={inputMode === "video" ? "default" : "outline"} size="sm" onClick={() => setInputMode("video")}>
                <Upload className="h-4 w-4 mr-1" /> Video Upload
              </Button>
            </div>
          </div>

          {inputMode === "video" && (
            <div className="space-y-2">
              <Label>Upload Training Video</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">Drag & drop or click to upload</p>
                <Input type="file" accept="video/*" className="max-w-[240px] mx-auto" onChange={e => setVideoFile(e.target.files?.[0] || null)} />
                {videoFile && <p className="text-sm text-primary mt-2">{videoFile.name}</p>}
              </div>
              <p className="text-xs text-muted-foreground">AI will analyze player movement, speed, and jumps from the video.</p>
            </div>
          )}

          {inputMode === "manual" && (
            <p className="text-xs text-muted-foreground border border-border rounded-lg p-3">
              Test data will be used for this analysis. In production, you would manually enter speed readings, jump heights, and movement metrics.
            </p>
          )}

          <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional observations..." rows={3} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Create Analysis</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ───────── ANALYSIS LIST CARDS ───────── */

const AnalysisCard: React.FC<{ title: string; subtitle: string; date: string; badge: string; onView: () => void; onDelete: () => void }> = ({ title, subtitle, date, badge, onView, onDelete }) => (
  <Card className="border-border bg-card hover:border-primary/40 transition-colors">
    <CardContent className="flex items-center justify-between p-4">
      <div className="space-y-1 min-w-0">
        <h3 className="font-semibold text-foreground truncate">{title}</h3>
        <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{badge}</Badge>
          <span className="text-xs text-muted-foreground">{date}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4 shrink-0">
        <Button variant="ghost" size="icon" onClick={onView}><Eye className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>
    </CardContent>
  </Card>
);

/* ───────── MATCH TAB ───────── */

const MatchAnalysisTab: React.FC = () => {
  const [analyses, setAnalyses] = useState<MatchAnalysis[]>(initialMatchAnalyses);
  const [viewing, setViewing] = useState<MatchAnalysis | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (viewing) return <MatchDetailView analysis={viewing} onBack={() => setViewing(null)} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{analyses.length} match {analyses.length === 1 ? "analysis" : "analyses"}</p>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Create Analysis</Button>
      </div>
      {analyses.length === 0 && (
        <Card className="border-dashed border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No match analyses yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first analysis to start tracking match performance.</p>
            <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Create Analysis</Button>
          </CardContent>
        </Card>
      )}
      <div className="space-y-3">
        {analyses.map(a => (
          <AnalysisCard key={a.id} title={a.title} subtitle={`${a.homeTeam} vs ${a.awayTeam}`} date={a.date} badge={a.inputMode === "video" ? "Video" : "Manual"} onView={() => setViewing(a)} onDelete={() => setAnalyses(prev => prev.filter(x => x.id !== a.id))} />
        ))}
      </div>
      <CreateMatchDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreate={a => setAnalyses(prev => [a, ...prev])} />
    </div>
  );
};

/* ───────── TRAINING TAB ───────── */

const TrainingAnalysisTab: React.FC = () => {
  const [analyses, setAnalyses] = useState<TrainingAnalysis[]>(initialTrainingAnalyses);
  const [viewing, setViewing] = useState<TrainingAnalysis | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (viewing) return <TrainingDetailView analysis={viewing} allAnalyses={analyses} onBack={() => setViewing(null)} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{analyses.length} training {analyses.length === 1 ? "analysis" : "analyses"}</p>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Create Analysis</Button>
      </div>
      {analyses.length === 0 && (
        <Card className="border-dashed border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No training analyses yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first analysis to track individual player performance.</p>
            <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Create Analysis</Button>
          </CardContent>
        </Card>
      )}
      <div className="space-y-3">
        {analyses.map(a => {
          const p = players.find(pl => pl.id === a.playerId);
          return (
            <AnalysisCard key={a.id} title={a.title} subtitle={p ? `${p.name} · ${p.position}` : "Unknown"} date={a.date} badge={a.inputMode === "video" ? "Video" : "Manual"} onView={() => setViewing(a)} onDelete={() => setAnalyses(prev => prev.filter(x => x.id !== a.id))} />
          );
        })}
      </div>
      <CreateTrainingDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreate={a => setAnalyses(prev => [a, ...prev])} />
    </div>
  );
};

/* ───────── MAIN PAGE ───────── */

const Examination: React.FC = () => (
  <DashboardLayout title="Examination" subtitle="Lightweight match analysis & individual player training insights">
    <Tabs defaultValue="match" className="space-y-6">
      <TabsList className="bg-muted">
        <TabsTrigger value="match">Match Analysis</TabsTrigger>
        <TabsTrigger value="training">Player Training</TabsTrigger>
      </TabsList>
      <TabsContent value="match"><MatchAnalysisTab /></TabsContent>
      <TabsContent value="training"><TrainingAnalysisTab /></TabsContent>
    </Tabs>
  </DashboardLayout>
);

export default Examination;

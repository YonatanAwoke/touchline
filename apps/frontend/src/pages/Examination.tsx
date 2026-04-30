import React, { useRef, useState } from "react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Flame, CornerDownRight, ShieldAlert, Target, Zap, ArrowUp, Activity, User, Timer, TrendingUp, Plus, Upload, Edit3, Trash2, Eye, ArrowLeft, Users, X, Loader2, FileVideo,
  ChevronLeft, ChevronRight, Download, FileImage, FileText, Share2, Search, ArrowUpDown,
  Repeat, PersonStanding, Gauge, CheckSquare, Square as SquareIcon,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from "recharts";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PlayerRatingCard, { deriveMetrics } from "@/components/examination/PlayerRatingCard";
import ReportHeader from "@/components/examination/ReportHeader";
import { exportNodeAsImage, exportNodeAsPdf, exportNodeAsSquareImage } from "@/lib/exportReport";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";

/* ───────── TYPES ───────── */

interface MatchAnalysis {
  id: string | number;
  title: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  matchId?: number;
  sessionId?: number;
  videoFile?: string;
  notes: string;
  inputMode: "manual" | "video";
  matchStats: typeof defaultMatchStats;
  matchEvents: typeof defaultMatchEvents;
}

interface TrainingAnalysis {
  id: string | number;
  title: string;
  date: string;
  playerId: string | number;
  player?: any;
  videoFile?: string;
  notes: string;
  inputMode: "manual" | "video";
  /** Which metric groups were selected for this examination. Undefined = all (legacy). */
  selectedMetrics?: string[];
  insights?: string[];
  analysisData: typeof defaultPlayerData;
}

/* ───────── METRIC CATALOG ─────────
 * Each entry represents a group the user can opt-in to when creating
 * a player examination. Detail-view cards render conditionally based
 * on what was selected (or what data exists for legacy analyses).
 */
const METRIC_CATALOG = [
  { id: "speed",         label: "Speed Tracking",            description: "Top speed, average speed over time" },
  { id: "jump",          label: "Jump Height",               description: "Vertical leap measurements" },
  { id: "movement",      label: "Movement Pattern",          description: "Agility, balance, coordination radar" },
  { id: "agility",       label: "Agility / Change of Direction", description: "Direction-change angle & re-acceleration time" },
  { id: "form",          label: "Body Mechanics / Form",     description: "Knee, hip & arm-swing joint angles" },
  { id: "reaction",      label: "Reaction Time",             description: "First-movement detection after stimulus" },
  { id: "distance",      label: "Distance & Sprints",        description: "Total distance covered, sprint count" },
] as const;

type MetricId = typeof METRIC_CATALOG[number]["id"];

const ALL_METRIC_IDS: MetricId[] = METRIC_CATALOG.map(m => m.id) as MetricId[];

/** Backward-compatibility helper: if no selectedMetrics is stored, infer from data. */
const resolveSelectedMetrics = (a: TrainingAnalysis): MetricId[] => {
  if (a.selectedMetrics && a.selectedMetrics.length > 0) return a.selectedMetrics as MetricId[];
  // legacy analyses: assume all metric groups available
  return ALL_METRIC_IDS;
};

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
  summary: {
    topSpeed: 9.1, avgSpeed: 6.5, maxJump: 60, avgJump: 54.5, distance: 1240, sprints: 14,
    // Agility / Change of Direction
    cdAngle: 112,        // average change-of-direction angle (degrees)
    cdReaccelTime: 0.42, // seconds to re-accelerate
    // Body Mechanics / Form Analysis (joint angles in degrees)
    kneeAngle: 142,
    hipAngle: 118,
    armSwingAngle: 95,
    formScore: 84,       // overall mechanics score 0-100
    // Reaction Time
    reactionTime: 0.28,
    reaccelTime: 0.42,
    agilityScore: 85,
  } as {
    topSpeed: number; avgSpeed: number; maxJump: number; avgJump: number;
    distance: number; sprints: number;
    cdAngle?: number; cdReaccelTime?: number;
    kneeAngle?: number; hipAngle?: number; armSwingAngle?: number; formScore?: number;
    reactionTime?: number;
    reaccelTime?: number;
    agilityScore?: number;
  },
  insights: [] as string[],
  biomechanics: {
    kneeAngles: [] as { time: string; value: number }[],
    hipAngles: [] as { time: string; value: number }[],
    armAngles: [] as { time: string; value: number }[],
  },
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

const initialMatchAnalyses: MatchAnalysis[] = [];
const initialTrainingAnalyses: TrainingAnalysis[] = [];

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

/* ───────── EXPORT TOOLBAR (shared) ───────── */

const ExportToolbar: React.FC<{
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  positionLabel?: string;
  onExportPdf: () => void;
  onExportImage: () => void;
  isExporting?: boolean;
}> = ({ onPrev, onNext, hasPrev, hasNext, positionLabel, onExportPdf, onExportImage, isExporting }) => (
  <div className="flex flex-wrap items-center gap-2">
    {(onPrev || onNext) && (
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onPrev} disabled={!hasPrev}>
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        {positionLabel && <span className="px-1 text-xs text-muted-foreground">{positionLabel}</span>}
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onNext} disabled={!hasNext}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="h-8 gap-1.5" disabled={isExporting}>
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onExportPdf} disabled={isExporting}>
          <FileText className="h-4 w-4 mr-2" /> Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportImage} disabled={isExporting}>
          <FileImage className="h-4 w-4 mr-2" /> Export as Image
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

/* ───────── MATCH DETAIL VIEW ───────── */

const MatchDetailView: React.FC<{
  analysis: MatchAnalysis;
  allAnalyses: MatchAnalysis[];
  onBack: () => void;
  onNavigate: (a: MatchAnalysis) => void;
}> = ({ analysis, allAnalyses, onBack, onNavigate }) => {
  const { matchStats: ms, matchEvents: evts } = analysis;
  const corners = { home: evts.filter(e => e.type === "corner" && e.team === "home").length, away: evts.filter(e => e.type === "corner" && e.team === "away").length };
  const fouls = { home: evts.filter(e => e.type === "foul" && e.team === "home").length, away: evts.filter(e => e.type === "foul" && e.team === "away").length };
  const freeKicks = { home: evts.filter(e => e.type === "freeKick" && e.team === "home").length, away: evts.filter(e => e.type === "freeKick" && e.team === "away").length };

  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const idx = allAnalyses.findIndex(a => a.id === analysis.id);
  const hasPrev = idx > 0;
  const hasNext = idx >= 0 && idx < allAnalyses.length - 1;
  const goPrev = () => hasPrev && onNavigate(allAnalyses[idx - 1]);
  const goNext = () => hasNext && onNavigate(allAnalyses[idx + 1]);

  const fileBase = `match-${analysis.title.replace(/\s+/g, "-").toLowerCase()}-${analysis.date}`;
  const handleExportPdf = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try { await exportNodeAsPdf(reportRef.current, fileBase); toast.success("PDF exported"); }
    catch (e) { toast.error("Export failed"); } finally { setIsExporting(false); }
  };
  const handleExportImage = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try { await exportNodeAsImage(reportRef.current, fileBase); toast.success("Image exported"); }
    catch (e) { toast.error("Export failed"); } finally { setIsExporting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h2 className="text-xl font-bold text-foreground">{analysis.title}</h2>
            <p className="text-sm text-muted-foreground">{analysis.homeTeam} vs {analysis.awayTeam} · {new Date(analysis.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
          </div>
        </div>
        <ExportToolbar
          onPrev={goPrev} onNext={goNext} hasPrev={hasPrev} hasNext={hasNext}
          positionLabel={idx >= 0 ? `${idx + 1} / ${allAnalyses.length}` : undefined}
          onExportPdf={handleExportPdf} onExportImage={handleExportImage} isExporting={isExporting}
        />
      </div>

      <div ref={reportRef} className="space-y-6 bg-background p-6 rounded-lg">
        <ReportHeader
          title={analysis.title}
          subtitle={`${analysis.homeTeam} vs ${analysis.awayTeam}`}
          date={new Date(analysis.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
          badge="Match Analysis"
        />

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
                {evts.length > 0 ? evts.map((ev, i) => (
                  <div key={i} className="relative flex items-center gap-3">
                    <div className={`absolute -left-6 h-3 w-3 rounded-full ${ev.team === "home" ? "bg-primary" : "bg-destructive"}`} />
                    <Badge variant="outline" className="text-xs">{ev.minute}'</Badge>
                    <span className="text-sm capitalize text-muted-foreground">{ev.type.replace("freeKick", "Free Kick")}</span>
                    <span className="text-sm font-medium text-foreground">{ev.player}</span>
                    <Badge variant="secondary" className="text-xs ml-auto">{ev.team}</Badge>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground py-4">No events recorded for this match.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const TrainingDetailView: React.FC<{ analysis: TrainingAnalysis; allAnalyses: TrainingAnalysis[]; onBack: () => void; players: any[]; onNavigate: (a: TrainingAnalysis) => void }> = ({ analysis, allAnalyses, onBack, players, onNavigate }) => {
  const [compareMode, setCompareMode] = useState(false);
  const [comparePlayerId, setComparePlayerId] = useState<string | number>("");
  const player = players.find(p => p.id === analysis.playerId)!;
  const playerName = player?.user?.username || player?.name || `Player ${analysis.playerId}`;
  const teamName = player?.team?.name || player?.club?.name || "—";
  const data = analysis.analysisData;
  const enabledMetrics = resolveSelectedMetrics(analysis);
  const isOn = (m: MetricId) => enabledMetrics.includes(m);
  const enabledLabels = enabledMetrics
    .map(id => METRIC_CATALOG.find(m => m.id === id)?.label)
    .filter(Boolean) as string[];

  const reportRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const idx = allAnalyses.findIndex(a => a.id === analysis.id);
  const hasPrev = idx > 0;
  const hasNext = idx >= 0 && idx < allAnalyses.length - 1;
  const goPrev = () => hasPrev && onNavigate(allAnalyses[idx - 1]);
  const goNext = () => hasNext && onNavigate(allAnalyses[idx + 1]);

  const fileBase = `training-${playerName.replace(/\s+/g, "-").toLowerCase()}-${analysis.date}`;
  const handleExportPdf = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try { await exportNodeAsPdf(reportRef.current, fileBase); toast.success("PDF exported"); }
    catch { toast.error("Export failed"); } finally { setIsExporting(false); }
  };
  const handleExportImage = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try { await exportNodeAsImage(reportRef.current, fileBase); toast.success("Image exported"); }
    catch { toast.error("Export failed"); } finally { setIsExporting(false); }
  };
  const handleShareCard = async () => {
    if (!cardRef.current) return;
    setIsSharing(true);
    try {
      await exportNodeAsSquareImage(cardRef.current, `${fileBase}-card`, 1080);
      toast.success("Share card downloaded");
    } catch { toast.error("Share card export failed"); }
    finally { setIsSharing(false); }
  };

  // Build comparison radar data
  const compareAnalysis = allAnalyses.find(a => a.playerId === Number(comparePlayerId));
  const comparePlayer = players.find(p => p.id === Number(comparePlayerId));
  const compareData = compareAnalysis?.analysisData || null;

  const radarData = data.movement.map(m => {
    const entry: Record<string, string | number> = { metric: m.metric, [playerName]: m.value, fullMark: m.fullMark };
    if (compareMode && compareData) {
      const cm = compareData.movement.find((cm: any) => cm.metric === m.metric);
      if (cm && comparePlayer) {
          const cpName = comparePlayer?.user?.username || comparePlayer?.name || `Player ${comparePlayer.id}`;
          entry[cpName] = cm.value;
      }
    }
    return entry;
  });

  const otherPlayers = players.filter(p => p.id !== analysis.playerId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">{analysis.title}</h2>
            <p className="text-sm text-muted-foreground">{playerName} · {player?.position} · {new Date(analysis.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleShareCard} disabled={isSharing}>
            {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            Share Card
          </Button>
          <ExportToolbar
            onPrev={goPrev} onNext={goNext} hasPrev={hasPrev} hasNext={hasNext}
            positionLabel={idx >= 0 ? `${idx + 1} / ${allAnalyses.length}` : undefined}
            onExportPdf={handleExportPdf} onExportImage={handleExportImage} isExporting={isExporting}
          />
        </div>
      </div>

      <div ref={reportRef} className="space-y-6 bg-background p-6 rounded-lg">
        <ReportHeader
          title={analysis.title}
          subtitle={`${playerName} · ${player?.position || ""}${teamName !== "—" ? ` · ${teamName}` : ""}`}
          date={new Date(analysis.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
          badge="Player Examination"
        />

        {analysis.notes && (
          <Card className="border-border bg-card"><CardContent className="p-4 text-sm text-muted-foreground">{analysis.notes}</CardContent></Card>
        )}

        {/* 🤖 AI Coach Insights */}
        {((analysis.insights && analysis.insights.length > 0) || (data.insights && data.insights.length > 0)) && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                <Flame className="h-4 w-4" /> AI Coach Observations & Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {(analysis.insights || data.insights || []).map((insight, i) => (
                  <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Player rating card + summary metrics side by side */}
        <div className="grid gap-6 lg:grid-cols-[auto_1fr] items-start">
          <PlayerRatingCard
            ref={cardRef}
            playerName={playerName}
            position={player?.position || "—"}
            team={teamName !== "—" ? teamName : undefined}
            movement={data.movement}
            summary={data.summary}
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {isOn("speed") && <MetricCard icon={<Zap className="h-5 w-5" />} label="Top Speed" value={data.summary.topSpeed?.toFixed(1) || "0.0"} unit="m/s" />}
            {isOn("speed") && <MetricCard icon={<TrendingUp className="h-5 w-5" />} label="Avg Speed" value={data.summary.avgSpeed?.toFixed(1) || "0.0"} unit="m/s" />}
            {isOn("jump") && <MetricCard icon={<ArrowUp className="h-5 w-5" />} label="Max Jump" value={String(data.summary.maxJump || 0)} unit="cm" />}
            {isOn("jump") && <MetricCard icon={<ArrowUp className="h-5 w-5" />} label="Avg Jump" value={data.summary.avgJump?.toFixed(1) || "0.0"} unit="cm" />}
            {isOn("distance") && <MetricCard icon={<Activity className="h-5 w-5" />} label="Distance" value={String(data.summary.distance || 0)} unit="m" />}
            {isOn("distance") && <MetricCard icon={<Timer className="h-5 w-5" />} label="Sprints" value={String(data.summary.sprints || 0)} unit="" />}

            {/* 🔁 Agility / Change of Direction */}
            {isOn("agility") && (
              <MetricCard icon={<Repeat className="h-5 w-5" />} label="Direction Change" value={String(data.summary.cdAngle ?? 0)} unit="°" />
            )}
            {isOn("agility") && (
              <MetricCard icon={<Gauge className="h-5 w-5" />} label="Re-accel Time" value={(data.summary.cdReaccelTime ?? 0).toFixed(2)} unit="s" />
            )}

            {/* 🧍 Body Mechanics / Form Analysis */}
            {isOn("form") && (
              <MetricCard icon={<PersonStanding className="h-5 w-5" />} label="Form Score" value={String(data.summary.formScore ?? 0)} unit="/100" />
            )}
            {isOn("form") && (
              <MetricCard icon={<PersonStanding className="h-5 w-5" />} label="Knee Angle" value={String(data.summary.kneeAngle ?? 0)} unit="°" />
            )}
            {isOn("form") && (
              <MetricCard icon={<PersonStanding className="h-5 w-5" />} label="Hip Angle" value={String(data.summary.hipAngle ?? 0)} unit="°" />
            )}
            {isOn("form") && (
              <MetricCard icon={<PersonStanding className="h-5 w-5" />} label="Arm Swing" value={String(data.summary.armSwingAngle ?? 0)} unit="°" />
            )}

            {/* ⚡ Reaction Time */}
            {isOn("reaction") && (
              <MetricCard icon={<Zap className="h-5 w-5" />} label="Reaction Time" value={(data.summary.reactionTime ?? 0).toFixed(2)} unit="s" />
            )}
          </div>
        </div>

        {/* Selected metric chips so coach knows what was tested */}
        {enabledLabels.length > 0 && enabledLabels.length < METRIC_CATALOG.length && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Tested:</span>
            {enabledLabels.map(label => (
              <Badge key={label} variant="secondary" className="text-[10px]">{label}</Badge>
            ))}
          </div>
        )}


        <div className="grid gap-6 lg:grid-cols-2">
          {isOn("speed") && (
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-lg">Speed Over Time</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  {data.speed.length > 0 ? (
                    <LineChart data={data.speed}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit=" m/s" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--primary))" }} name="Speed" />
                    </LineChart>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No speed data available.</div>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {isOn("jump") && (
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-lg">Jump Height</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  {data.jumpHeight.length > 0 ? (
                    <BarChart data={data.jumpHeight}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit=" cm" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Height" />
                    </BarChart>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No jump data available.</div>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Radar with comparison */}
          {isOn("movement") && (
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
                      <Select value={String(comparePlayerId)} onValueChange={setComparePlayerId}>
                        <SelectTrigger className="w-[180px] h-8"><SelectValue placeholder="Select player" /></SelectTrigger>
                        <SelectContent>
                          {otherPlayers.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.user?.username || p.name || `Player ${p.id}`}</SelectItem>)}
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
                    <Radar name={playerName} dataKey={playerName} stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} />
                    {compareMode && comparePlayer && compareData && (
                      <Radar name={comparePlayer?.user?.username || comparePlayer?.name || `Player ${comparePlayer.id}`} dataKey={comparePlayer?.user?.username || comparePlayer?.name || `Player ${comparePlayer.id}`} stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.15} strokeWidth={2} />
                    )}
                    <Legend />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 🧬 Biomechanical Analysis Section */}
        {isOn("form") && (
          <div className="grid gap-6">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" /> Joint Angles & Form Stability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="h-[220px]">
                    <p className="text-xs font-medium text-muted-foreground mb-4 text-center">Knee Extension/Flexion (°)</p>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.biomechanics?.kneeAngles || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="time" hide />
                        <YAxis domain={[0, 180]} tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-[220px]">
                    <p className="text-xs font-medium text-muted-foreground mb-4 text-center">Hip Torso Angle (°)</p>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.biomechanics?.hipAngles || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="time" hide />
                        <YAxis domain={[0, 180]} tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-[220px]">
                    <p className="text-xs font-medium text-muted-foreground mb-4 text-center">Arm Swing ROM (°)</p>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.biomechanics?.armAngles || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="time" hide />
                        <YAxis domain={[0, 180]} tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

/* ───────── CREATE MATCH ANALYSIS DIALOG ───────── */

const emptyMatchStats = () => ({
  home: { possession: 50, goalAttempts: 0, shotsOnGoal: 0, shotsOffGoal: 0, blockedShots: 0, freeKicks: 0, cornerKicks: 0, offsides: 0, throwIns: 0, goalkeeperSaves: 0, fouls: 0, totalPasses: 0, completedPasses: 0, attacks: 0, dangerousAttacks: 0 },
  away: { possession: 50, goalAttempts: 0, shotsOnGoal: 0, shotsOffGoal: 0, blockedShots: 0, freeKicks: 0, cornerKicks: 0, offsides: 0, throwIns: 0, goalkeeperSaves: 0, fouls: 0, totalPasses: 0, completedPasses: 0, attacks: 0, dangerousAttacks: 0 },
});

const CreateMatchDialog: React.FC<{ open: boolean; onClose: () => void; onCreate: (a: MatchAnalysis) => void; matches: any[]; sessions: any[] }> = ({ open, onClose, onCreate, matches, sessions }) => {
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [notes, setNotes] = useState("");
  const [inputMode, setInputMode] = useState<"manual" | "video">("manual");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [matchStats, setMatchStats] = useState(emptyMatchStats());
  const [matchEvents, setMatchEvents] = useState<typeof defaultMatchEvents>([]);
  const [newEvent, setNewEvent] = useState({ minute: 0, type: "foul" as string, team: "home" as string, player: "" });

  const updateStat = (team: "home" | "away", key: string, val: string) => {
    setMatchStats(prev => ({ ...prev, [team]: { ...prev[team], [key]: parseInt(val) || 0 } }));
  };

  const addEvent = () => {
    if (!newEvent.player || newEvent.minute < 0) { toast.error("Fill event minute and player."); return; }
    setMatchEvents(prev => [...prev, { ...newEvent }].sort((a, b) => a.minute - b.minute));
    setNewEvent({ minute: 0, type: "foul", team: "home", player: "" });
  };

  const removeEvent = (idx: number) => setMatchEvents(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    if (!title || !date || !homeTeam || !awayTeam) { toast.error("Please fill in all required fields."); return; }
    onCreate({
      id: `ma_${Date.now()}`, title, date, homeTeam, awayTeam, notes, inputMode,
      matchId: selectedMatchId ? Number(selectedMatchId) : undefined,
      sessionId: selectedSessionId ? Number(selectedSessionId) : undefined,
      videoFile: videoFile?.name,
      matchStats: inputMode === "manual" ? matchStats : emptyMatchStats(),
      matchEvents: inputMode === "manual" ? matchEvents : [],
    });
    setTitle(""); setDate(""); setHomeTeam(""); setAwayTeam(""); setNotes(""); setVideoFile(null);
    setSelectedMatchId(""); setSelectedSessionId("");
    setMatchStats(emptyMatchStats()); setMatchEvents([]);
    onClose();
    toast.success("Match analysis created!");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Match Analysis</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. League Match Round 5" /></div>
          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label>Link to Match (Optional)</Label>
                  <Select value={selectedMatchId} onValueChange={(val) => {
                      setSelectedMatchId(val);
                      const m = matches.find(x => String(x.id) === val);
                      if (m) {
                          setHomeTeam(m.team?.name || "Home");
                          setAwayTeam(m.opponent || "Away");
                          setDate(m.matchDate ? new Date(m.matchDate).toISOString().split('T')[0] : "");
                      }
                  }}>
                      <SelectTrigger><SelectValue placeholder="Select a match" /></SelectTrigger>
                      <SelectContent>
                          {matches.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.team?.name} vs {m.opponent} ({new Date(m.matchDate).toLocaleDateString()})</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
              <div className="space-y-2">
                  <Label>Link to Session (Optional)</Label>
                  <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                      <SelectTrigger><SelectValue placeholder="Select a session" /></SelectTrigger>
                      <SelectContent>
                          {sessions.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.title} ({new Date(s.date).toLocaleDateString()})</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
          </div>
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
            <div className="space-y-4">
              {/* Match Statistics */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Match Statistics</Label>
                <div className="border border-border rounded-lg p-3 space-y-2 max-h-[280px] overflow-y-auto">
                  {statLabels.map(s => (
                    <div key={s.key} className="grid grid-cols-[1fr_80px_80px] items-center gap-2">
                      <span className="text-xs text-muted-foreground">{s.label}</span>
                      <Input type="number" min={0} className="h-7 text-xs" placeholder="Home" value={matchStats.home[s.key]} onChange={e => updateStat("home", s.key, e.target.value)} />
                      <Input type="number" min={0} className="h-7 text-xs" placeholder="Away" value={matchStats.away[s.key]} onChange={e => updateStat("away", s.key, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Match Events */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Match Events</Label>
                <div className="border border-border rounded-lg p-3 space-y-3">
                  <div className="grid grid-cols-[60px_1fr_1fr_1fr_auto] gap-2 items-end">
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground">Min</span>
                      <Input type="number" min={0} max={120} className="h-7 text-xs" value={newEvent.minute} onChange={e => setNewEvent(p => ({ ...p, minute: parseInt(e.target.value) || 0 }))} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground">Type</span>
                      <select className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs h-7" value={newEvent.type} onChange={e => setNewEvent(p => ({ ...p, type: e.target.value }))}>
                        <option value="foul">Foul</option>
                        <option value="corner">Corner</option>
                        <option value="freeKick">Free Kick</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground">Team</span>
                      <select className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs h-7" value={newEvent.team} onChange={e => setNewEvent(p => ({ ...p, team: e.target.value }))}>
                        <option value="home">Home</option>
                        <option value="away">Away</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground">Player</span>
                      <Input className="h-7 text-xs" placeholder="Name" value={newEvent.player} onChange={e => setNewEvent(p => ({ ...p, player: e.target.value }))} />
                    </div>
                    <Button size="sm" className="h-7 px-2" onClick={addEvent}><Plus className="h-3 w-3" /></Button>
                  </div>
                  {matchEvents.length > 0 && (
                    <div className="space-y-1 max-h-[150px] overflow-y-auto">
                      {matchEvents.map((ev, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-border/40 last:border-0">
                          <Badge variant="outline" className="text-[10px]">{ev.minute}'</Badge>
                          <span className="capitalize text-muted-foreground">{ev.type.replace("freeKick", "Free Kick")}</span>
                          <span className="font-medium text-foreground">{ev.player}</span>
                          <Badge variant="secondary" className="text-[10px] ml-auto">{ev.team}</Badge>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => removeEvent(i)}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {matchEvents.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-2">No events added yet. Add events above or default test data will be used.</p>}
                </div>
              </div>
            </div>
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

const emptyPlayerData = (): typeof defaultPlayerData => ({
  speed: [],
  jumpHeight: [],
  movement: [
    { metric: "Agility", value: 0, fullMark: 100 }, { metric: "Acceleration", value: 0, fullMark: 100 },
    { metric: "Endurance", value: 0, fullMark: 100 }, { metric: "Balance", value: 0, fullMark: 100 },
    { metric: "Reaction", value: 0, fullMark: 100 }, { metric: "Coordination", value: 0, fullMark: 100 },
  ],
  summary: { topSpeed: 0, avgSpeed: 0, maxJump: 0, avgJump: 0, distance: 0, sprints: 0 },
});

const CreateTrainingDialog: React.FC<{ open: boolean; onClose: () => void; onCreate: (analysis: any) => void; players: any[]; isAnalyzing?: boolean }> = ({ open, onClose, onCreate, players, isAnalyzing }) => {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [playerId, setPlayerId] = useState<string | number>("");
  const [notes, setNotes] = useState("");
  const [inputMode, setInputMode] = useState<"manual" | "video">("manual");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [playerData, setPlayerData] = useState(emptyPlayerData());
  const [sessionId, setSessionId] = useState("");
  const [newSpeed, setNewSpeed] = useState({ time: "", value: 0 });
  const [newJump, setNewJump] = useState({ time: "", value: 0 });

  // Which metric groups the user wants analyzed (applies to both manual & video).
  const [selectedMetrics, setSelectedMetrics] = useState<MetricId[]>(["speed", "jump", "movement"]);

  // Mechanics & reaction inputs (kept local; merged into summary on submit).
  const [cdAngle, setCdAngle] = useState<number>(0);
  const [cdReaccel, setCdReaccel] = useState<number>(0);
  const [kneeAngle, setKneeAngle] = useState<number>(0);
  const [hipAngle, setHipAngle] = useState<number>(0);
  const [armSwingAngle, setArmSwingAngle] = useState<number>(0);
  const [formScore, setFormScore] = useState<number>(0);
  const [reactionTime, setReactionTime] = useState<number>(0);

  const isMetricOn = (m: MetricId) => selectedMetrics.includes(m);
  const toggleMetric = (m: MetricId) =>
    setSelectedMetrics(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const addSpeed = () => {
    if (!newSpeed.time) { toast.error("Enter a time label."); return; }
    setPlayerData(prev => {
      const speed = [...prev.speed, { time: newSpeed.time, value: newSpeed.value }];
      const vals = speed.map(s => s.value).filter(v => v > 0);
      return { ...prev, speed, summary: { ...prev.summary, topSpeed: vals.length ? Math.max(...vals) : 0, avgSpeed: vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 0 } };
    });
    setNewSpeed({ time: "", value: 0 });
  };

  const addJump = () => {
    if (!newJump.time) { toast.error("Enter a jump label."); return; }
    setPlayerData(prev => {
      const jumpHeight = [...prev.jumpHeight, { time: newJump.time, value: newJump.value }];
      const vals = jumpHeight.map(j => j.value).filter(v => v > 0);
      return { ...prev, jumpHeight, summary: { ...prev.summary, maxJump: vals.length ? Math.max(...vals) : 0, avgJump: vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 0 } };
    });
    setNewJump({ time: "", value: 0 });
  };

  const updateMovement = (metric: string, value: number) => {
    setPlayerData(prev => ({ ...prev, movement: prev.movement.map(m => m.metric === metric ? { ...m, value } : m) }));
  };

  const buildMergedSummary = () => ({
    ...playerData.summary,
    ...(isMetricOn("agility") ? { cdAngle, cdReaccelTime: cdReaccel } : {}),
    ...(isMetricOn("form") ? { kneeAngle, hipAngle, armSwingAngle, formScore } : {}),
    ...(isMetricOn("reaction") ? { reactionTime } : {}),
  });

  const resetForm = () => {
    setTitle(""); setDate(""); setPlayerId(""); setNotes(""); setVideoFile(null);
    setSessionId(""); setPlayerData(emptyPlayerData());
    setSelectedMetrics(["speed", "jump", "movement"]);
    setCdAngle(0); setCdReaccel(0); setKneeAngle(0); setHipAngle(0);
    setArmSwingAngle(0); setFormScore(0); setReactionTime(0);
  };

  const handleSubmit = () => {
    if (!title || !date || !playerId) { toast.error("Please fill in all required fields."); return; }
    if (selectedMetrics.length === 0) { toast.error("Select at least one metric to analyze."); return; }

    if (inputMode === "video") {
      if (!videoFile) { toast.error("Please select a video file."); return; }

      const formData = new FormData();
      formData.append("title", title);
      formData.append("date", date);
      formData.append("playerId", String(playerId));
      if (sessionId) formData.append("sessionId", sessionId);
      formData.append("notes", notes);
      formData.append("video", videoFile);
      formData.append("selectedMetrics", JSON.stringify(selectedMetrics));

      onCreate(formData);
    } else {
      const hasManualData = playerData.speed.length > 0 || playerData.jumpHeight.length > 0;
      onCreate({
        title, date, playerId: Number(playerId), sessionId: sessionId ? Number(sessionId) : undefined,
        notes, inputMode: "manual",
        selectedMetrics,
        analysisData: hasManualData
          ? { ...playerData, summary: buildMergedSummary() }
          : { ...emptyPlayerData(), summary: buildMergedSummary() },
      });
    }

    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Training Analysis</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Agility Drill Assessment" /></div>
          <div className="space-y-2"><Label>Date *</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>Player *</Label>
            <Select value={String(playerId)} onValueChange={setPlayerId}>
              <SelectTrigger><SelectValue placeholder="Select player" /></SelectTrigger>
              <SelectContent>{players.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.user?.username || p.name || `Player ${p.id}`} — {p.position}</SelectItem>)}</SelectContent>
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

          {/* ── Metrics to analyze (multi-select, applies to BOTH manual & video) ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Metrics to Analyze *</Label>
              <div className="flex gap-2">
                <button type="button" className="text-[11px] text-primary hover:underline" onClick={() => setSelectedMetrics([...ALL_METRIC_IDS])}>Select all</button>
                <span className="text-[11px] text-muted-foreground">·</span>
                <button type="button" className="text-[11px] text-muted-foreground hover:underline" onClick={() => setSelectedMetrics([])}>Clear</button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">Pick one or more — only the chosen metrics will be tested and shown in the report.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-border rounded-lg p-3">
              {METRIC_CATALOG.map(m => {
                const on = isMetricOn(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMetric(m.id)}
                    className={`flex items-start gap-2 rounded-md border p-2 text-left transition-colors ${
                      on
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {on ? <CheckSquare className="h-4 w-4 text-primary" /> : <SquareIcon className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold leading-tight">{m.label}</div>
                      <div className="text-[10px] leading-tight text-muted-foreground">{m.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedMetrics.length === 0 && (
              <p className="text-[11px] text-destructive">Select at least one metric.</p>
            )}
          </div>

          {inputMode === "video" && (
            <div className="space-y-2">
              <Label>Upload Training Video</Label>
              <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isAnalyzing ? "bg-muted border-primary/50" : "border-border hover:border-primary/50"}`}>
                {isAnalyzing ? (
                  <div className="space-y-3">
                    <div className="flex justify-center"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>
                    <p className="text-sm font-medium text-foreground">AI Analysis in Progress...</p>
                    <p className="text-xs text-muted-foreground italic">
                      Extracting: {selectedMetrics.map(id => METRIC_CATALOG.find(m => m.id === id)?.label).filter(Boolean).join(", ") || "selected metrics"}
                    </p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">Drag & drop or click to upload</p>
                    <Input type="file" accept="video/*" className="max-w-[240px] mx-auto" onChange={e => setVideoFile(e.target.files?.[0] || null)} />
                    {videoFile && <p className="text-sm text-primary mt-2 flex items-center justify-center gap-1"><FileVideo className="h-4 w-4" /> {videoFile.name}</p>}
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">AI will analyze only the selected metric groups from the video.</p>
            </div>
          )}

          {inputMode === "manual" && (
            <div className="space-y-4">
              {/* Speed Readings */}
              {isMetricOn("speed") && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Speed Readings (m/s)</Label>
                  <div className="border border-border rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-[1fr_80px_auto] gap-2 items-end">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground">Time Label</span>
                        <Input className="h-7 text-xs" placeholder="e.g. 0:30" value={newSpeed.time} onChange={e => setNewSpeed(p => ({ ...p, time: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground">Speed</span>
                        <Input type="number" step="0.1" min={0} className="h-7 text-xs" value={newSpeed.value} onChange={e => setNewSpeed(p => ({ ...p, value: parseFloat(e.target.value) || 0 }))} />
                      </div>
                      <Button size="sm" className="h-7 px-2" onClick={addSpeed}><Plus className="h-3 w-3" /></Button>
                    </div>
                    {playerData.speed.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {playerData.speed.map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                            {s.time}: {s.value} m/s
                            <button className="text-destructive hover:text-destructive/80" onClick={() => setPlayerData(prev => ({ ...prev, speed: prev.speed.filter((_, j) => j !== i) }))}><X className="h-2.5 w-2.5" /></button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Jump Heights */}
              {isMetricOn("jump") && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Jump Heights (cm)</Label>
                  <div className="border border-border rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-[1fr_80px_auto] gap-2 items-end">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground">Label</span>
                        <Input className="h-7 text-xs" placeholder="e.g. Jump 1" value={newJump.time} onChange={e => setNewJump(p => ({ ...p, time: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground">Height</span>
                        <Input type="number" min={0} className="h-7 text-xs" value={newJump.value} onChange={e => setNewJump(p => ({ ...p, value: parseInt(e.target.value) || 0 }))} />
                      </div>
                      <Button size="sm" className="h-7 px-2" onClick={addJump}><Plus className="h-3 w-3" /></Button>
                    </div>
                    {playerData.jumpHeight.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {playerData.jumpHeight.map((j, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                            {j.time}: {j.value} cm
                            <button className="text-destructive hover:text-destructive/80" onClick={() => setPlayerData(prev => ({ ...prev, jumpHeight: prev.jumpHeight.filter((_, k) => k !== i) }))}><X className="h-2.5 w-2.5" /></button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Movement Metrics radar */}
              {isMetricOn("movement") && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Movement Metrics (0–100)</Label>
                  <div className="border border-border rounded-lg p-3 space-y-2">
                    {playerData.movement.map(m => (
                      <div key={m.metric} className="grid grid-cols-[1fr_80px] items-center gap-2">
                        <span className="text-xs text-muted-foreground">{m.metric}</span>
                        <Input type="number" min={0} max={100} className="h-7 text-xs" value={m.value} onChange={e => updateMovement(m.metric, parseInt(e.target.value) || 0)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agility / Change of Direction */}
              {isMetricOn("agility") && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Agility / Change of Direction</Label>
                  <div className="border border-border rounded-lg p-3 grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground">Direction Change Angle (°)</span>
                      <Input type="number" min={0} max={180} className="h-7 text-xs" value={cdAngle} onChange={e => setCdAngle(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground">Re-acceleration Time (s)</span>
                      <Input type="number" step="0.01" min={0} className="h-7 text-xs" value={cdReaccel} onChange={e => setCdReaccel(parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                </div>
              )}

              {/* Body Mechanics / Form */}
              {isMetricOn("form") && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Body Mechanics / Form Analysis</Label>
                  <div className="border border-border rounded-lg p-3 grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground">Knee Angle (°)</span>
                      <Input type="number" min={0} max={180} className="h-7 text-xs" value={kneeAngle} onChange={e => setKneeAngle(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground">Hip Angle (°)</span>
                      <Input type="number" min={0} max={180} className="h-7 text-xs" value={hipAngle} onChange={e => setHipAngle(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground">Arm Swing Angle (°)</span>
                      <Input type="number" min={0} max={180} className="h-7 text-xs" value={armSwingAngle} onChange={e => setArmSwingAngle(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground">Form Score (0–100)</span>
                      <Input type="number" min={0} max={100} className="h-7 text-xs" value={formScore} onChange={e => setFormScore(parseInt(e.target.value) || 0)} />
                    </div>
                  </div>
                </div>
              )}

              {/* Reaction Time */}
              {isMetricOn("reaction") && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Reaction Time</Label>
                  <div className="border border-border rounded-lg p-3 grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground">First-Movement Latency (s)</span>
                      <Input type="number" step="0.01" min={0} className="h-7 text-xs" value={reactionTime} onChange={e => setReactionTime(parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                </div>
              )}

              {/* Distance & Sprints */}
              {isMetricOn("distance") && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Distance &amp; Sprints</Label>
                  <div className="border border-border rounded-lg p-3 grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground">Distance (m)</span>
                      <Input type="number" min={0} className="h-7 text-xs" value={playerData.summary.distance} onChange={e => setPlayerData(prev => ({ ...prev, summary: { ...prev.summary, distance: parseInt(e.target.value) || 0 } }))} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground">Sprints</span>
                      <Input type="number" min={0} className="h-7 text-xs" value={playerData.summary.sprints} onChange={e => setPlayerData(prev => ({ ...prev, summary: { ...prev.summary, sprints: parseInt(e.target.value) || 0 } }))} />
                    </div>
                  </div>
                </div>
              )}

              {selectedMetrics.length > 0 && playerData.speed.length === 0 && playerData.jumpHeight.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center">Tip: leave inputs blank to fall back to baseline test data.</p>
              )}
            </div>
          )}

          <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional observations..." rows={3} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isAnalyzing}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isAnalyzing}>
            {isAnalyzing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</> : "Create Analysis"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ───────── ANALYSIS TABLE (search / sort / filter / pagination) ───────── */

interface TableColumn<T> {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
}

const PAGE_SIZE = 8;

function AnalysisTable<T extends { id: string | number }>({
  rows,
  columns,
  searchPlaceholder,
  searchKeys,
  sortOptions,
  filterOptions,
  onView,
  onDelete,
  emptyState,
}: {
  rows: T[];
  columns: TableColumn<T>[];
  searchPlaceholder: string;
  searchKeys: ((r: T) => string)[];
  sortOptions: { value: string; label: string; sortValue: (r: T) => string | number }[];
  filterOptions?: { value: string; label: string; predicate: (r: T) => boolean }[];
  onView: (row: T) => void;
  onDelete: (row: T) => void;
  emptyState: React.ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>(sortOptions[0]?.value ?? "");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterKey, setFilterKey] = useState<string>("all");
  const [page, setPage] = useState(1);

  const filtered = React.useMemo(() => {
    let out = rows;
    if (filterKey !== "all" && filterOptions) {
      const f = filterOptions.find(o => o.value === filterKey);
      if (f) out = out.filter(f.predicate);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(r => searchKeys.some(k => k(r).toLowerCase().includes(q)));
    }
    const sorter = sortOptions.find(o => o.value === sortKey);
    if (sorter) {
      out = [...out].sort((a, b) => {
        const av = sorter.sortValue(a);
        const bv = sorter.sortValue(b);
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return out;
  }, [rows, search, sortKey, sortDir, filterKey, searchKeys, sortOptions, filterOptions]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  React.useEffect(() => { setPage(1); }, [search, sortKey, sortDir, filterKey]);

  const visiblePages = React.useMemo(() => {
    const arr: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) arr.push(i);
    } else {
      arr.push(1);
      if (safePage > 3) arr.push("ellipsis");
      for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) arr.push(i);
      if (safePage < totalPages - 2) arr.push("ellipsis");
      arr.push(totalPages);
    }
    return arr;
  }, [totalPages, safePage]);

  return (
    <div className="space-y-3">
      {/* Toolbar (top-right) */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 w-[220px] pl-8"
          />
        </div>
        {filterOptions && filterOptions.length > 0 && (
          <Select value={filterKey} onValueChange={setFilterKey}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Filter" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {filterOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={sortKey} onValueChange={setSortKey}>
          <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
          <SelectContent>
            {sortOptions.map(o => <SelectItem key={o.value} value={o.value}>Sort: {o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1"
          onClick={() => setSortDir(d => (d === "asc" ? "desc" : "asc"))}
          title={`Sort ${sortDir === "asc" ? "descending" : "ascending"}`}
        >
          <ArrowUpDown className="h-4 w-4" />
          {sortDir === "asc" ? "Asc" : "Desc"}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <>{emptyState}</>
      ) : (
        <>
          <Card className="border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map(c => <TableHead key={c.key}>{c.label}</TableHead>)}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(row => (
                  <TableRow key={row.id} className="hover:bg-muted/30">
                    {columns.map(c => <TableCell key={c.key}>{c.render(row)}</TableCell>)}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => onView(row)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete(row)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            {totalPages > 1 && (
              <Pagination className="mx-0 w-auto justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => { e.preventDefault(); setPage(p => Math.max(1, p - 1)); }}
                      className={safePage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  {visiblePages.map((p, i) =>
                    p === "ellipsis" ? (
                      <PaginationItem key={`e-${i}`}><PaginationEllipsis /></PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink href="#" isActive={p === safePage} onClick={(e) => { e.preventDefault(); setPage(p as number); }}>
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    ),
                  )}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => { e.preventDefault(); setPage(p => Math.min(totalPages, p + 1)); }}
                      className={safePage === totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ───────── MATCH TAB ───────── */

const MatchAnalysisTab: React.FC<{ matches: any[]; sessions: any[] }> = ({ matches, sessions }) => {
  const queryClient = useQueryClient();
  const { data: analysesData, isLoading } = useQuery({
    queryKey: ["match-analyses"],
    queryFn: async () => {
      const res = await fetch("/api/examinations/match", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch match analyses");
      return res.json();
    }
  });
  const analyses: MatchAnalysis[] = analysesData?.items || [];

  const [viewing, setViewing] = useState<MatchAnalysis | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const res = await fetch(`/api/examinations/match/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-analyses"] });
      toast.success("Analysis deleted");
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
        const res = await fetch("/api/examinations/match", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            credentials: "include"
        });
        if (!res.ok) throw new Error("Create failed");
        return res.json();
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["match-analyses"] });
        setDialogOpen(false);
    }
  });

  if (viewing) return <MatchDetailView analysis={viewing} allAnalyses={analyses} onBack={() => setViewing(null)} onNavigate={setViewing} />;

  const emptyState = (
    <Card className="border-dashed border-border bg-card">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Target className="h-12 w-12 text-muted-foreground mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-1">No match analyses found</h3>
        <p className="text-sm text-muted-foreground mb-4">Adjust your search or create a new analysis to start tracking match performance.</p>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Create Analysis</Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{analyses.length} match {analyses.length === 1 ? "analysis" : "analyses"}</p>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Create Analysis</Button>
      </div>
      <AnalysisTable<MatchAnalysis>
        rows={analyses}
        searchPlaceholder="Search match, team..."
        searchKeys={[
          (a) => a.title,
          (a) => a.homeTeam,
          (a) => a.awayTeam,
        ]}
        sortOptions={[
          { value: "date", label: "Date", sortValue: (a) => new Date(a.date).getTime() },
          { value: "name", label: "Name", sortValue: (a) => a.title.toLowerCase() },
          { value: "home", label: "Home Team", sortValue: (a) => a.homeTeam.toLowerCase() },
          { value: "away", label: "Away Team", sortValue: (a) => a.awayTeam.toLowerCase() },
          { value: "events", label: "Events", sortValue: (a) => a.matchEvents.length },
          { value: "possession", label: "Home Possession", sortValue: (a) => a.matchStats.home.possession },
        ]}
        filterOptions={[
          { value: "manual", label: "Manual", predicate: (a) => a.inputMode === "manual" },
          { value: "video", label: "Video", predicate: (a) => a.inputMode === "video" },
        ]}
        columns={[
          { key: "title", label: "Title", render: (a) => <span className="font-medium text-foreground">{a.title}</span> },
          { key: "teams", label: "Teams", render: (a) => <span className="text-muted-foreground">{a.homeTeam} <span className="text-xs">vs</span> {a.awayTeam}</span> },
          { key: "date", label: "Date", render: (a) => <span className="text-sm">{new Date(a.date).toLocaleDateString()}</span> },
          { key: "events", label: "Events", render: (a) => <span className="text-sm tabular-nums">{a.matchEvents.length}</span> },
          { key: "mode", label: "Mode", render: (a) => <Badge variant="secondary" className="text-xs">{a.inputMode === "video" ? "Video" : "Manual"}</Badge> },
        ]}
        onView={(a) => setViewing(a)}
        onDelete={(a) => deleteMutation.mutate(a.id)}
        emptyState={emptyState}
      />
      <CreateMatchDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreate={a => createMutation.mutate(a)} matches={matches} sessions={sessions} />
    </div>
  );
};

/* ───────── TRAINING TAB ───────── */

const TrainingAnalysisTab: React.FC<{ players: any[] }> = ({ players }) => {
  const queryClient = useQueryClient();
  const { data: analysesData, isLoading } = useQuery({
    queryKey: ["player-analyses"],
    queryFn: async () => {
      const res = await fetch("/api/examinations/player", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch player analyses");
      return res.json();
    }
  });
  const analyses: TrainingAnalysis[] = analysesData?.items || [];

  const [viewing, setViewing] = useState<TrainingAnalysis | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const res = await fetch(`/api/examinations/player/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-analyses"] });
      toast.success("Analysis deleted");
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
        const isFormData = payload instanceof FormData;
        const res = await fetch("/api/examinations/player", {
            method: "POST",
            body: isFormData ? payload : JSON.stringify(payload),
            headers: isFormData ? {} : { "Content-Type": "application/json" },
            credentials: "include"
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Create failed");
        }
        return res.json();
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["player-analyses"] });
        setDialogOpen(false);
        toast.success("Analysis created successfully!");
    },
    onError: (error: any) => {
        toast.error(error.message);
    }
  });

  if (viewing) return <TrainingDetailView analysis={viewing} allAnalyses={analyses} onBack={() => setViewing(null)} players={players} onNavigate={setViewing} />;

  const playerOf = (a: TrainingAnalysis) => players.find(pl => pl.id === a.playerId);
  const pName = (a: TrainingAnalysis) => {
    const p = playerOf(a);
    return p ? (p.user?.username || p.name || `Player ${p.id}`) : "Unknown";
  };
  const overallOf = (a: TrainingAnalysis) => {
    const p = playerOf(a);
    return deriveMetrics(a.analysisData?.movement || [], a.analysisData?.summary || {}, p?.position || "").overall;
  };

  const emptyState = (
    <Card className="border-dashed border-border bg-card">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Activity className="h-12 w-12 text-muted-foreground mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-1">No training analyses found</h3>
        <p className="text-sm text-muted-foreground mb-4">Adjust your search or create a new analysis to track individual player performance.</p>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Create Analysis</Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{analyses.length} training {analyses.length === 1 ? "analysis" : "analyses"}</p>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Create Analysis</Button>
      </div>
      <AnalysisTable<TrainingAnalysis>
        rows={analyses}
        searchPlaceholder="Search title, player..."
        searchKeys={[
          (a) => a.title,
          (a) => pName(a),
          (a) => playerOf(a)?.position || "",
        ]}
        sortOptions={[
          { value: "date", label: "Date", sortValue: (a) => new Date(a.date).getTime() },
          { value: "name", label: "Name", sortValue: (a) => a.title.toLowerCase() },
          { value: "player", label: "Player", sortValue: (a) => pName(a).toLowerCase() },
          { value: "overall", label: "Overall", sortValue: overallOf },
          { value: "topSpeed", label: "Top Speed", sortValue: (a) => a.analysisData?.summary?.topSpeed ?? 0 },
          { value: "maxJump", label: "Max Jump", sortValue: (a) => a.analysisData?.summary?.maxJump ?? 0 },
        ]}
        filterOptions={[
          { value: "manual", label: "Manual", predicate: (a) => a.inputMode === "manual" },
          { value: "video", label: "Video", predicate: (a) => a.inputMode === "video" },
          { value: "forward", label: "Forwards", predicate: (a) => /for|strik|wing/i.test(playerOf(a)?.position || "") },
          { value: "midfield", label: "Midfielders", predicate: (a) => /mid/i.test(playerOf(a)?.position || "") },
          { value: "defender", label: "Defenders", predicate: (a) => /def/i.test(playerOf(a)?.position || "") },
          { value: "goalkeeper", label: "Goalkeepers", predicate: (a) => /goal/i.test(playerOf(a)?.position || "") },
        ]}
        columns={[
          { key: "title", label: "Title", render: (a) => <span className="font-medium text-foreground">{a.title}</span> },
          { key: "player", label: "Player", render: (a) => <span className="text-muted-foreground">{pName(a)}</span> },
          { key: "position", label: "Position", render: (a) => <span className="text-sm text-muted-foreground">{playerOf(a)?.position || "—"}</span> },
          { key: "date", label: "Date", render: (a) => <span className="text-sm">{new Date(a.date).toLocaleDateString()}</span> },
          { key: "overall", label: "Overall", render: (a) => <span className="font-bold text-primary tabular-nums">{overallOf(a)}</span> },
          { key: "topSpeed", label: "Top Speed", render: (a) => <span className="text-sm tabular-nums">{(a.analysisData?.summary?.topSpeed ?? 0).toFixed(1)} m/s</span> },
          { key: "mode", label: "Mode", render: (a) => <Badge variant="secondary" className="text-xs">{a.inputMode === "video" ? "Video" : "Manual"}</Badge> },
        ]}
        onView={(a) => setViewing(a)}
        onDelete={(a) => deleteMutation.mutate(a.id)}
        emptyState={emptyState}
      />
      <CreateTrainingDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreate={a => createMutation.mutate(a)} players={players} isAnalyzing={createMutation.isPending} />
    </div>
  );
};

/* ───────── MAIN PAGE ───────── */

const Examination: React.FC = () => {
  const { data: playersData } = useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      const res = await fetch("/api/players?limit=1000", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch players");
      return res.json();
    }
  });
  const players = playersData?.items || [];

  const { data: matchesData } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const res = await fetch("/api/matches", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch matches");
      return res.json();
    }
  });
  const matches = matchesData?.items || [];

  const { data: sessionsData } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const res = await fetch("/api/sessions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    }
  });
  const sessions = sessionsData?.items || [];

  return (
    <DashboardLayout title="Examination" subtitle="Lightweight match analysis & individual player training insights">
      <Tabs defaultValue="match" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="match">Match Analysis</TabsTrigger>
          <TabsTrigger value="training">Player Training</TabsTrigger>
        </TabsList>
        <TabsContent value="match"><MatchAnalysisTab matches={matches} sessions={sessions} /></TabsContent>
        <TabsContent value="training"><TrainingAnalysisTab players={players} /></TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default Examination;

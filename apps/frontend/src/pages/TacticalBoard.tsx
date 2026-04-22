import React, { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  Circle as CircleIcon,
  Square,
  Type,
  Trash2,
  Download,
  Save,
  Undo2,
  Redo2,
  MousePointer2,
  Pencil,
  Plus,
  X,
  Shield,
  Users,
  ClipboardList,
  Target,
  Move,
  Triangle,
  Diamond,
  RotateCw,
  Maximize2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import FormationDesigner, { FormationDesignerHandle, Player as FormationPlayer } from "@/components/FormationDesigner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolType = "select" | "arrow" | "zone" | "circle" | "triangle" | "ellipse" | "freehand" | "text";

interface Point { x: number; y: number; }

interface BaseAnnotation {
  id: string;
  color: string;
  playerId?: string | number;
  scale?: number;    // 0.5 – 3
  rotation?: number; // degrees
}

interface ArrowAnnotation extends BaseAnnotation { type: "arrow"; start: Point; end: Point; curved: boolean; }
interface ZoneAnnotation extends BaseAnnotation { type: "zone"; start: Point; end: Point; }
interface CircleAnnotation extends BaseAnnotation { type: "circle"; center: Point; radius: number; }
interface TriangleAnnotation extends BaseAnnotation { type: "triangle"; start: Point; end: Point; }
interface EllipseAnnotation extends BaseAnnotation { type: "ellipse"; start: Point; end: Point; }
interface FreehandAnnotation extends BaseAnnotation { type: "freehand"; points: Point[]; }
interface TextAnnotation extends BaseAnnotation { type: "text"; position: Point; text: string; }

type Annotation = ArrowAnnotation | ZoneAnnotation | CircleAnnotation | TriangleAnnotation | EllipseAnnotation | FreehandAnnotation | TextAnnotation;

interface PlayerInstruction { playerName: string; role: string; instruction: string; }

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = [
  { value: "hsl(var(--primary))", label: "Green", class: "bg-primary" },
  { value: "hsl(0, 80%, 55%)", label: "Red", class: "bg-red-500" },
  { value: "hsl(45, 95%, 55%)", label: "Yellow", class: "bg-yellow-400" },
  { value: "hsl(210, 90%, 55%)", label: "Blue", class: "bg-blue-500" },
  { value: "hsl(0, 0%, 100%)", label: "White", class: "bg-white border border-border" },
];

const TOOLS: { type: ToolType; icon: React.ReactNode; label: string }[] = [
  { type: "select", icon: <MousePointer2 size={16} />, label: "Select" },
  { type: "arrow", icon: <ArrowRight size={16} />, label: "Arrow" },
  { type: "zone", icon: <Square size={16} />, label: "Rectangle" },
  { type: "circle", icon: <CircleIcon size={16} />, label: "Circle" },
  { type: "ellipse", icon: <Diamond size={16} />, label: "Ellipse" },
  { type: "triangle", icon: <Triangle size={16} />, label: "Triangle" },
  { type: "freehand", icon: <Pencil size={16} />, label: "Draw" },
  { type: "text", icon: <Type size={16} />, label: "Text" },
];

let idCounter = 0;
const uid = () => `ann-${++idCounter}-${Date.now()}`;

// ─── Helper: get center of annotation ────────────────────────────────────────
const getAnnotationCenter = (ann: Annotation): Point => {
  switch (ann.type) {
    case "arrow": return { x: (ann.start.x + ann.end.x) / 2, y: (ann.start.y + ann.end.y) / 2 };
    case "zone": return { x: (ann.start.x + ann.end.x) / 2, y: (ann.start.y + ann.end.y) / 2 };
    case "circle": return ann.center;
    case "triangle": return { x: (ann.start.x + ann.end.x) / 2, y: (ann.start.y + ann.end.y) / 2 };
    case "ellipse": return { x: (ann.start.x + ann.end.x) / 2, y: (ann.start.y + ann.end.y) / 2 };
    case "freehand": {
      const xs = ann.points.map(p => p.x);
      const ys = ann.points.map(p => p.y);
      return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
    }
    case "text": return ann.position;
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

const TacticalBoard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const clubIdParam = searchParams.get("clubId");
  const boardIdParam = searchParams.get("id");

  const { data: teamsData } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await fetch("/api/teams?limit=100", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const teams = teamsData?.items ?? [];

  const [selectedTeamId, setSelectedTeamId] = useState<string>(clubIdParam || "");
  const [players, setPlayers] = useState<FormationPlayer[]>([]);
  const [formations, setFormations] = useState<any[]>([]);
  const [selectedFormationId, setSelectedFormationId] = useState<string>("");

  useEffect(() => {
    if (selectedTeamId) {
      fetch(`/api/teams`).then(r => r.json()).then(data => {
        const team = data.items?.find((t: any) => String(t.id) === String(selectedTeamId));
        if (team?.players) {
          setPlayers(team.players.map((p: any) => ({
            id: p.id,
            name: p.user ? (`${p.user.firstName || ""} ${p.user.lastName || ""}`.trim() || p.user.username || "Player") : "Unknown Player",
            position: p.position || "",
            jerseyNumber: p.user?.id % 99,
          })));
        }
      });
      fetch(`/api/formations?teamId=${selectedTeamId}`).then(r => r.json()).then(data => {
        setFormations(data || []);
        const active = data?.find((f: any) => f.isActive);
        if (active) setSelectedFormationId(String(active.id));
      });
    }
  }, [selectedTeamId]);

  // Board state
  const [boardName, setBoardName] = useState("Tactical Plan");
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [activeColor, setActiveColor] = useState(COLORS[0].value);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [undoStack, setUndoStack] = useState<Annotation[][]>([]);
  const [redoStack, setRedoStack] = useState<Annotation[][]>([]);
  const [showClearMenu, setShowClearMenu] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [instructions, setInstructions] = useState<PlayerInstruction[]>([]);
  const [showFormation, setShowFormation] = useState(true);
  const [activeBoardId, setActiveBoardId] = useState<number | null>(null);
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [selectedPlayerForView, setSelectedPlayerForView] = useState<{ player: FormationPlayer; role: string } | null>(null);
  const [boardInitialData, setBoardInitialData] = useState<any>(null);
  const [targetPlayerId, setTargetPlayerId] = useState<string>("team");

  const queryClient = useQueryClient();
  const formationRef = useRef<FormationDesignerHandle>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drawingRef = useRef<{ active: boolean; startPoint: Point | null; currentPoints: Point[] }>({ active: false, startPoint: null, currentPoints: [] });
  const annotationDraggingRef = useRef<{ id: string; startX: number; startY: number; origStart: Point; origEnd?: Point } | null>(null);
  const [drawPreview, setDrawPreview] = useState<{ start: Point; current: Point } | null>(null);
  const [freehandPreview, setFreehandPreview] = useState<Point[]>([]);

  const { data: boardsData, refetch: refetchBoards } = useQuery({
    queryKey: ["tactical-boards", selectedTeamId],
    queryFn: async () => {
      if (!selectedTeamId) return { items: [] };
      const res = await fetch(`/api/tactical-boards?teamId=${selectedTeamId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load boards");
      return res.json();
    },
    enabled: !!selectedTeamId,
  });
  const boardsList = boardsData?.items ?? [];

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = activeBoardId ? `/api/tactical-boards/${activeBoardId}` : "/api/tactical-boards";
      const method = activeBoardId ? "PATCH" : "POST";
      const res = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Save failed"); }
      return res.json();
    },
    onSuccess: (data) => { toast({ title: "Board saved successfully" }); setActiveBoardId(data.id); setBoardName(data.name); refetchBoards(); setIsSaveDialogOpen(false); },
    onError: (err: any) => { toast({ title: "Save failed", description: err.message, variant: "destructive" }); }
  });

  const handleSave = () => {
    if (!selectedTeamId) { toast({ title: "Please select a team first", variant: "destructive" }); return; }
    const formationData = formationRef.current?.getFormationData();
    saveMutation.mutate({
      name: boardName || `Tactical Board ${new Date().toLocaleDateString()}`,
      teamId: parseInt(selectedTeamId),
      formationId: selectedFormationId ? parseInt(selectedFormationId) : null,
      formationData: formationData?.positions,
      annotations, instructions,
    });
  };

  const loadBoard = (board: any) => {
    setActiveBoardId(board.id); setBoardName(board.name); setAnnotations(board.annotations || []); setInstructions(board.instructions || []);
    setBoardInitialData({ template: board.formation?.template || "4-4-2", positions: board.formationData });
    setSelectedFormationId(String(board.formationId || "")); setIsLoadDialogOpen(false);
  };

  useEffect(() => {
    if (boardIdParam) {
      fetch(`/api/tactical-boards/${boardIdParam}`, { credentials: "include" })
        .then(r => {
          if (!r.ok) throw new Error("Board not found");
          return r.json();
        })
        .then(data => {
          if (data.teamId) setSelectedTeamId(String(data.teamId));
          loadBoard(data);
        })
        .catch(err => toast({ title: "Error", description: err.message, variant: "destructive" }));
    }
  }, [boardIdParam]);

  useEffect(() => { if (clubIdParam && !selectedTeamId) setSelectedTeamId(clubIdParam); }, [clubIdParam]);

  const pushUndo = (stateOverride?: Annotation[]) => {
    const stateToPush = stateOverride || [...annotations];
    setUndoStack(prev => [...prev.slice(-20), stateToPush]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, [...annotations]]);
    setAnnotations(previous);
    setUndoStack(prev => prev.slice(0, -1));
    setSelectedIds([]); // Clear selection on undo/redo to avoid confusion
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, [...annotations]]);
    setAnnotations(next);
    setRedoStack(prev => prev.slice(0, -1));
    setSelectedIds([]);
  };

  const deleteAnnotation = (id: string) => {
    pushUndo();
    setAnnotations(prev => prev.filter(a => a.id !== id));
    setSelectedIds(prev => prev.filter(sid => sid !== id));
  };

  const clearAll = () => {
    pushUndo();
    setAnnotations([]);
    setSelectedIds([]);
    setShowClearMenu(false);
  };

  const clearSelected = () => {
    if (selectedIds.length === 0) return;
    pushUndo();
    setAnnotations(prev => prev.filter(a => !selectedIds.includes(a.id)));
    setSelectedIds([]);
    setShowClearMenu(false);
  };

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "z" && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if (mod && e.key === "z" && e.shiftKey) { e.preventDefault(); handleRedo(); }
      if (mod && e.key === "y") { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // Update annotation property
  const updateAnnotation = (id: string, updates: Partial<BaseAnnotation>) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, ...updates } as Annotation : a));
  };

  const selectedAnns = annotations.filter(a => selectedIds.includes(a.id));
  const latestSelected = selectedAnns.length > 0 ? selectedAnns[selectedAnns.length - 1] : null;

  const getSvgPoint = useCallback((e: React.MouseEvent | React.PointerEvent): Point | null => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 133 };
  }, []);

  const handleSvgPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (activeTool === "select") return;
    e.preventDefault();
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    const pt = getSvgPoint(e);
    if (!pt) return;

    if (activeTool === "text") {
      const text = prompt("Enter text annotation:");
      if (text) {
        pushUndo();
        setAnnotations(prev => [...prev, { type: "text", id: uid(), position: pt, text, color: activeColor, playerId: targetPlayerId === "team" ? undefined : targetPlayerId, scale: 1, rotation: 0 }]);
      }
      return;
    }
    drawingRef.current = { active: true, startPoint: pt, currentPoints: [pt] };
    setDrawPreview({ start: pt, current: pt });
  }, [activeTool, getSvgPoint, activeColor, targetPlayerId]);

  const handleSvgPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const pt = getSvgPoint(e);
    if (!pt) return;

    if (annotationDraggingRef.current) {
      const { id, startX, startY, origStart, origEnd } = annotationDraggingRef.current;
      const dx = pt.x - startX, dy = pt.y - startY;
      setAnnotations(prev => prev.map(ann => {
        if (ann.id !== id) return ann;
        if (ann.type === "circle") return { ...ann, center: { x: origStart.x + dx, y: origStart.y + dy } };
        if (ann.type === "arrow" || ann.type === "zone" || ann.type === "triangle" || ann.type === "ellipse")
          return { ...ann, start: { x: origStart.x + dx, y: origStart.y + dy }, end: { x: (origEnd?.x ?? 0) + dx, y: (origEnd?.y ?? 0) + dy } };
        if (ann.type === "text") return { ...ann, position: { x: origStart.x + dx, y: origStart.y + dy } };
        if (ann.type === "freehand") return { ...ann, points: ann.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
        return ann;
      }));
      return;
    }

    if (!drawingRef.current.active || !drawingRef.current.startPoint) return;
    if (activeTool === "freehand") {
      drawingRef.current.currentPoints.push(pt);
      setFreehandPreview([...drawingRef.current.currentPoints]);
    } else {
      setDrawPreview({ start: drawingRef.current.startPoint, current: pt });
    }
  }, [activeTool, getSvgPoint]);

  const handleSvgPointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    try { (e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId); } catch {}

    if (annotationDraggingRef.current) { pushUndo(); annotationDraggingRef.current = null; return; }
    if (!drawingRef.current.active || !drawingRef.current.startPoint) return;

    const startPt = drawingRef.current.startPoint;
    const currentPts = [...drawingRef.current.currentPoints];
    drawingRef.current = { active: false, startPoint: null, currentPoints: [] };
    setDrawPreview(null); setFreehandPreview([]);

    const pt = getSvgPoint(e);
    if (!pt) return;
    
    // Capture state before changes
    const currentAnnotations = [...annotations];
    pushUndo(currentAnnotations);

    const base = { color: activeColor, playerId: targetPlayerId === "team" ? undefined : targetPlayerId, scale: 1, rotation: 0 };

    if (activeTool === "arrow") {
      setAnnotations(prev => [...prev, { ...base, type: "arrow", id: uid(), start: startPt, end: pt, curved: false }]);
    } else if (activeTool === "zone") {
      setAnnotations(prev => [...prev, { ...base, type: "zone", id: uid(), start: startPt, end: pt }]);
    } else if (activeTool === "circle") {
      const r = Math.sqrt((pt.x - startPt.x) ** 2 + (pt.y - startPt.y) ** 2);
      setAnnotations(prev => [...prev, { ...base, type: "circle", id: uid(), center: startPt, radius: Math.max(r, 1) }]);
    } else if (activeTool === "triangle") {
      setAnnotations(prev => [...prev, { ...base, type: "triangle", id: uid(), start: startPt, end: pt }]);
    } else if (activeTool === "ellipse") {
      setAnnotations(prev => [...prev, { ...base, type: "ellipse", id: uid(), start: startPt, end: pt }]);
    } else if (activeTool === "freehand" && currentPts.length > 1) {
      setAnnotations(prev => [...prev, { ...base, type: "freehand", id: uid(), points: currentPts }]);
    }
  }, [activeTool, activeColor, getSvgPoint, targetPlayerId, annotations]);

  // Instructions
  const addInstruction = () => setInstructions(prev => [...prev, { playerName: "", role: "", instruction: "" }]);
  const updateInstruction = (idx: number, field: keyof PlayerInstruction, value: string) => setInstructions(prev => prev.map((inst, i) => i === idx ? { ...inst, [field]: value } : inst));
  const removeInstruction = (idx: number) => setInstructions(prev => prev.filter((_, i) => i !== idx));

  // ─── Render annotation SVG ─────────────────────────────────────────────────
  const renderAnnotation = (ann: Annotation) => {
    const isSelected = selectedIds.includes(ann.id);
    const scale = ann.scale ?? 1;
    const rotation = ann.rotation ?? 0;
    const center = getAnnotationCenter(ann);

    const handleAnnotationPointerDown = (e: React.PointerEvent) => {
      if (activeTool !== "select") return;
      e.stopPropagation();
      
      const isMulti = e.shiftKey || e.metaKey || e.ctrlKey;
      if (isMulti) {
        setSelectedIds(prev => prev.includes(ann.id) ? prev.filter(id => id !== ann.id) : [...prev, ann.id]);
      } else {
        if (!selectedIds.includes(ann.id)) {
          setSelectedIds([ann.id]);
        }
      }

      const pt = getSvgPoint(e);
      if (!pt) return;
      svgRef.current?.setPointerCapture(e.pointerId);
      annotationDraggingRef.current = {
        id: ann.id, startX: pt.x, startY: pt.y,
        origStart: ann.type === "text" ? ann.position : ann.type === "circle" ? ann.center : ann.type === "freehand" ? ann.points[0] : ann.start,
        origEnd: (ann as any).end,
      };
    };

    const selectProps = {
      onPointerDown: activeTool === "select" ? handleAnnotationPointerDown : undefined,
      style: { cursor: activeTool === "select" ? "move" : "default", pointerEvents: (activeTool === "select" ? "auto" : "none") as React.CSSProperties["pointerEvents"] },
    };

    const transform = (scale !== 1 || rotation !== 0) ? `rotate(${rotation} ${center.x} ${center.y}) scale(${scale})` : undefined;
    // For scaling around center we use a nested transform
    const wrapTransform = (children: React.ReactNode) => {
      if (!transform) return <g key={ann.id} {...selectProps}>{children}</g>;
      // Scale around center: translate to origin, scale, translate back
      return (
        <g key={ann.id} {...selectProps}
          transform={`translate(${center.x}, ${center.y}) rotate(${rotation}) scale(${scale}) translate(${-center.x}, ${-center.y})`}
        >
          {children}
        </g>
      );
    };

    switch (ann.type) {
      case "arrow": {
        const dx = ann.end.x - ann.start.x, dy = ann.end.y - ann.start.y;
        const angle = Math.atan2(dy, dx);
        const headLen = 3.5;
        return wrapTransform(
          <>
            <line x1={ann.start.x} y1={ann.start.y} x2={ann.end.x} y2={ann.end.y} stroke={ann.color} strokeWidth={isSelected ? "3" : "2.2"} strokeLinecap="round" filter={isSelected ? "url(#glow)" : undefined} />
            <path d={`M ${ann.end.x} ${ann.end.y} L ${ann.end.x - headLen * Math.cos(angle - 0.5)} ${ann.end.y - headLen * Math.sin(angle - 0.5)} L ${ann.end.x - headLen * Math.cos(angle + 0.5)} ${ann.end.y - headLen * Math.sin(angle + 0.5)} Z`} fill={ann.color} />
            <line x1={ann.start.x} y1={ann.start.y} x2={ann.end.x} y2={ann.end.y} stroke="transparent" strokeWidth="6" />
          </>
        );
      }
      case "zone": {
        const x = Math.min(ann.start.x, ann.end.x), y = Math.min(ann.start.y, ann.end.y);
        const w = Math.abs(ann.end.x - ann.start.x), h = Math.abs(ann.end.y - ann.start.y);
        return wrapTransform(
          <>
            <rect x={x} y={y} width={w} height={h} fill={ann.color} fillOpacity={isSelected ? 0.35 : 0.25} stroke={ann.color} strokeWidth={isSelected ? "2" : "1.2"} strokeDasharray={isSelected ? "none" : "2,1"} rx="0.5" filter={isSelected ? "url(#glow)" : undefined} />
            <rect x={x} y={y} width={w} height={h} fill="transparent" stroke="transparent" strokeWidth="6" />
          </>
        );
      }
      case "circle": {
        return wrapTransform(
          <>
            <circle cx={ann.center.x} cy={ann.center.y} r={ann.radius} fill={ann.color} fillOpacity={isSelected ? 0.35 : 0.2} stroke={ann.color} strokeWidth={isSelected ? "2" : "1.2"} filter={isSelected ? "url(#glow)" : undefined} />
            <circle cx={ann.center.x} cy={ann.center.y} r={ann.radius} fill="transparent" stroke="transparent" strokeWidth="6" />
          </>
        );
      }
      case "triangle": {
        const cx = (ann.start.x + ann.end.x) / 2;
        const top = { x: cx, y: Math.min(ann.start.y, ann.end.y) };
        const bl = { x: Math.min(ann.start.x, ann.end.x), y: Math.max(ann.start.y, ann.end.y) };
        const br = { x: Math.max(ann.start.x, ann.end.x), y: Math.max(ann.start.y, ann.end.y) };
        const d = `M ${top.x} ${top.y} L ${bl.x} ${bl.y} L ${br.x} ${br.y} Z`;
        return wrapTransform(
          <>
            <path d={d} fill={ann.color} fillOpacity={isSelected ? 0.35 : 0.2} stroke={ann.color} strokeWidth={isSelected ? "2" : "1.2"} strokeLinejoin="round" filter={isSelected ? "url(#glow)" : undefined} />
            <path d={d} fill="transparent" stroke="transparent" strokeWidth="6" />
          </>
        );
      }
      case "ellipse": {
        const cx = (ann.start.x + ann.end.x) / 2, cy = (ann.start.y + ann.end.y) / 2;
        const rx = Math.abs(ann.end.x - ann.start.x) / 2, ry = Math.abs(ann.end.y - ann.start.y) / 2;
        return wrapTransform(
          <>
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={ann.color} fillOpacity={isSelected ? 0.35 : 0.2} stroke={ann.color} strokeWidth={isSelected ? "2" : "1.2"} filter={isSelected ? "url(#glow)" : undefined} />
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="transparent" stroke="transparent" strokeWidth="6" />
          </>
        );
      }
      case "freehand": {
        if (!ann.points || ann.points.length === 0) return null;
        const d = ann.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
        return wrapTransform(
          <>
            <path d={d} fill="none" stroke={ann.color} strokeWidth={isSelected ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round" filter={isSelected ? "url(#glow)" : undefined} />
            <path d={d} fill="none" stroke="transparent" strokeWidth="6" strokeLinecap="round" />
          </>
        );
      }
      case "text": {
        return wrapTransform(
          <>
            <rect x={ann.position.x - 0.5} y={ann.position.y - 3} width={ann.text.length * 1.8 + 2} height={4.5} fill="hsla(0,0%,0%,0.6)" rx="0.8" />
            <text x={ann.position.x + 0.5} y={ann.position.y} fill={ann.color} fontSize="3" fontWeight="600" fontFamily="system-ui, sans-serif" filter={isSelected ? "url(#glow)" : undefined}>{ann.text}</text>
          </>
        );
      }
    }
  };

  // ─── Draw preview shapes ───────────────────────────────────────────────────
  const renderDrawPreview = () => {
    if (!drawPreview) return null;
    const { start, current } = drawPreview;

    if (activeTool === "arrow") {
      return <line x1={start.x} y1={start.y} x2={current.x} y2={current.y} stroke={activeColor} strokeWidth="2" strokeDasharray="3,2" strokeLinecap="round" pointerEvents="none" />;
    }
    if (activeTool === "zone") {
      return <rect x={Math.min(start.x, current.x)} y={Math.min(start.y, current.y)} width={Math.abs(current.x - start.x)} height={Math.abs(current.y - start.y)} fill={activeColor} fillOpacity="0.25" stroke={activeColor} strokeWidth="1.2" strokeDasharray="3,2" pointerEvents="none" />;
    }
    if (activeTool === "circle") {
      const r = Math.sqrt((current.x - start.x) ** 2 + (current.y - start.y) ** 2);
      return <circle cx={start.x} cy={start.y} r={r} fill={activeColor} fillOpacity="0.2" stroke={activeColor} strokeWidth="1.2" strokeDasharray="3,2" pointerEvents="none" />;
    }
    if (activeTool === "triangle") {
      const cx = (start.x + current.x) / 2;
      const top = { x: cx, y: Math.min(start.y, current.y) };
      const bl = { x: Math.min(start.x, current.x), y: Math.max(start.y, current.y) };
      const br = { x: Math.max(start.x, current.x), y: Math.max(start.y, current.y) };
      return <path d={`M ${top.x} ${top.y} L ${bl.x} ${bl.y} L ${br.x} ${br.y} Z`} fill={activeColor} fillOpacity="0.2" stroke={activeColor} strokeWidth="1.2" strokeDasharray="3,2" pointerEvents="none" />;
    }
    if (activeTool === "ellipse") {
      const cx = (start.x + current.x) / 2, cy = (start.y + current.y) / 2;
      const rx = Math.abs(current.x - start.x) / 2, ry = Math.abs(current.y - start.y) / 2;
      return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={activeColor} fillOpacity="0.2" stroke={activeColor} strokeWidth="1.2" strokeDasharray="3,2" pointerEvents="none" />;
    }
    return null;
  };

  return (
    <DashboardLayout title="Tactical Board" subtitle="Plan tactics, map strategies, and instruct players">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Target size={20} />
          </div>
          <Input value={boardName} onChange={(e) => setBoardName(e.target.value)} className="text-lg font-bold bg-transparent border-none px-0 h-auto focus-visible:ring-0 max-w-xs" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsLoadDialogOpen(true)}><Download size={14} /> Load</Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsSaveDialogOpen(true)}><Save size={14} /> {activeBoardId ? "Update" : "Save"}</Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/dashboard/clubs")}><Shield size={14} /> Clubs</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          {/* Team & Formation Selection */}
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 min-w-[200px]">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Team</Label>
                  <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select team" /></SelectTrigger>
                    <SelectContent>{teams.map((t: any) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {selectedTeamId && (
                  <div className="flex items-center gap-2 min-w-[200px]">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Formation</Label>
                    <Select value={selectedFormationId} onValueChange={setSelectedFormationId}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select formation" /></SelectTrigger>
                      <SelectContent>{formations.map((f: any) => <SelectItem key={f.id} value={String(f.id)}>{f.name} ({f.template})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <Button variant={showFormation ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setShowFormation(!showFormation)}>
                  <Users size={14} /> {showFormation ? "Hide" : "Show"} Formation
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Toolbar */}
          <Card className="border-border">
            <CardContent className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Tools */}
                <div className="flex items-center gap-0.5 rounded-lg bg-secondary p-1 flex-wrap">
                  {TOOLS.map((tool) => (
                    <Button key={tool.type} variant={activeTool === tool.type ? "default" : "ghost"} size="sm" className="h-8 gap-1 text-xs px-2"
                      onClick={() => { setActiveTool(tool.type); setSelectedIds([]); }}>
                      {tool.icon}
                      <span className="hidden md:inline">{tool.label}</span>
                    </Button>
                  ))}
                </div>

                <div className="w-px h-6 bg-border mx-1" />

                {/* Colors */}
                <div className="flex items-center gap-1.5">
                  {COLORS.map((c) => (
                    <button key={c.value} onClick={() => setActiveColor(c.value)}
                      className={`h-6 w-6 rounded-full transition-all ${c.class} ${activeColor === c.value ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : "hover:scale-105"}`}
                      title={c.label} />
                  ))}
                </div>

                <div className="w-px h-6 bg-border mx-1" />

                {/* Target Player */}
                <div className="flex items-center gap-1.5 min-w-[120px]">
                  <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Target</Label>
                  <Select value={targetPlayerId} onValueChange={setTargetPlayerId}>
                    <SelectTrigger className="h-8 text-[11px] py-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team">General (Team)</SelectItem>
                      {players.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-px h-6 bg-border mx-1" />

                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleUndo} disabled={undoStack.length === 0} title="Undo (Ctrl+Z)">
                  <Undo2 size={14} /> Undo
                </Button>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleRedo} disabled={redoStack.length === 0} title="Redo (Ctrl+Y / Ctrl+Shift+Z)">
                  <Redo2 size={14} /> Redo
                </Button>

                <div className="relative">
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setShowClearMenu(prev => !prev)} disabled={annotations.length === 0}>
                    <X size={14} /> Clear
                  </Button>
                  {showClearMenu && (
                    <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg p-1 min-w-[160px]">
                      <button className="w-full text-left px-3 py-1.5 text-xs rounded hover:bg-accent hover:text-accent-foreground transition-colors" onClick={clearAll}>
                        Clear All
                      </button>
                      <button className="w-full text-left px-3 py-1.5 text-xs rounded hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none" onClick={clearSelected} disabled={selectedIds.length === 0}>
                        Clear Selected
                      </button>
                      <button className="w-full text-left px-3 py-1.5 text-xs rounded hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => setShowClearMenu(false)}>
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resize & Rotation Controls for latest selected annotation */}
          {latestSelected && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-[10px] capitalize gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: latestSelected.color }} />
                    {latestSelected.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">— Transform Controls {selectedIds.length > 1 && `(${selectedIds.length} items)`}</span>
                  <Button variant="ghost" size="sm" className="h-7 p-2 ml-auto text-destructive hover:text-destructive" onClick={() => deleteAnnotation(latestSelected.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Scale */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Maximize2 size={12} className="text-primary" />
                      <Label className="text-[11px]">Size</Label>
                      <span className="text-[10px] text-muted-foreground ml-auto">{((latestSelected.scale ?? 1) * 100).toFixed(0)}%</span>
                    </div>
                    <Slider
                      value={[(latestSelected.scale ?? 1) * 100]}
                      min={10} max={400} step={5}
                      onValueChange={([v]) => updateAnnotation(latestSelected.id, { scale: v / 100 })}
                    />
                  </div>
                  {/* Rotation */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <RotateCw size={12} className="text-primary" />
                      <Label className="text-[11px]">Rotate</Label>
                      <span className="text-[10px] text-muted-foreground ml-auto">{(latestSelected.rotation ?? 0).toFixed(0)}°</span>
                    </div>
                    <Slider
                      value={[latestSelected.rotation ?? 0]}
                      min={0} max={360} step={5}
                      onValueChange={([v]) => updateAnnotation(latestSelected.id, { rotation: v })}
                    />
                  </div>
                </div>
                {/* Link player */}
                <div className="flex items-center gap-2 mt-3">
                  <Label className="text-[10px] text-muted-foreground">Linked Player</Label>
                  <Select value={String(latestSelected.playerId || "team")} onValueChange={(val) => updateAnnotation(latestSelected.id, { playerId: val === "team" ? undefined : val })}>
                    <SelectTrigger className="h-7 text-[10px] w-32"><SelectValue placeholder="Link to..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team">Unlink</SelectItem>
                      {players.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pitch Canvas */}
          <Card className="border-border overflow-hidden">
            <CardContent className="p-0">
              <div className="relative w-full" style={{ aspectRatio: "3/4" }}>
                <div className="absolute inset-0 bg-gradient-to-b from-[hsl(120,50%,32%)] to-[hsl(120,45%,28%)]" />
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="absolute left-0 right-0 pointer-events-none" style={{ top: `${i * 12.5}%`, height: "12.5%", background: i % 2 === 0 ? "hsla(0,0%,100%,0.03)" : "transparent" }} />
                ))}

                {/* Pitch Markings */}
                <svg viewBox="0 0 100 133" className="absolute inset-0 w-full h-full z-[5] pointer-events-none" preserveAspectRatio="none" fill="none" stroke="hsla(0,0%,100%,0.4)" strokeWidth="0.4">
                  <rect x="5" y="5" width="90" height="123" rx="1" />
                  <line x1="5" y1="66.5" x2="95" y2="66.5" />
                  <circle cx="50" cy="66.5" r="12" />
                  <circle cx="50" cy="66.5" r="0.8" fill="hsla(0,0%,100%,0.4)" />
                  <rect x="22" y="5" width="56" height="22" />
                  <rect x="33" y="5" width="34" height="9" />
                  <path d="M 35 27 Q 50 33 65 27" />
                  <rect x="22" y="106" width="56" height="22" />
                  <rect x="33" y="119" width="34" height="9" />
                  <path d="M 35 106 Q 50 100 65 106" />
                  <path d="M 5 8 Q 8 5 11 5" /><path d="M 89 5 Q 92 5 95 8" />
                  <path d="M 5 125 Q 8 128 11 128" /><path d="M 89 128 Q 92 128 95 125" />
                </svg>

                {/* Formation layer */}
                {showFormation && selectedTeamId && (
                  <div className="absolute inset-0 z-[10]">
                    <FormationDesigner
                      key={`${selectedTeamId}-${selectedFormationId}`}
                      ref={formationRef}
                      formationKey={formations.find(f => String(f.id) === selectedFormationId)?.template || "4-4-2"}
                      dbFormation={formations.find(f => String(f.id) === selectedFormationId)}
                      players={players}
                      initialData={boardInitialData}
                      onPlayerClick={(p, role) => setSelectedPlayerForView({ player: p, role })}
                      hidePitch={true}
                    />
                  </div>
                )}

                {/* SVG Annotation Layer */}
                <svg ref={svgRef} viewBox="0 0 100 133" 
                  className={`absolute inset-0 w-full h-full z-[30] ${activeTool === "select" ? "pointer-events-none" : "pointer-events-auto"}`}
                  preserveAspectRatio="none"
                  onPointerDown={handleSvgPointerDown} onPointerMove={handleSvgPointerMove} onPointerUp={handleSvgPointerUp}
                  style={{ cursor: activeTool === "select" ? "default" : "crosshair" }}>
                  <defs>
                    <filter id="glow"><feGaussianBlur stdDeviation="0.8" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                  </defs>
                  {annotations.map(ann => renderAnnotation(ann))}
                  {renderDrawPreview()}
                  {freehandPreview.length > 1 && (
                    <path d={freehandPreview.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")} fill="none" stroke={activeColor} strokeWidth="1.8" strokeLinecap="round" pointerEvents="none" />
                  )}
                </svg>
              </div>
            </CardContent>
          </Card>

          {/* Annotations Summary */}
          {annotations.length > 0 && (
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-foreground">Annotations</p>
                  <Badge variant="secondary" className="text-xs">{annotations.length}</Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {annotations.map((ann) => (
                    <button key={ann.id} onClick={() => {
                      if (selectedIds.includes(ann.id)) {
                        setSelectedIds(prev => prev.filter(id => id !== ann.id));
                      } else {
                        setSelectedIds(prev => [...prev, ann.id]);
                      }
                    }}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                        selectedIds.includes(ann.id) ? "bg-primary/15 text-primary ring-1 ring-primary/30" : "bg-muted text-muted-foreground hover:bg-secondary"
                      }`}>
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: ann.color }} />
                      {ann.type === "text" ? `"${(ann as TextAnnotation).text}"` : ann.type}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><ClipboardList size={16} className="text-primary" /><CardTitle className="text-sm">Player Instructions</CardTitle></div>
                <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addInstruction}><Plus size={12} /> Add</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {instructions.length === 0 && (
                <div className="text-center py-6">
                  <ClipboardList size={28} className="mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-xs text-muted-foreground">No instructions yet</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">Add tactical notes for each player</p>
                </div>
              )}
              {instructions.map((inst, idx) => (
                <div key={idx} className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2 relative group">
                  <button onClick={() => removeInstruction(idx)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"><X size={14} /></button>
                  <div className="grid grid-cols-2 gap-2">
                    {players.length > 0 ? (
                      <Select value={inst.playerName} onValueChange={(val) => { const p = players.find(pl => pl.name === val); updateInstruction(idx, "playerName", val); if (p?.position) updateInstruction(idx, "role", p.position); }}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Player" /></SelectTrigger>
                        <SelectContent>{players.map(p => <SelectItem key={p.id} value={p.name}>{p.name} {p.jerseyNumber ? `#${p.jerseyNumber}` : ""}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <Input placeholder="Player name" value={inst.playerName} onChange={(e) => updateInstruction(idx, "playerName", e.target.value)} className="h-8 text-xs" />
                    )}
                    <Input placeholder="Role (e.g. LW)" value={inst.role} onChange={(e) => updateInstruction(idx, "role", e.target.value)} className="h-8 text-xs" />
                  </div>
                  <Textarea placeholder="Tactical instruction..." value={inst.instruction} onChange={(e) => updateInstruction(idx, "instruction", e.target.value)} className="min-h-[60px] text-xs resize-none" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border bg-secondary/30">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-foreground mb-2">How to use</p>
              <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                <li className="flex items-start gap-1.5"><ArrowRight size={10} className="mt-0.5 text-primary shrink-0" />Draw <b>Arrows</b> for player movement lines</li>
                <li className="flex items-start gap-1.5"><Square size={10} className="mt-0.5 text-primary shrink-0" /><b>Rectangle</b> zones to highlight pitch areas</li>
                <li className="flex items-start gap-1.5"><CircleIcon size={10} className="mt-0.5 text-primary shrink-0" /><b>Circle</b> to mark zones of influence</li>
                <li className="flex items-start gap-1.5"><Diamond size={10} className="mt-0.5 text-primary shrink-0" /><b>Ellipse</b> for oval coverage areas</li>
                <li className="flex items-start gap-1.5"><Triangle size={10} className="mt-0.5 text-primary shrink-0" /><b>Triangle</b> for tactical formations</li>
                <li className="flex items-start gap-1.5"><Pencil size={10} className="mt-0.5 text-primary shrink-0" /><b>Draw</b> freehand for custom lines</li>
                <li className="flex items-start gap-1.5"><MousePointer2 size={10} className="mt-0.5 text-primary shrink-0" /><b>Select</b> to move, resize & rotate</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={isLoadDialogOpen} onOpenChange={setIsLoadDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Load Tactical Board</DialogTitle></DialogHeader>
          <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto px-1">
            {boardsList.length === 0 && (
              <div className="text-center py-10 text-muted-foreground"><Target size={40} className="mx-auto mb-3 opacity-20" /><p>No saved boards for this team</p></div>
            )}
            {boardsList.map((board: any) => (
              <button key={board.id} onClick={() => loadBoard(board)} className="w-full text-left p-4 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors group flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{board.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{board.formationTemplate || "No formation"} • {new Date(board.updatedAt).toLocaleDateString()}</p>
                </div>
                <Move size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>{activeBoardId ? "Update Tactical Board" : "Save Tactical Board"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Board Name</Label><Input placeholder="Enter board name..." value={boardName} onChange={(e) => setBoardName(e.target.value)} /></div>
            <p className="text-xs text-muted-foreground">This will save current annotations, formations, and player instructions.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save Board"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedPlayerForView} onOpenChange={(open) => !open && setSelectedPlayerForView(null)}>
        <DialogContent className="sm:max-w-[400px] border-primary/20">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
                {selectedPlayerForView?.player.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div><DialogTitle>{selectedPlayerForView?.player.name}</DialogTitle><p className="text-xs text-muted-foreground">{selectedPlayerForView?.role}</p></div>
            </div>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-xl bg-secondary/30 border border-border">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Tactical Instructions</Label>
              <p className="text-sm mt-1 whitespace-pre-wrap italic">{instructions.find(i => i.playerName === selectedPlayerForView?.player.name)?.instruction || "No specific instructions assigned."}</p>
            </div>
            {annotations.filter(a => a.playerId === selectedPlayerForView?.player.id).length > 0 && (
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Linked Visuals</Label>
                <div className="flex flex-wrap gap-2">
                  {annotations.filter(a => a.playerId === selectedPlayerForView?.player.id).map(a => (
                    <Badge key={a.id} variant="outline" className="text-[10px] gap-1.5"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: a.color }} />{a.type}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setSelectedPlayerForView(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default TacticalBoard;

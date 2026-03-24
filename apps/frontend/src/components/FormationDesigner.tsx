import React, { useState, useRef, useCallback, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UserCircle, X } from "lucide-react";

// Formation templates: positions as [x%, y%] on the pitch (0,0 = top-left)
const FORMATIONS: Record<string, { label: string; positions: { role: string; x: number; y: number }[] }> = {
  "4-4-2": {
    label: "4-4-2",
    positions: [
      { role: "GK", x: 50, y: 92 },
      { role: "LB", x: 15, y: 75 },
      { role: "CB", x: 38, y: 78 },
      { role: "CB", x: 62, y: 78 },
      { role: "RB", x: 85, y: 75 },
      { role: "LM", x: 15, y: 52 },
      { role: "CM", x: 38, y: 55 },
      { role: "CM", x: 62, y: 55 },
      { role: "RM", x: 85, y: 52 },
      { role: "ST", x: 38, y: 28 },
      { role: "ST", x: 62, y: 28 },
    ],
  },
  "4-3-3": {
    label: "4-3-3",
    positions: [
      { role: "GK", x: 50, y: 92 },
      { role: "LB", x: 15, y: 75 },
      { role: "CB", x: 38, y: 78 },
      { role: "CB", x: 62, y: 78 },
      { role: "RB", x: 85, y: 75 },
      { role: "CM", x: 30, y: 52 },
      { role: "CDM", x: 50, y: 58 },
      { role: "CM", x: 70, y: 52 },
      { role: "LW", x: 20, y: 28 },
      { role: "ST", x: 50, y: 22 },
      { role: "RW", x: 80, y: 28 },
    ],
  },
  "3-5-2": {
    label: "3-5-2",
    positions: [
      { role: "GK", x: 50, y: 92 },
      { role: "CB", x: 25, y: 78 },
      { role: "CB", x: 50, y: 80 },
      { role: "CB", x: 75, y: 78 },
      { role: "LWB", x: 10, y: 55 },
      { role: "CM", x: 32, y: 52 },
      { role: "CDM", x: 50, y: 58 },
      { role: "CM", x: 68, y: 52 },
      { role: "RWB", x: 90, y: 55 },
      { role: "ST", x: 38, y: 26 },
      { role: "ST", x: 62, y: 26 },
    ],
  },
  "4-2-3-1": {
    label: "4-2-3-1",
    positions: [
      { role: "GK", x: 50, y: 92 },
      { role: "LB", x: 15, y: 75 },
      { role: "CB", x: 38, y: 78 },
      { role: "CB", x: 62, y: 78 },
      { role: "RB", x: 85, y: 75 },
      { role: "CDM", x: 38, y: 60 },
      { role: "CDM", x: 62, y: 60 },
      { role: "LW", x: 20, y: 40 },
      { role: "CAM", x: 50, y: 42 },
      { role: "RW", x: 80, y: 40 },
      { role: "ST", x: 50, y: 22 },
    ],
  },
  "3-4-3": {
    label: "3-4-3",
    positions: [
      { role: "GK", x: 50, y: 92 },
      { role: "CB", x: 25, y: 78 },
      { role: "CB", x: 50, y: 80 },
      { role: "CB", x: 75, y: 78 },
      { role: "LM", x: 15, y: 52 },
      { role: "CM", x: 38, y: 55 },
      { role: "CM", x: 62, y: 55 },
      { role: "RM", x: 85, y: 52 },
      { role: "LW", x: 22, y: 28 },
      { role: "ST", x: 50, y: 22 },
      { role: "RW", x: 78, y: 28 },
    ],
  },
};

export interface Player {
  id: number | string;
  name: string;
  position?: string;
  jerseyNumber?: number;
}

interface FormationDesignerProps {
  formationKey?: string;
  onFormationChange?: (key: string) => void;
  players?: Player[];
  initialData?: any;
}

export interface FormationDesignerHandle {
  getFormationData: () => {
    template: string;
    positions: { role: string; x: number; y: number; playerId: number | string | null }[];
  };
}

const FormationDesigner = React.forwardRef<FormationDesignerHandle, FormationDesignerProps>(({
  formationKey = "4-4-2",
  onFormationChange,
  players = [],
  initialData,
}, ref) => {
  const [selected, setSelected] = useState(initialData?.name || formationKey);
  const formation = FORMATIONS[selected] ?? FORMATIONS["4-4-2"];

  // Custom positions (draggable overrides)
  const [customPositions, setCustomPositions] = useState<Record<string, { x: number; y: number }>>(
    initialData?.positions?.reduce((acc: any, p: any, idx: number) => {
      acc[`${selected}-${idx}`] = { x: p.x, y: p.y };
      return acc;
    }, {}) || {}
  );
  // Player assignments: positionIndex -> player
  const [assignments, setAssignments] = useState<Record<number, Player>>(
    initialData?.positions?.reduce((acc: any, p: any, idx: number) => {
      if (p.playerId) {
        const player = players.find(pl => String(pl.id) === String(p.playerId));
        if (player) acc[idx] = player;
      }
      return acc;
    }, {}) || {}
  );

  React.useImperativeHandle(ref, () => ({
    getFormationData: () => {
      return {
        template: selected,
        positions: formation.positions.map((pos, idx) => {
          const p = getPos(idx);
          return {
            role: pos.role,
            x: p.x,
            y: p.y,
            playerId: assignments[idx]?.id || null,
          };
        }),
      };
    },
  }));
  // Which position popover is open
  const [openPopover, setOpenPopover] = useState<number | null>(null);

  const pitchRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ idx: number; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const handleChange = (val: string) => {
    setSelected(val);
    setCustomPositions({});
    setAssignments({});
    onFormationChange?.(val);
  };

  const getPos = (idx: number) => {
    const key = `${selected}-${idx}`;
    if (customPositions[key]) return customPositions[key];
    return { x: formation.positions[idx].x, y: formation.positions[idx].y };
  };

  // Dragging logic
  const handlePointerDown = useCallback((e: React.PointerEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = getPos(idx);
    dragRef.current = { idx, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
  }, [selected, customPositions, formation]);

  const handlePointerMove = useCallback((e: React.PointerEvent, idx: number) => {
    if (!dragRef.current || dragRef.current.idx !== idx || !pitchRef.current) return;
    const rect = pitchRef.current.getBoundingClientRect();
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const newX = Math.max(3, Math.min(97, dragRef.current.origX + (dx / rect.width) * 100));
    const newY = Math.max(3, Math.min(97, dragRef.current.origY + (dy / rect.height) * 100));
    setCustomPositions(prev => ({ ...prev, [`${selected}-${idx}`]: { x: newX, y: newY } }));
  }, [selected]);

  const handlePointerUp = useCallback((e: React.PointerEvent, idx: number) => {
    if (dragRef.current?.idx === idx) {
      const dx = Math.abs(e.clientX - dragRef.current.startX);
      const dy = Math.abs(e.clientY - dragRef.current.startY);
      // If barely moved, treat as click → open popover
      if (dx < 5 && dy < 5 && players.length > 0) {
        setOpenPopover(idx);
      }
      dragRef.current = null;
    }
  }, [players]);

  const assignPlayer = (posIdx: number, player: Player) => {
    // Remove player from any other position first
    const cleaned = { ...assignments };
    Object.keys(cleaned).forEach(k => {
      if (cleaned[Number(k)]?.id === player.id) delete cleaned[Number(k)];
    });
    cleaned[posIdx] = player;
    setAssignments(cleaned);
    setOpenPopover(null);
  };

  const unassignPlayer = (posIdx: number) => {
    setAssignments(prev => {
      const next = { ...prev };
      delete next[posIdx];
      return next;
    });
  };

  const assignedPlayerIds = new Set(Object.values(assignments).map(p => p.id));

  // Close popover on click outside
  useEffect(() => {
    if (openPopover === null) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-player-popover]')) return;
      setOpenPopover(null);
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handler); };
  }, [openPopover]);

  return (
    <div className="space-y-4">
      {/* Formation selector */}
      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium text-muted-foreground">Formation</Label>
        <Select value={selected} onValueChange={handleChange}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(FORMATIONS).map(([key, f]) => (
              <SelectItem key={key} value={key}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Pitch */}
      <div
        ref={pitchRef}
        className="relative w-full overflow-hidden rounded-xl border border-border select-none"
        style={{ aspectRatio: "3/4" }}
      >
        {/* Grass background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(120,50%,32%)] to-[hsl(120,45%,28%)]" />

        {/* Pitch markings */}
        <svg
          viewBox="0 0 100 133"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          fill="none"
          stroke="hsla(0,0%,100%,0.3)"
          strokeWidth="0.4"
        >
          <rect x="5" y="5" width="90" height="123" rx="1" />
          <line x1="5" y1="66.5" x2="95" y2="66.5" />
          <circle cx="50" cy="66.5" r="12" />
          <circle cx="50" cy="66.5" r="0.8" fill="hsla(0,0%,100%,0.3)" />
          <rect x="22" y="5" width="56" height="22" />
          <rect x="33" y="5" width="34" height="9" />
          <path d="M 35 27 Q 50 33 65 27" />
          <rect x="22" y="106" width="56" height="22" />
          <rect x="33" y="119" width="34" height="9" />
          <path d="M 35 106 Q 50 100 65 106" />
          <path d="M 5 8 Q 8 5 11 5" />
          <path d="M 89 5 Q 92 5 95 8" />
          <path d="M 5 125 Q 8 128 11 128" />
          <path d="M 89 128 Q 92 128 95 125" />
        </svg>

        {/* Grass stripe effect */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              top: `${i * 12.5}%`,
              height: "12.5%",
              background: i % 2 === 0 ? "hsla(0,0%,100%,0.03)" : "transparent",
            }}
          />
        ))}

        {/* Player positions */}
        {formation.positions.map((pos, idx) => {
          const currentPos = getPos(idx);
          const assigned = assignments[idx];
          const displayLabel = assigned
            ? assigned.name.split(" ").map(w => w[0]).join("").toUpperCase()
            : String(idx + 1);
          const displayName = assigned ? assigned.name.split(" ").pop() : pos.role;

          return (
            <div key={`${selected}-${idx}`}>
              <div
                className="absolute flex flex-col items-center gap-0.5 transition-[left,top] duration-100 ease-out cursor-grab active:cursor-grabbing z-10"
                style={{
                  left: `${currentPos.x}%`,
                  top: `${currentPos.y}%`,
                  transform: "translate(-50%, -50%)",
                  touchAction: "none",
                }}
                onPointerDown={(e) => handlePointerDown(e, idx)}
                onPointerMove={(e) => handlePointerMove(e, idx)}
                onPointerUp={(e) => handlePointerUp(e, idx)}
              >
                <Avatar className={`h-9 w-9 border-2 shadow-lg ${assigned ? 'border-accent' : 'border-primary-foreground'}`}>
                  <AvatarFallback
                    className="text-[10px] font-bold text-primary-foreground"
                    style={{ background: assigned ? `hsl(var(--accent))` : `hsl(var(--primary))` }}
                  >
                    {displayLabel}
                  </AvatarFallback>
                </Avatar>
                <span className="rounded-sm bg-background/80 px-1.5 py-0.5 text-[9px] font-semibold text-foreground backdrop-blur-sm whitespace-nowrap max-w-[60px] truncate">
                  {displayName}
                </span>
              </div>
              {openPopover === idx && (
                <div
                  data-player-popover
                  className="absolute z-50"
                  style={{
                    left: `${Math.min(currentPos.x + 5, 75)}%`,
                    top: `${currentPos.y}%`,
                    transform: "translateY(-50%)",
                  }}
                >
                  <div className="w-52 rounded-md border border-border bg-popover p-2 shadow-md animate-in fade-in-0 zoom-in-95">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground px-1 pb-1">{pos.role} — Select Player</p>
                      {assigned && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start gap-2 text-destructive hover:text-destructive text-xs h-8"
                          onClick={() => { unassignPlayer(idx); setOpenPopover(null); }}
                        >
                          <X size={14} /> Remove {assigned.name.split(" ").pop()}
                        </Button>
                      )}
                      {players.length === 0 && (
                        <p className="text-xs text-muted-foreground px-1 py-2">No players in this team</p>
                      )}
                      {players.map((player) => {
                        const isUsed = assignedPlayerIds.has(player.id) && assignments[idx]?.id !== player.id;
                        return (
                          <Button
                            key={player.id}
                            variant="ghost"
                            size="sm"
                            disabled={isUsed}
                            className="w-full justify-start gap-2 text-xs h-8"
                            onClick={() => assignPlayer(idx, player)}
                          >
                            <UserCircle size={14} className="text-muted-foreground shrink-0" />
                            <span className="truncate">{player.name}</span>
                            {player.jerseyNumber != null && (
                              <span className="ml-auto text-muted-foreground">#{player.jerseyNumber}</span>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Roster summary */}
      {players.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Assigned: {Object.keys(assignments).length} / {formation.positions.length}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {players.map(p => {
              const isAssigned = assignedPlayerIds.has(p.id);
              return (
                <span
                  key={p.id}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${isAssigned
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground'
                    }`}
                >
                  {p.name}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

export default FormationDesigner;

import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  X,
  Pencil,
  Trash2,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin
} from "lucide-react";
import AddEventDialog from "@/components/AddEventDialog";
import SessionDetailSidebar from "@/components/SessionDetailSidebar";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type EventCategory = "match" | "training" | "meeting" | "other";

interface ScheduleEvent {
  id: string | number;
  title: string;
  date: Date;
  time: string;
  endTime?: string;
  location?: string;
  category: EventCategory;
  description?: string;
  teamId?: number;
  coachId?: number;
  type?: string;
  opponent?: string;
}

const categoryConfig: Record<EventCategory, { label: string; className: string; dot: string }> = {
  match: { label: "Match", className: "bg-primary/10 text-primary border-0", dot: "bg-primary" },
  training: { label: "Training", className: "bg-accent text-accent-foreground border-0", dot: "bg-accent-foreground" },
  meeting: { label: "Meeting", className: "bg-destructive/10 text-destructive border-0", dot: "bg-destructive" },
  other: { label: "Other", className: "bg-secondary text-secondary-foreground border-0", dot: "bg-muted-foreground" },
};

type ViewMode = "month" | "week" | "day";

const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

const Schedule = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [showAddEvent, setShowAddEvent] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Todo State
  const [newTodoText, setNewTodoText] = useState("");
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [editingTodoText, setEditingTodoText] = useState("");

  // Form State
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    category: "training" as EventCategory,
    teamId: "",
    coachId: "",
    opponent: "",
    type: "TECHNICAL",
  });

  const [isRescheduling, setIsRescheduling] = useState(false);

  // Attendance State
  const [localAttendance, setLocalAttendance] = useState<Record<number, string>>({});

  // Fetch Matches
  const { data: matchesData } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const res = await fetch("/api/matches?limit=1000", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load matches");
      return res.json();
    }
  });

  // Fetch Sessions
  const { data: sessionsData } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const res = await fetch("/api/sessions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load sessions");
      return res.json();
    }
  });

  // Fetch Session Detail
  const selectedSessionId = selectedEvent?.id.toString().startsWith("session") 
    ? Number(selectedEvent.id.toString().split("-")[1]) 
    : null;

  const { data: sessionDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["session", selectedSessionId],
    queryFn: async () => {
      if (!selectedSessionId) return null;
      const res = await fetch(`/api/sessions/${selectedSessionId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load session details");
      const data = await res.json();
      
      // Initialize local attendance status
      const initialAttendance: Record<number, string> = {};
      data.participants?.forEach((p: any) => {
        if (p.playerId) initialAttendance[p.playerId] = p.attendanceStatus;
      });
      setLocalAttendance(initialAttendance);
      
      return data;
    },
    enabled: !!selectedSessionId,
  });

  // Fetch Teams
  const { data: teamsData } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await fetch("/api/teams?limit=1000", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load teams");
      return res.json();
    }
  });
  const teams = teamsData?.items ?? [];

  // Fetch Coaches
  const { data: coaches = [] } = useQuery({
    queryKey: ["coaches"],
    queryFn: async () => {
      const res = await fetch("/api/coaches", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load coaches");
      return res.json();
    }
  });

  // Fetch all players for manual addition
  const { data: allPlayersData } = useQuery({
    queryKey: ["all-players"],
    queryFn: async () => {
      const res = await fetch("/api/players?limit=1000", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load players");
      return res.json();
    }
  });
  const allPlayers = allPlayersData?.items ?? [];

  // Fetch Todos
  const todosQuery = useQuery({
    queryKey: ["todos", selectedEvent?.id],
    queryFn: async () => {
      let url = "/api/todos";
      if (selectedEvent) {
        const idStr = String(selectedEvent.id);
        const id = idStr.split("-")[1];
        if (idStr.startsWith("match")) {
          url += `?matchId=${id}`;
        } else if (idStr.startsWith("session")) {
          url += `?sessionId=${id}`;
        }
      } else {
        url += "?general=true";
      }
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load todos");
      const data = await res.json();
      return data.items ?? [];
    }
  });

  // Mutations
  const createMatchMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create match");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["last-matches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setShowAddEvent(false);
      toast({ title: "Match created successfully" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const createSessionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create session");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setShowAddEvent(false);
      toast({ title: "Session created successfully" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const updateMatchMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await fetch(`/api/matches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update match");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["last-matches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setIsRescheduling(false);
      setSelectedEvent(null);
      toast({ title: "Match rescheduled successfully" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await fetch(`/api/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update session");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setIsRescheduling(false);
      setSelectedEvent(null);
      toast({ title: "Session rescheduled successfully" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const createTodoMutation = useMutation({
    mutationFn: async (payload: { text: string; matchId?: number; sessionId?: number }) => {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create todo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      setNewTodoText("");
    }
  });

  const toggleTodoMutation = useMutation({
    mutationFn: async ({ id, done }: { id: number; done: boolean }) => {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update todo");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos"] })
  });

  const updateTodoMutation = useMutation({
    mutationFn: async ({ id, text }: { id: number; text: string }) => {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update todo");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos"] })
  });

  const deleteTodoMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/todos/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete todo");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos"] })
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ sessionId, attendance }: { sessionId: number; attendance: any[] }) => {
      const res = await fetch(`/api/sessions/${sessionId}/attendance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendance }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update attendance");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session", selectedSessionId] });
      toast({ title: "Attendance updated successfully" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const addParticipantMutation = useMutation({
    mutationFn: async ({ sessionId, playerId }: { sessionId: number; playerId: number }) => {
      const res = await fetch(`/api/sessions/${sessionId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
        credentials: "include",
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to add participant");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session", selectedSessionId] });
      toast({ title: "Player added to session" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async ({ sessionId, playerId }: { sessionId: number; playerId: number }) => {
      const res = await fetch(`/api/sessions/${sessionId}/participants/player/${playerId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove participant");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session", selectedSessionId] });
      toast({ title: "Player removed from session" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const handleCreateEvent = (data: any) => {
    const dateTime = new Date(`${data.date}T${data.startTime || "00:00"}`);
    if (data.category === "match") {
      createMatchMutation.mutate({
        opponent: data.opponent || data.title,
        matchDate: dateTime.toISOString(),
        venue: data.location,
        teamId: Number(data.teamId),
        competition: "OTHER"
      });
    } else {
      const selectedTeam = teams.find((t: any) => t.id === Number(data.teamId));
      createSessionMutation.mutate({
        title: data.title,
        date: dateTime.toISOString(),
        duration: 90,
        type: data.type,
        teamId: Number(data.teamId),
        coachId: Number(data.coachId),
        organizationId: selectedTeam?.organizationId ?? (teams[0] as any)?.organizationId,
        venue: data.location,
      });
    }
  };

  const handleReschedule = (data: any) => {
    if (!selectedEvent) return;
    const dateTime = new Date(`${data.date}T${data.startTime || "00:00"}`);
    const idStr = String(selectedEvent.id);
    const id = Number(idStr.split("-")[1]);
    if (idStr.startsWith("match")) {
      updateMatchMutation.mutate({ id, payload: { matchDate: dateTime.toISOString(), venue: data.location } });
    } else {
      updateSessionMutation.mutate({ id, payload: { date: dateTime.toISOString(), venue: data.location, type: data.type } });
    }
  };

  const events: ScheduleEvent[] = useMemo(() => {
    const apiMatches = (matchesData?.items ?? []).map((m: any) => ({
      id: `match-${m.id}`,
      title: `Vs ${m.opponent}`,
      date: new Date(m.matchDate),
      time: format(new Date(m.matchDate), "HH:mm"),
      location: m.venue,
      category: "match" as const,
      teamId: m.teamId,
      opponent: m.opponent,
    }));

    const apiSessions = (sessionsData?.items ?? []).map((s: any) => ({
      id: `session-${s.id}`,
      title: s.title,
      date: new Date(s.date),
      time: format(new Date(s.date), "HH:mm"),
      location: s.venue,
      category: "training" as const,
      description: s.notes,
      teamId: s.teamId,
      coachId: s.coachId,
      type: s.type,
    }));

    return [...apiMatches, ...apiSessions];
  }, [matchesData, sessionsData]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [calendarStart.getTime(), calendarEnd.getTime()]);

  const weekStart = startOfWeek(currentDate);
  const weekDaysArray = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart.getTime()]);

  const getEventsForDay = (date: Date) =>
    events.filter((e) => isSameDay(e.date, date));

  const getEventTopAndHeight = (event: ScheduleEvent) => {
    const [startH, startM] = event.time.split(":").map(Number);
    const startMinutes = (startH - 6) * 60 + startM;
    let durationMinutes = 60;
    if (event.endTime) {
      const [endH, endM] = event.endTime.split(":").map(Number);
      durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    }
    return { top: (startMinutes / 60) * 64, height: Math.max((durationMinutes / 60) * 64, 24) };
  };

  const todayEvents = events
    .filter((e) => isSameDay(e.date, selectedDate || currentDate))
    .sort((a, b) => a.time.localeCompare(b.time));

  const weekDaysArr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const navigatePrev = () => {
    if (viewMode === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(addDays(currentDate, -7));
    else setCurrentDate(addDays(currentDate, -1));
  };

  const navigateNext = () => {
    if (viewMode === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const headerLabel = viewMode === "day"
    ? format(currentDate, "EEEE, MMMM d, yyyy")
    : viewMode === "week"
      ? `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d, yyyy")}`
      : format(currentDate, "MMMM yyyy");

  return (
    <DashboardLayout title="Schedule" subtitle="Manage your calendar and upcoming events">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main Calendar */}
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex rounded-lg border border-border overflow-hidden">
                {(["month", "week", "day"] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                      viewMode === mode
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground">
                  {headerLabel}
                </span>
                <button
                  onClick={navigatePrev}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-secondary transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={navigateNext}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-secondary transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <Button size="sm" className="gap-2" onClick={() => {
                setNewEvent({
                  title: "",
                  date: "",
                  startTime: "",
                  endTime: "",
                  location: "",
                  category: "training",
                  teamId: "",
                  coachId: "",
                  opponent: "",
                  type: "TECHNICAL",
                });
                setIsRescheduling(false);
                setShowAddEvent(true);
              }}>
                <Plus size={14} /> Add
              </Button>
            </div>

            {viewMode === "month" && (
              <div className="grid grid-cols-7 gap-px rounded-lg border border-border overflow-hidden bg-border">
                {weekDaysArr.map((day) => (
                  <div
                    key={day}
                    className="bg-secondary px-2 py-2 text-center text-xs font-semibold text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}
                {calendarDays.map((day, idx) => {
                  const dayEvents = getEventsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isTodayDate = isToday(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(day)}
                      className={`relative flex min-h-[80px] flex-col items-start bg-background p-1.5 text-left transition-colors hover:bg-secondary/50 ${
                        !isCurrentMonth ? "opacity-40" : ""
                      } ${isSelected ? "bg-accent/50 ring-1 ring-primary/30" : ""}`}
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                          isTodayDate ? "bg-primary text-primary-foreground" : "text-foreground"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                      <div className="mt-0.5 flex w-full flex-col gap-0.5">
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                            className={`cursor-pointer truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight ${categoryConfig[event.category].className}`}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <span className="px-1 text-[10px] text-muted-foreground">+{dayEvents.length - 2} more</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {viewMode === "week" && (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-secondary">
                  <div className="border-r border-border p-2" />
                  {weekDaysArray.map((day, i) => (
                    <div
                      key={i}
                      className={`border-r border-border p-2 text-center last:border-r-0 ${
                        isToday(day) ? "bg-primary/5" : ""
                      }`}
                    >
                      <p className="text-xs font-semibold text-muted-foreground">{format(day, "EEE")}</p>
                      <p className={`text-lg font-bold ${
                        isToday(day) ? "text-primary" : "text-foreground"
                      }`}>{format(day, "d")}</p>
                    </div>
                  ))}
                </div>
                <div className="relative grid grid-cols-[60px_repeat(7,1fr)] bg-background">
                  <div className="border-r border-border">
                    {hours.map((hour) => (
                      <div key={hour} className="h-16 border-b border-border px-2 py-1 text-right">
                        <span className="text-[10px] text-muted-foreground">
                          {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                        </span>
                      </div>
                    ))}
                  </div>
                  {weekDaysArray.map((day, dayIdx) => {
                    const dayEvents = getEventsForDay(day);
                    return (
                      <div
                        key={dayIdx}
                        className={`relative border-r border-border last:border-r-0 ${
                          isToday(day) ? "bg-primary/[0.02]" : ""
                        }`}
                        onClick={() => { setSelectedDate(day); setViewMode("day"); }}
                      >
                        {hours.map((hour) => (
                          <div key={hour} className="h-16 border-b border-border" />
                        ))}
                        {dayEvents.map((event) => {
                          const { top, height } = getEventTopAndHeight(event);
                          return (
                            <div
                              key={event.id}
                              onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                              className={`absolute left-0.5 right-0.5 cursor-pointer rounded px-1.5 py-1 text-[10px] font-medium leading-tight overflow-hidden ${categoryConfig[event.category].className}`}
                              style={{ top: `${top}px`, height: `${height}px` }}
                            >
                              <p className="truncate font-semibold">{event.title}</p>
                              <p className="truncate opacity-70">{event.time}{event.endTime ? ` – ${event.endTime}` : ""}</p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {viewMode === "day" && (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="grid grid-cols-[60px_1fr] bg-secondary">
                  <div className="border-r border-border p-2" />
                  <div className="p-3">
                    <p className="text-sm font-semibold text-muted-foreground">{format(currentDate, "EEEE")}</p>
                    <p className={`text-2xl font-bold ${isToday(currentDate) ? "text-primary" : "text-foreground"}`}>
                      {format(currentDate, "MMMM d")}
                    </p>
                  </div>
                </div>
                <div className="relative grid grid-cols-[60px_1fr] bg-background">
                  <div className="border-r border-border">
                    {hours.map((hour) => (
                      <div key={hour} className="h-16 border-b border-border px-2 py-1 text-right">
                        <span className="text-[10px] text-muted-foreground">
                          {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className={`relative ${isToday(currentDate) ? "bg-primary/[0.02]" : ""}`}>
                    {hours.map((hour) => (
                      <div key={hour} className="h-16 border-b border-border" />
                    ))}
                    {getEventsForDay(currentDate).map((event) => {
                      const { top, height } = getEventTopAndHeight(event);
                      return (
                        <div
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className={`absolute left-1 right-1 cursor-pointer rounded-md px-3 py-2 text-xs font-medium overflow-hidden ${categoryConfig[event.category].className}`}
                          style={{ top: `${top}px`, height: `${height}px` }}
                        >
                          <p className="font-semibold text-sm">{event.title}</p>
                          <p className="opacity-70">{event.time}{event.endTime ? ` – ${event.endTime}` : ""}</p>
                          {event.location && <p className="opacity-60 mt-0.5">{event.location}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          <SessionDetailSidebar
            selectedEvent={selectedEvent}
            setSelectedEvent={setSelectedEvent}
            sessionDetail={sessionDetail}
            isLoadingDetail={isLoadingDetail}
            localAttendance={localAttendance}
            setLocalAttendance={setLocalAttendance}
            updateAttendanceMutation={updateAttendanceMutation}
            allPlayers={allPlayers}
            addParticipantMutation={addParticipantMutation}
            removeParticipantMutation={removeParticipantMutation}
            todosQuery={todosQuery}
            newTodoText={newTodoText}
            setNewTodoText={setNewTodoText}
            createTodoMutation={createTodoMutation}
            toggleTodoMutation={toggleTodoMutation}
            deleteTodoMutation={deleteTodoMutation}
            updateTodoMutation={updateTodoMutation}
            editingTodoId={editingTodoId}
            setEditingTodoId={setEditingTodoId}
            editingTodoText={editingTodoText}
            setEditingTodoText={setEditingTodoText}
            setShowAddEvent={setShowAddEvent}
            setIsRescheduling={setIsRescheduling}
            setNewEvent={setNewEvent}
            categoryConfig={categoryConfig}
          />
        </div>
      </div>

      <AddEventDialog
        open={showAddEvent}
        onOpenChange={(open) => { setShowAddEvent(open); if (!open) setIsRescheduling(false); }}
        isRescheduling={isRescheduling}
        newEvent={newEvent}
        teams={teams}
        coaches={coaches}
        handleCreateEvent={handleCreateEvent}
        handleReschedule={handleReschedule}
        isPending={createMatchMutation.isPending || createSessionMutation.isPending || updateMatchMutation.isPending || updateSessionMutation.isPending}
      />
    </DashboardLayout>
  );
};

export default Schedule;

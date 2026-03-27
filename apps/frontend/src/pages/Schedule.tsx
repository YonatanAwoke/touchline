import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  CalendarDays,
  X,
  Pencil,
  Trash2
} from "lucide-react";
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

  // Fetch Matches
  const { data: matchesData } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const res = await fetch("/api/matches", { credentials: "include" });
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

  // Fetch Teams
  const { data: teamsData } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await fetch("/api/teams", { credentials: "include" });
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

  const handleCreateEvent = () => {
    const dateTime = new Date(`${newEvent.date}T${newEvent.startTime || "00:00"}`);
    if (newEvent.category === "match") {
      createMatchMutation.mutate({
        opponent: newEvent.opponent || newEvent.title,
        matchDate: dateTime.toISOString(),
        venue: newEvent.location,
        teamId: Number(newEvent.teamId),
        competition: "OTHER"
      });
    } else {
      const selectedTeam = teams.find((t: any) => t.id === Number(newEvent.teamId));
      createSessionMutation.mutate({
        title: newEvent.title,
        date: dateTime.toISOString(),
        duration: 90,
        type: newEvent.type,
        teamId: Number(newEvent.teamId),
        coachId: Number(newEvent.coachId),
        organizationId: selectedTeam?.organizationId ?? (teams[0] as any)?.organizationId,
        venue: newEvent.location,
      });
    }
  };

  const handleReschedule = () => {
    if (!selectedEvent) return;
    const dateTime = new Date(`${newEvent.date}T${newEvent.startTime || "00:00"}`);
    const idStr = String(selectedEvent.id);
    const id = Number(idStr.split("-")[1]);
    if (idStr.startsWith("match")) {
      updateMatchMutation.mutate({ id, payload: { matchDate: dateTime.toISOString(), venue: newEvent.location } });
    } else {
      updateSessionMutation.mutate({ id, payload: { date: dateTime.toISOString(), venue: newEvent.location } });
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
    }));

    const apiSessions = (sessionsData?.items ?? []).map((s: any) => ({
      id: `session-${s.id}`,
      title: s.title,
      date: new Date(s.date),
      time: format(new Date(s.date), "HH:mm"),
      location: s.venue,
      category: "training" as const,
      description: s.notes,
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

              <Button size="sm" className="gap-2" onClick={() => setShowAddEvent(true)}>
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
                  const events = getEventsForDay(day);
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
                        {events.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                            className={`cursor-pointer truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight ${categoryConfig[event.category].className}`}
                          >
                            {event.title}
                          </div>
                        ))}
                        {events.length > 2 && (
                          <span className="px-1 text-[10px] text-muted-foreground">+{events.length - 2} more</span>
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

        {/* Right Sidebar */}
        <div className="flex flex-col gap-4">
          {selectedEvent ? (
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <Badge className={categoryConfig[selectedEvent.category].className}>
                    {categoryConfig[selectedEvent.category].label}
                  </Badge>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                <h3 className="text-base font-bold text-foreground mb-3">
                  {selectedEvent.title}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock size={14} className="text-primary" />
                    {selectedEvent.time}
                    {selectedEvent.endTime && ` – ${selectedEvent.endTime}`}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays size={14} className="text-primary" />
                    {format(selectedEvent.date, "EEE, dd MMMM yyyy")}
                  </div>
                  {selectedEvent.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin size={14} className="text-primary" />
                      {selectedEvent.location}
                    </div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4 w-full"
                  onClick={() => {
                    const idStr = String(selectedEvent.id);
                    setNewEvent({
                      title: selectedEvent.title,
                      date: format(selectedEvent.date, "yyyy-MM-dd"),
                      startTime: selectedEvent.time,
                      endTime: selectedEvent.endTime || "",
                      location: selectedEvent.location || "",
                      category: selectedEvent.category,
                      teamId: "",
                      coachId: "",
                      opponent: idStr.startsWith("match") ? selectedEvent.title.replace("Vs ", "") : "",
                      type: "TECHNICAL",
                    });
                    setIsRescheduling(true);
                    setShowAddEvent(true);
                  }}
                >
                  Reschedule
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border">
              <CardContent className="p-4">
                <h3 className="text-sm font-bold text-foreground mb-3">
                  {selectedDate
                    ? format(selectedDate, "EEEE, MMM d")
                    : "Today's Events"}
                </h3>
                {todayEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events scheduled.</p>
                ) : (
                  <div className="space-y-3">
                    {todayEvents.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className="flex w-full items-start gap-3 rounded-lg p-2 text-left transition-colors hover:bg-secondary/60"
                      >
                        <div className="mt-1.5">
                          <div className={`h-2.5 w-2.5 rounded-full ${categoryConfig[event.category].dot}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {event.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {event.time}{event.endTime ? ` – ${event.endTime}` : ""}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* To Do List */}
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex flex-col">
                  <h3 className="text-sm font-bold text-foreground">
                    {selectedEvent ? "Event To Do" : "General To Do"}
                  </h3>
                  {selectedEvent && (
                    <button 
                      onClick={() => setSelectedEvent(null)}
                      className="text-[10px] text-primary hover:underline flex items-center gap-1"
                    >
                      <X size={10} /> Back to General
                    </button>
                  )}
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Plus size={14} />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add To Do</DialogTitle>
                      <DialogDescription>Add a new task to your list.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Input
                        placeholder="Task description..."
                        value={newTodoText}
                        onChange={(e) => setNewTodoText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const idStr = selectedEvent ? String(selectedEvent.id) : "";
                            const id = idStr ? Number(idStr.split("-")[1]) : undefined;
                            createTodoMutation.mutate({ 
                              text: newTodoText,
                              matchId: idStr.startsWith("match") ? id : undefined,
                              sessionId: idStr.startsWith("session") ? id : undefined
                            });
                          }
                        }}
                      />
                    </div>
                    <DialogFooter>
                      <Button 
                        onClick={() => {
                          const idStr = selectedEvent ? String(selectedEvent.id) : "";
                          const id = idStr ? Number(idStr.split("-")[1]) : undefined;
                          createTodoMutation.mutate({ 
                            text: newTodoText,
                            matchId: idStr.startsWith("match") ? id : undefined,
                            sessionId: idStr.startsWith("session") ? id : undefined
                          });
                        }} 
                        disabled={createTodoMutation.isPending || !newTodoText.trim()}
                      >
                        Add Task
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {todosQuery.isLoading ? (
                <p className="text-center py-4 text-xs text-muted-foreground">Loading...</p>
              ) : (
                <div className="space-y-2.5">
                  {todosQuery.data?.map((todo: any) => (
                    <div key={todo.id} className="flex items-center gap-2 group">
                      <Checkbox
                        checked={todo.done}
                        onCheckedChange={(checked) => toggleTodoMutation.mutate({ id: todo.id, done: !!checked })}
                      />
                      {editingTodoId === todo.id ? (
                        <Input
                          autoFocus
                          className="h-7 text-xs"
                          value={editingTodoText}
                          onChange={(e) => setEditingTodoText(e.target.value)}
                          onBlur={() => {
                            if (editingTodoText.trim() && editingTodoText !== todo.text) {
                              updateTodoMutation.mutate({ id: todo.id, text: editingTodoText });
                            }
                            setEditingTodoId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              updateTodoMutation.mutate({ id: todo.id, text: editingTodoText });
                              setEditingTodoId(null);
                            }
                            if (e.key === "Escape") setEditingTodoId(null);
                          }}
                        />
                      ) : (
                        <span
                          className={`flex-1 text-sm truncate transition-colors ${todo.done ? "text-muted-foreground line-through" : "text-foreground hover:text-primary cursor-pointer"}`}
                          onClick={() => {
                            setEditingTodoId(todo.id);
                            setEditingTodoText(todo.text);
                          }}
                        >
                          {todo.text}
                        </span>
                      )}
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingTodoId(todo.id); setEditingTodoText(todo.text); }}>
                          <Pencil size={12} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteTodoMutation.mutate(todo.id)}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {todosQuery.data?.length === 0 && (
                    <p className="text-center py-4 text-xs text-muted-foreground">No tasks today</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Event Dialog */}
      <Dialog open={showAddEvent} onOpenChange={(open) => { setShowAddEvent(open); if (!open) setIsRescheduling(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <CalendarDays size={20} />
              </div>
              <DialogTitle className="text-foreground">{isRescheduling ? "Reschedule Event" : "Add Event"}</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {!isRescheduling && (
              <div>
                <Label>Category</Label>
                <div className="flex gap-2 mt-1">
                  {(["training", "match"] as EventCategory[]).map((cat) => (
                    <Button
                      key={cat}
                      variant={newEvent.category === cat ? "default" : "outline"}
                      size="sm"
                      className="flex-1 capitalize"
                      onClick={() => setNewEvent({ ...newEvent, category: cat })}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>{newEvent.category === "match" ? "Opponent" : "Event Title"}</Label>
              <Input 
                placeholder={newEvent.category === "match" ? "e.g. Real Madrid" : "e.g. Tactical Drills"} 
                value={newEvent.category === "match" ? newEvent.opponent : newEvent.title}
                onChange={(e) => {
                  if (newEvent.category === "match") setNewEvent({...newEvent, opponent: e.target.value});
                  else setNewEvent({...newEvent, title: e.target.value});
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Team</Label>
                <select 
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newEvent.teamId}
                  onChange={(e) => setNewEvent({...newEvent, teamId: e.target.value})}
                >
                  <option value="">Select Team</option>
                  {teams.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              {newEvent.category === "training" && (
                <div>
                  <Label>Coach</Label>
                  <select 
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newEvent.coachId}
                    onChange={(e) => setNewEvent({...newEvent, coachId: e.target.value})}
                  >
                    <option value="">Select Coach</option>
                    {coaches.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.user?.username || c.id}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input 
                  type="date" 
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                />
              </div>
              <div>
                <Label>Start Time</Label>
                <Input 
                  type="time" 
                  value={newEvent.startTime}
                  onChange={(e) => setNewEvent({...newEvent, startTime: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label>Location</Label>
              <Input 
                placeholder="e.g. Home Stadium" 
                value={newEvent.location}
                onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => { setShowAddEvent(false); setIsRescheduling(false); }}>Cancel</Button>
              <Button 
                onClick={isRescheduling ? handleReschedule : handleCreateEvent}
                disabled={createMatchMutation.isPending || createSessionMutation.isPending || updateMatchMutation.isPending || updateSessionMutation.isPending}
              >
                {isRescheduling ? "Update Event" : "Add Event"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Schedule;

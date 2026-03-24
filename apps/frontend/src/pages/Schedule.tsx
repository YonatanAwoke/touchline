import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  CalendarDays,
  X,
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

import { useQuery } from "@tanstack/react-query";

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

const todoItems = [
  { id: 1, text: "Prepare match lineup", done: false },
  { id: 2, text: "Review training footage", done: true },
  { id: 3, text: "Update player fitness reports", done: false },
];

type ViewMode = "month" | "week" | "day";

const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

const Schedule = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [todos, setTodos] = useState(todoItems);

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

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
            {/* Header: View toggle + Navigation + Add */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              {/* View Mode Toggle */}
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

              {/* Navigation */}
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

            {/* Month View */}
            {viewMode === "month" && (
              <div className="grid grid-cols-7 gap-px rounded-lg border border-border overflow-hidden bg-border">
                {weekDays.map((day) => (
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

            {/* Week View */}
            {viewMode === "week" && (
              <div className="rounded-lg border border-border overflow-hidden">
                {/* Week header */}
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
                {/* Time grid */}
                <div className="relative grid grid-cols-[60px_repeat(7,1fr)] bg-background">
                  {/* Hour labels */}
                  <div className="border-r border-border">
                    {hours.map((hour) => (
                      <div key={hour} className="h-16 border-b border-border px-2 py-1 text-right">
                        <span className="text-[10px] text-muted-foreground">
                          {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Day columns */}
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

            {/* Day View */}
            {viewMode === "day" && (
              <div className="rounded-lg border border-border overflow-hidden">
                {/* Day header */}
                <div className="grid grid-cols-[60px_1fr] bg-secondary">
                  <div className="border-r border-border p-2" />
                  <div className="p-3">
                    <p className="text-sm font-semibold text-muted-foreground">{format(currentDate, "EEEE")}</p>
                    <p className={`text-2xl font-bold ${isToday(currentDate) ? "text-primary" : "text-foreground"}`}>
                      {format(currentDate, "MMMM d")}
                    </p>
                  </div>
                </div>
                {/* Time grid */}
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
          {/* Selected Event Detail / Today's Events */}
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
                <Button variant="outline" size="sm" className="mt-4 w-full">
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

          {/* Category Legend */}
          <Card className="border-border">
            <CardContent className="p-4">
              <h3 className="text-sm font-bold text-foreground mb-3">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(categoryConfig) as EventCategory[]).map((cat) => (
                  <Badge key={cat} className={categoryConfig[cat].className}>
                    {categoryConfig[cat].label}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* To Do List */}
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground">To Do List</h3>
                <button className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  <Plus size={14} />
                </button>
              </div>
              <div className="space-y-2.5">
                {todos.map((todo) => (
                  <label
                    key={todo.id}
                    className="flex items-center gap-2.5 cursor-pointer group"
                  >
                    <Checkbox
                      checked={todo.done}
                      onCheckedChange={(checked) =>
                        setTodos((prev) =>
                          prev.map((t) =>
                            t.id === todo.id ? { ...t, done: !!checked } : t
                          )
                        )
                      }
                    />
                    <span
                      className={`text-sm transition-colors ${
                        todo.done
                          ? "text-muted-foreground line-through"
                          : "text-foreground group-hover:text-primary"
                      }`}
                    >
                      {todo.text}
                    </span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Event Dialog */}
      <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <CalendarDays size={20} />
              </div>
              <DialogTitle className="text-foreground">Add Event</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Event Title</Label>
              <Input placeholder="e.g. Tactical Drills" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input type="date" />
              </div>
              <div>
                <Label>Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="match">Match</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input type="time" />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" />
              </div>
            </div>
            <div>
              <Label>Location</Label>
              <Input placeholder="e.g. Home Stadium" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowAddEvent(false)}>Cancel</Button>
              <Button onClick={() => setShowAddEvent(false)}>Add Event</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Schedule;

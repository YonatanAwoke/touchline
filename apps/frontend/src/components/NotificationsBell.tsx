import React from "react";
import { Bell, Check, CheckCheck, Trash2, Trophy, Users, CalendarDays, Video, type LucideIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

type NotifType = "match" | "player" | "schedule" | "analysis";

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  description: string;
  date: Date;
  read: boolean;
}

const iconMap: Record<NotifType, LucideIcon> = {
  match: Trophy,
  player: Users,
  schedule: CalendarDays,
  analysis: Video,
};

const seed: Notification[] = [
  {
    id: "n1",
    type: "match",
    title: "Match report ready",
    description: "Touchline FC vs. Northside — full analytics generated.",
    date: new Date(Date.now() - 1000 * 60 * 12),
    read: false,
  },
  {
    id: "n2",
    type: "player",
    title: "New player joined",
    description: "Marcus Chen accepted your invitation to U21 squad.",
    date: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: false,
  },
  {
    id: "n3",
    type: "analysis",
    title: "Video analysis complete",
    description: "Tactical breakdown for Friday's training is ready to review.",
    date: new Date(Date.now() - 1000 * 60 * 60 * 6),
    read: false,
  },
  {
    id: "n4",
    type: "schedule",
    title: "Upcoming session",
    description: "Recovery training scheduled tomorrow at 9:00 AM.",
    date: new Date(Date.now() - 1000 * 60 * 60 * 26),
    read: true,
  },
  {
    id: "n5",
    type: "match",
    title: "Lineup confirmed",
    description: "Coach Alvarez confirmed the starting XI for Saturday.",
    date: new Date(Date.now() - 1000 * 60 * 60 * 52),
    read: true,
  },
];

const NotificationsBell: React.FC = () => {
  const [items, setItems] = React.useState<Notification[]>(seed);
  const unread = items.filter((n) => !n.read).length;

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  const toggleRead = (id: string) =>
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));
  const remove = (id: string) => setItems((prev) => prev.filter((n) => n.id !== id));
  const clearAll = () => setItems([]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary"
        >
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unread > 0 ? `${unread} unread` : "You're all caught up"}
            </p>
          </div>
          <button
            type="button"
            onClick={markAllRead}
            disabled={unread === 0}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-40"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        </div>

        <ScrollArea className="max-h-[360px]">
          {items.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Bell size={28} className="mx-auto text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium text-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground">New activity will appear here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const Icon = iconMap[n.type];
                return (
                  <li
                    key={n.id}
                    className={`group relative flex gap-3 px-4 py-3 transition-colors hover:bg-secondary/60 ${
                      !n.read ? "bg-primary/[0.04]" : ""
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        !n.read ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{n.title}</p>
                        {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{n.description}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {formatDistanceToNow(n.date, { addSuffix: true })}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => toggleRead(n.id)}
                            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-background hover:text-foreground"
                          >
                            <Check size={11} />
                            {n.read ? "Unread" : "Read"}
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(n.id)}
                            aria-label="Dismiss"
                            className="inline-flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-destructive"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        <div className="flex items-center justify-between border-t border-border px-4 py-2">
          <button
            type="button"
            onClick={clearAll}
            disabled={items.length === 0}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-destructive disabled:pointer-events-none disabled:opacity-40"
          >
            Clear all
          </button>
          <span className="text-[10px] text-muted-foreground">Test data</span>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsBell;

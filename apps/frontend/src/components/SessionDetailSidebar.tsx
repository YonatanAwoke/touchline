import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  X, Clock, MapPin, Users, Plus, Pencil, Trash2, Video, ExternalLink 
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface SessionDetailSidebarProps {
  selectedEvent: any;
  setSelectedEvent: (event: any) => void;
  sessionDetail: any;
  isLoadingDetail: boolean;
  localAttendance: Record<number, string>;
  setLocalAttendance: (attendance: Record<number, string>) => void;
  updateAttendanceMutation: any;
  allPlayers: any[];
  addParticipantMutation: any;
  removeParticipantMutation: any;
  todosQuery: any;
  newTodoText: string;
  setNewTodoText: (text: string) => void;
  createTodoMutation: any;
  toggleTodoMutation: any;
  deleteTodoMutation: any;
  updateTodoMutation: any;
  editingTodoId: number | null;
  setEditingTodoId: (id: number | null) => void;
  editingTodoText: string;
  setEditingTodoText: (text: string) => void;
  setShowAddEvent: (show: boolean) => void;
  setIsRescheduling: (reschedule: boolean) => void;
  setNewEvent: (event: any) => void;
  categoryConfig: any;
}

const SessionDetailSidebar: React.FC<SessionDetailSidebarProps> = ({
  selectedEvent,
  setSelectedEvent,
  sessionDetail,
  isLoadingDetail,
  localAttendance,
  setLocalAttendance,
  updateAttendanceMutation,
  allPlayers,
  addParticipantMutation,
  removeParticipantMutation,
  todosQuery,
  newTodoText,
  setNewTodoText,
  createTodoMutation,
  toggleTodoMutation,
  deleteTodoMutation,
  updateTodoMutation,
  editingTodoId,
  setEditingTodoId,
  editingTodoText,
  setEditingTodoText,
  setShowAddEvent,
  setIsRescheduling,
  setNewEvent,
  categoryConfig,
}) => {
  if (!selectedEvent) return null;
  const navigate = useNavigate();

  const idStr = String(selectedEvent.id);
  const isMatch = idStr.startsWith("match");
  const sessionNumId = !isMatch ? Number(idStr.split("-")[1]) : null;

  const { data: sessionVideos } = useQuery({
    queryKey: ["videos", "session", sessionNumId],
    queryFn: async () => {
      const res = await fetch(`/api/videos?sessionId=${sessionNumId}&limit=5`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load videos");
      return res.json();
    },
    enabled: !!sessionNumId,
  });

  const videos = sessionVideos?.items ?? [];

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">Event Details</CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedEvent(null)}>
            <X size={16} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-foreground">{selectedEvent.title}</h3>
              <Badge className={`border-0 ${categoryConfig[selectedEvent.category].className}`}>
                {categoryConfig[selectedEvent.category].label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Clock size={16} className="text-primary" />
              <span>{selectedEvent.time} {selectedEvent.endTime ? ` – ${selectedEvent.endTime}` : ""}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <MapPin size={16} className="text-primary" />
              <span>{selectedEvent.location || "No location set"}</span>
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 gap-2"
              onClick={() => {
                setNewEvent({
                  title: isMatch ? "" : selectedEvent.title,
                  date: selectedEvent.date.toISOString().split("T")[0],
                  startTime: selectedEvent.time,
                  endTime: selectedEvent.endTime || "",
                  location: selectedEvent.location || "",
                  category: selectedEvent.category,
                  teamId: selectedEvent.teamId ? String(selectedEvent.teamId) : "",
                  coachId: selectedEvent.coachId ? String(selectedEvent.coachId) : "",
                  opponent: selectedEvent.opponent || "",
                  type: selectedEvent.type || "TECHNICAL",
                });
                setIsRescheduling(true);
                setShowAddEvent(true);
              }}
            >
              <Pencil size={14} /> Reschedule
            </Button>
          </div>
        </CardContent>
      </Card>

      {!isMatch && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Attendance
              {sessionDetail?.participants?.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[10px] px-2 text-primary hover:text-primary hover:bg-primary/5"
                  onClick={() => {
                    const attendance = Object.entries(localAttendance).map(([playerId, status]) => ({
                      playerId: Number(playerId),
                      status
                    }));
                    updateAttendanceMutation.mutate({ sessionId: sessionDetail.id, attendance });
                  }}
                  disabled={updateAttendanceMutation.isPending}
                >
                  {updateAttendanceMutation.isPending ? "Saving..." : "Save All"}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingDetail ? (
              <p className="text-center py-4 text-xs text-muted-foreground italic">Loading roster...</p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  {sessionDetail?.participants?.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Users size={14} className="text-muted-foreground shrink-0" />
                        <span className="text-sm truncate text-foreground">{p.player?.user?.username || `Player #${p.playerId}`}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <select
                          value={localAttendance[p.playerId] || p.attendanceStatus}
                          onChange={(e) => setLocalAttendance({ ...localAttendance, [p.playerId]: e.target.value })}
                          className={`text-[10px] h-6 rounded border bg-background px-1.5 font-medium transition-colors outline-none
                            ${(localAttendance[p.playerId] || p.attendanceStatus) === "PRESENT" ? "border-primary/20 text-primary bg-primary/5" : ""}
                            ${(localAttendance[p.playerId] || p.attendanceStatus) === "ABSENT" ? "border-destructive/20 text-destructive bg-destructive/5" : ""}
                            ${(localAttendance[p.playerId] || p.attendanceStatus) === "EXCUSED" ? "border-muted-foreground/20 text-muted-foreground bg-muted-foreground/5" : ""}
                            ${(localAttendance[p.playerId] || p.attendanceStatus) === "PENDING" ? "border-border text-muted-foreground" : ""}
                          `}
                        >
                          <option value="PRESENT">Present</option>
                          <option value="ABSENT">Absent</option>
                          <option value="EXCUSED">Excused</option>
                          <option value="PENDING">Pending</option>
                        </select>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeParticipantMutation.mutate({ sessionId: sessionDetail.id, playerId: p.playerId })}
                        >
                          <X size={12} />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!sessionDetail?.participants?.length && (
                    <p className="text-center py-4 text-xs text-muted-foreground italic">No participants yet</p>
                  )}
                </div>

                <div className="pt-2 border-t border-border">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full text-xs gap-2 h-8">
                        <Plus size={14} /> Add Player Manually
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[240px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search player..." />
                        <CommandList>
                          <CommandEmpty>No player found.</CommandEmpty>
                          <CommandGroup>
                            {allPlayers.length === 0 && (
                              <div className="p-4 text-center text-xs text-muted-foreground italic">No players found in club.</div>
                            )}
                            {allPlayers
                              .filter((ap: any) => !sessionDetail?.participants?.some((p: any) => p.playerId === ap.id))
                              .map((player: any) => (
                                <CommandItem
                                  key={player.id}
                                  onSelect={() => {
                                    addParticipantMutation.mutate({ sessionId: sessionDetail.id, playerId: player.id });
                                  }}
                                >
                                  {player.user?.username || `Player #${player.id}`}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-border">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Session Tasks</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                <Plus size={16} />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Session Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Task Title</Label>
                  <Input 
                    placeholder="e.g. Set up cones" 
                    value={newTodoText}
                    onChange={(e) => setNewTodoText(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={() => {
                    const idNum = Number(idStr.split("-")[1]);
                    createTodoMutation.mutate({ 
                      text: newTodoText,
                      matchId: isMatch ? idNum : undefined,
                      sessionId: !isMatch ? idNum : undefined
                    });
                  }} 
                  disabled={createTodoMutation.isPending || !newTodoText.trim()}
                >
                  Add Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
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

      {/* Videos Panel — session only */}
      {!isMatch && (
        <Card className="border-border">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <Video size={14} className="text-primary" /> Videos
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] px-2 gap-1 text-primary hover:text-primary"
              onClick={() => navigate("/dashboard/analysis")}
            >
              <ExternalLink size={11} /> All Videos
            </Button>
          </CardHeader>
          <CardContent>
            {videos.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4 italic">No videos for this session yet.</p>
            ) : (
              <div className="space-y-2">
                {videos.map((v: any) => (
                  <div key={v.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                    <div className="flex h-7 w-7 items-center justify-center rounded bg-secondary shrink-0">
                      <Video size={12} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{v.originalName || `Video #${v.id}`}</p>
                      <p className="text-[10px] text-muted-foreground">{v.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SessionDetailSidebar;

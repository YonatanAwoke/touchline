import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trophy, Dumbbell, CalendarDays, MapPin, Clock, MoreHorizontal, Trash2, User, Trash } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const resultBadgeClass: Record<string, string> = {
  Win: "bg-primary/10 text-primary border-0",
  Draw: "bg-secondary text-muted-foreground border-0",
  Loss: "bg-destructive/10 text-destructive border-0",
  Upcoming: "bg-accent text-accent-foreground border-0",
};

const statusBadgeClass: Record<string, string> = {
  PLANNED: "bg-accent text-accent-foreground border-0",
  ONGOING: "bg-blue-500/10 text-blue-500 border-0",
  COMPLETED: "bg-primary/10 text-primary border-0",
  CANCELLED: "bg-destructive/10 text-destructive border-0",
};

const MatchesTraining = () => {
  const [showCreateMatch, setShowCreateMatch] = useState(false);
  const [showCreateTraining, setShowCreateTraining] = useState(false);
  const [editingMatch, setEditingMatch] = useState<any>(null);
  const [editingSession, setEditingSession] = useState<any>(null);

  const [newMatch, setNewMatch] = useState({ opponent: "", date: "", location: "", teamId: "", competition: "" });
  const [newTraining, setNewTraining] = useState({ title: "", date: "", duration: "", type: "TECHNICAL", teamId: "", coachId: "" });
  
  const [selectedMatchForResult, setSelectedMatchForResult] = useState<any>(null);
  const [matchResultForm, setMatchResultForm] = useState<{
    homeScore: number;
    awayScore: number;
    details: string;
    scorers: Array<{ playerId?: number; playerName?: string; minute: string; isHomeTeam: boolean; goalCount: number }>;
  }>({ homeScore: 0, awayScore: 0, details: "", scorers: [] });
  const [selectedMatchForDetail, setSelectedMatchForDetail] = useState<any>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch Teams for selection
  const { data: teamsData } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await fetch("/api/teams", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load teams");
      return res.json();
    }
  });
  const teams = teamsData?.items ?? [];

  // Fetch Matches
  const { data: matchesData, isLoading: isLoadingMatches } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const res = await fetch("/api/matches", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) toast({ title: "Session Expired", description: "Please log in again.", variant: "destructive" });
        throw new Error("Failed to load matches");
      }
      return res.json();
    }
  });
  const matches = matchesData?.items ?? [];

  const { data: sessionsData, isLoading: isLoadingSessions } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const res = await fetch("/api/sessions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load sessions");
      return res.json();
    }
  });
  const sessions = sessionsData?.items ?? [];
  
  // Fetch Coaches
  const { data: coaches = [] } = useQuery({
    queryKey: ["coaches"],
    queryFn: async () => {
      const res = await fetch("/api/coaches", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load coaches");
      return res.json();
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
      setShowCreateMatch(false);
      setNewMatch({ opponent: "", date: "", location: "", teamId: "", competition: "" });
      toast({ title: "Match created successfully" });
    },
    onError: (err: any) => toast({ title: "Error creating match", description: err.message, variant: "destructive" })
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
      setEditingMatch(null);
      toast({ title: "Match updated successfully" });
    },
    onError: (err: any) => toast({ title: "Error updating match", description: err.message, variant: "destructive" })
  });

  const deleteMatchMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/matches/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete match");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast({ title: "Match deleted" });
    }
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
      setShowCreateTraining(false);
      setNewTraining({ title: "", date: "", duration: "", type: "TECHNICAL", teamId: "", coachId: "" });
      toast({ title: "Training session created" });
    },
    onError: (err: any) => toast({ title: "Error creating session", description: err.message, variant: "destructive" })
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
      setEditingSession(null);
      toast({ title: "Training session updated" });
    },
    onError: (err: any) => toast({ title: "Error updating session", description: err.message, variant: "destructive" })
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to cancel session");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast({ title: "Session cancelled" });
    }
  });

  const handleCreateOrUpdateMatch = () => {
    const payload = {
      teamId: Number(newMatch.teamId),
      opponent: newMatch.opponent,
      matchDate: new Date(newMatch.date).toISOString(),
      venue: newMatch.location,
      competition: newMatch.competition || undefined,
    };

    if (editingMatch) {
      updateMatchMutation.mutate({ id: editingMatch.id, payload });
    } else {
      if (!newMatch.teamId) return toast({ title: "Please select a team", variant: "destructive" });
      createMatchMutation.mutate(payload);
    }
  };

  const handleCreateOrUpdateSession = () => {
    const selectedTeam = teams.find((t: any) => t.id === Number(newTraining.teamId));
    const payload = {
      title: newTraining.title,
      date: new Date(newTraining.date).toISOString(),
      organizationId: selectedTeam?.organizationId ?? teams[0]?.organizationId,
      teamId: selectedTeam?.id,
      coachId: Number(newTraining.coachId) || selectedTeam?.coachId,
      type: newTraining.type,
      duration: Number(newTraining.duration),
    };

    if (editingSession) {
      updateSessionMutation.mutate({ id: editingSession.id, payload });
    } else {
      if (!newTraining.teamId) return toast({ title: "Please select a team", variant: "destructive" });
      createSessionMutation.mutate(payload);
    }
  };

  const getMatchResult = (match: any) => {
    if (!match.result) return "Upcoming";
    const { homeScore, awayScore } = match.result;
    if (homeScore > awayScore) return "Win";
    if (homeScore < awayScore) return "Loss";
    return "Draw";
  };

  const startEditingMatch = (match: any) => {
    setEditingMatch(match);
    setNewMatch({
      opponent: match.opponent,
      date: new Date(match.matchDate).toISOString().slice(0, 16),
      location: match.venue || "",
      teamId: String(match.teamId),
      competition: match.competition || "",
    });
  };

  const startEditingSession = (session: any) => {
    setEditingSession(session);
    setNewTraining({
      title: session.title,
      date: new Date(session.date).toISOString().slice(0, 16),
      duration: String(session.duration),
      type: session.type,
      teamId: String(session.teamId),
      coachId: String(session.coachId),
    });
  };

  const handleUpdateMatchResult = () => {
    if (!selectedMatchForResult) return;
    updateMatchMutation.mutate({
      id: selectedMatchForResult.id,
      payload: {
        result: {
          homeScore: matchResultForm.homeScore,
          awayScore: matchResultForm.awayScore,
          details: matchResultForm.details,
          scorers: matchResultForm.scorers.map(s => ({
            playerId: s.playerId ? Number(s.playerId) : null,
            playerName: s.playerName || null,
            minute: s.minute,
            isHomeTeam: s.isHomeTeam,
            goalCount: Number(s.goalCount) || 1
          })),
        }
      }
    });
    setSelectedMatchForResult(null);
  };

  const handleUpdateSessionStatus = (status: string, sessionId: number) => {
    updateSessionMutation.mutate({ id: sessionId, payload: { status } });
  };

  return (
    <DashboardLayout title="Matches & Training" subtitle="Manage your matches and training sessions">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Matches Table */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-2">
              <Trophy size={20} className="text-primary" />
              <CardTitle className="text-lg text-foreground">Matches</CardTitle>
            </div>
            <Button size="sm" className="gap-2" onClick={() => setShowCreateMatch(true)}>
              <Plus size={14} /> Create Match
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Opponent</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map((match: any) => (
                  <TableRow 
                    key={match.id} 
                    className="transition-colors hover:bg-secondary/50 cursor-pointer"
                    onClick={() => setSelectedMatchForDetail(match)}
                  >
                    <TableCell className="font-medium text-foreground">{match.team?.name || match.teamId}</TableCell>
                    <TableCell className="text-foreground">{match.opponent}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(match.matchDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin size={14} /> {match.venue || "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={resultBadgeClass[getMatchResult(match)]}>
                        {getMatchResult(match)}{match.result ? ` (${match.result.homeScore}-${match.result.awayScore})` : ""}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal size={14} /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2" onSelect={() => setSelectedMatchForDetail(match)}>
                            <Trophy size={14} /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2" onSelect={() => {
                            setSelectedMatchForResult(match);
                            setMatchResultForm({
                              homeScore: match.result?.homeScore || 0,
                              awayScore: match.result?.awayScore || 0,
                              details: match.result?.details || "",
                              scorers: match.result?.scorers || []
                            });
                          }}>
                            <Plus size={14} /> Input Result
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2" onSelect={() => startEditingMatch(match)}>
                            <CalendarDays size={14} /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive gap-2" onSelect={() => deleteMatchMutation.mutate(match.id)}>
                            <Trash2 size={14} /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoadingMatches && matches.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No matches found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Training Table */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-2">
              <Dumbbell size={20} className="text-primary" />
              <CardTitle className="text-lg text-foreground">Training Sessions</CardTitle>
            </div>
            <Button size="sm" className="gap-2" onClick={() => setShowCreateTraining(true)}>
              <Plus size={14} /> Create Training
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session: any) => (
                  <TableRow key={session.id} className="transition-colors hover:bg-secondary/50">
                    <TableCell className="font-medium text-foreground">{session.team?.name || session.teamId}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{session.title}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{session.type}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(session.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground text-xs">
                        <Clock size={12} /> {session.duration || "—"}m
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusBadgeClass[session.status]}>{session.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal size={14} /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="gap-2">
                              {session.status === 'COMPLETED' ? <Badge variant="outline" className="h-4 px-1 text-[10px]">Done</Badge> : <Clock size={14} />} Change Status
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuRadioGroup value={session.status} onValueChange={(v) => handleUpdateSessionStatus(v, session.id)}>
                                <DropdownMenuRadioItem value="PLANNED">Planned</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="ONGOING">Ongoing</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="COMPLETED">Completed</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="CANCELLED">Cancelled</DropdownMenuRadioItem>
                              </DropdownMenuRadioGroup>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2" onSelect={() => startEditingSession(session)}>
                            <CalendarDays size={14} /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive gap-2" onSelect={() => deleteSessionMutation.mutate(session.id)}>
                            <Trash2 size={14} /> Cancel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoadingSessions && sessions.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No sessions found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Match Dialog (Create/Edit) */}
      <Dialog open={showCreateMatch || !!editingMatch} onOpenChange={(open) => { if (!open) { setShowCreateMatch(false); setEditingMatch(null); setNewMatch({opponent: "", date: "", location: "", teamId: "", competition: ""}); }}}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Trophy size={20} />
              </div>
              <DialogTitle className="text-foreground">{editingMatch ? "Edit Match" : "Create Match"}</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Team</Label>
              <select 
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                value={newMatch.teamId} 
                onChange={(e) => setNewMatch({...newMatch, teamId: e.target.value})}
              >
                <option value="">Select Team</option>
                {teams.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Opponent</Label>
              <Input 
                placeholder="e.g. Bole FC" 
                value={newMatch.opponent}
                onChange={(e) => setNewMatch({...newMatch, opponent: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input 
                  type="datetime-local" 
                  value={newMatch.date}
                  onChange={(e) => setNewMatch({...newMatch, date: e.target.value})}
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input 
                  placeholder="Home / Away" 
                  value={newMatch.location}
                  onChange={(e) => setNewMatch({...newMatch, location: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>Competition Type</Label>
              <select 
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                value={newMatch.competition} 
                onChange={(e) => setNewMatch({...newMatch, competition: e.target.value})}
              >
                <option value="">Select Competition</option>
                <option value="LEAGUE">League</option>
                <option value="CUP">Cup</option>
                <option value="FRIENDLY">Friendly</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => { setShowCreateMatch(false); setEditingMatch(null); }}>Cancel</Button>
              <Button onClick={handleCreateOrUpdateMatch} disabled={createMatchMutation.isPending || updateMatchMutation.isPending}>
                {editingMatch ? "Update Match" : "Create Match"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Training Dialog (Create/Edit) */}
      <Dialog open={showCreateTraining || !!editingSession} onOpenChange={(open) => { if (!open) { setShowCreateTraining(false); setEditingSession(null); setNewTraining({title: "", date: "", duration: "", type: "TECHNICAL", teamId: "", coachId: ""}); }}}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Dumbbell size={20} />
              </div>
              <DialogTitle className="text-foreground">{editingSession ? "Edit Training Session" : "Create Training Session"}</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Team</Label>
              <select 
                className="form-select w-full" 
                value={newTraining.teamId} 
                onChange={(e) => {
                  const tId = e.target.value;
                  const team = teams.find((t: any) => t.id === Number(tId));
                  setNewTraining({
                    ...newTraining, 
                    teamId: tId,
                    coachId: team?.coachId ? String(team.coachId) : ""
                  });
                }}
              >
                <option value="">Select Team</option>
                {teams.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Assigned Coach</Label>
              <select 
                className="form-select w-full" 
                value={newTraining.coachId}
                onChange={(e) => setNewTraining({...newTraining, coachId: e.target.value})}
              >
                <option value="">Select Coach</option>
                {coaches.filter((c: any) => {
                  if (!newTraining.teamId) return true;
                  const selectedTeam = teams.find((t: any) => t.id === Number(newTraining.teamId));
                  return c.id === selectedTeam?.coachId;
                }).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.user.username}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Session Title</Label>
              <Input 
                placeholder="e.g. Tactical Drills" 
                value={newTraining.title}
                onChange={(e) => setNewTraining({...newTraining, title: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input 
                  type="datetime-local" 
                  value={newTraining.date}
                  onChange={(e) => setNewTraining({...newTraining, date: e.target.value})}
                />
              </div>
              <div>
                <Label>Duration (min)</Label>
                <Input 
                  type="number" 
                  placeholder="e.g. 90" 
                  value={newTraining.duration}
                  onChange={(e) => setNewTraining({...newTraining, duration: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>Type</Label>
              <select 
                className="form-select w-full" 
                value={newTraining.type}
                onChange={(e) => setNewTraining({...newTraining, type: e.target.value})}
              >
                <option value="TECHNICAL">Technical</option>
                <option value="TACTICAL">Tactical</option>
                <option value="FITNESS">Fitness</option>
                <option value="RECOVERY">Recovery</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => { setShowCreateTraining(false); setEditingSession(null); }}>Cancel</Button>
              <Button onClick={handleCreateOrUpdateSession} disabled={createSessionMutation.isPending || updateSessionMutation.isPending}>
                {editingSession ? "Update Session" : "Create Session"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Match Result Dialog */}
      <Dialog open={!!selectedMatchForResult} onOpenChange={() => setSelectedMatchForResult(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Input Match Result</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="space-y-2">
                <Label>{selectedMatchForResult?.team?.name || "Home"}</Label>
                <Input 
                  type="number" 
                  value={matchResultForm.homeScore}
                  onChange={(e) => setMatchResultForm({...matchResultForm, homeScore: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label>{selectedMatchForResult?.opponent || "Away"}</Label>
                <Input 
                  type="number" 
                  value={matchResultForm.awayScore}
                  onChange={(e) => setMatchResultForm({...matchResultForm, awayScore: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-secondary/10 p-2 rounded-t-lg">
                <Label className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Scorers</Label>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 text-[10px] gap-1 px-2 border border-border/50 hover:bg-secondary/40"
                  onClick={() => setMatchResultForm({
                    ...matchResultForm, 
                    scorers: [...matchResultForm.scorers, { minute: "", isHomeTeam: true, goalCount: 1 }]
                  })}
                >
                  <Plus size={12} /> Add Scorer
                </Button>
              </div>
              <div className="space-y-2 border border-secondary/20 border-t-0 p-3 rounded-b-lg max-h-[300px] overflow-y-auto bg-secondary/5">
                {matchResultForm.scorers.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-4 italic">No scorers added yet</p>
                )}
                {matchResultForm.scorers.map((scorer, idx) => (
                  <div key={idx} className="flex gap-2 items-end p-2 border border-border/30 rounded-md bg-background shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="w-16">
                      <Label className="text-[10px]">Team</Label>
                      <select 
                        className="w-full rounded-md border border-input bg-background px-1 py-1 text-[11px] h-8 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
                        value={scorer.isHomeTeam ? "H" : "A"}
                        onChange={(e) => {
                          const updated = [...matchResultForm.scorers];
                          updated[idx].isHomeTeam = e.target.value === "H";
                          if (updated[idx].isHomeTeam) {
                             updated[idx].playerName = undefined;
                          } else {
                             updated[idx].playerId = undefined;
                          }
                          setMatchResultForm({...matchResultForm, scorers: updated});
                        }}
                      >
                        <option value="H">Home</option>
                        <option value="A">Away</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <Label className="text-[10px]">Scorer Name</Label>
                      {scorer.isHomeTeam ? (
                        <select 
                          className="w-full rounded-md border border-input bg-background px-2 py-1 text-[11px] h-8 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
                          value={scorer.playerId || ""}
                          onChange={(e) => {
                            const updated = [...matchResultForm.scorers];
                            updated[idx].playerId = Number(e.target.value);
                            setMatchResultForm({...matchResultForm, scorers: updated});
                          }}
                        >
                          <option value="">Select Player</option>
                          {(teams.find((t: any) => t.id === selectedMatchForResult?.teamId)?.players || []).map((p: any) => (
                            <option key={p.id} value={p.id}>{p.user?.username || p.username}</option>
                          ))}
                        </select>
                      ) : (
                        <Input 
                          placeholder="Opponent scorer" 
                          className="text-[11px] h-8"
                          value={scorer.playerName || ""}
                          onChange={(e) => {
                            const updated = [...matchResultForm.scorers];
                            updated[idx].playerName = e.target.value;
                            setMatchResultForm({...matchResultForm, scorers: updated});
                          }}
                        />
                      )}
                    </div>
                    <div className="w-14">
                      <Label className="text-[10px]">Min</Label>
                      <Input 
                        placeholder="75'" 
                        className="text-[11px] h-8 px-2"
                        value={scorer.minute}
                        onChange={(e) => {
                          const updated = [...matchResultForm.scorers];
                          updated[idx].minute = e.target.value;
                          setMatchResultForm({...matchResultForm, scorers: updated});
                        }}
                      />
                    </div>
                    <div className="w-12">
                      <Label className="text-[10px]">Qty</Label>
                      <Input 
                        type="number"
                        className="text-[11px] h-8 px-1"
                        value={scorer.goalCount}
                        onChange={(e) => {
                          const updated = [...matchResultForm.scorers];
                          updated[idx].goalCount = parseInt(e.target.value) || 1;
                          setMatchResultForm({...matchResultForm, scorers: updated});
                        }}
                      />
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        const updated = matchResultForm.scorers.filter((_, i) => i !== idx);
                        setMatchResultForm({...matchResultForm, scorers: updated});
                      }}
                    >
                      <Trash size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border mt-4">
              <Button variant="ghost" className="h-9 px-4" onClick={() => setSelectedMatchForResult(null)}>Cancel</Button>
              <Button className="h-9 px-6 bg-primary" onClick={handleUpdateMatchResult} disabled={updateMatchMutation.isPending}>
                {updateMatchMutation.isPending ? "Saving..." : "Save Result"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Match Detail Dialog */}
      <Dialog open={!!selectedMatchForDetail} onOpenChange={() => setSelectedMatchForDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center pr-6">
              Match Details
              {selectedMatchForDetail && (
                <Badge className={resultBadgeClass[getMatchResult(selectedMatchForDetail)]}>
                  {getMatchResult(selectedMatchForDetail)}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedMatchForDetail && (
            <div className="space-y-6 pt-4">
              <div 
                className="relative overflow-hidden rounded-xl py-10 px-6 text-white shadow-2xl border border-white/10"
                style={{ 
                  backgroundImage: "url('/match-bg.webp')", 
                  backgroundSize: "cover", 
                  backgroundPosition: "center" 
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 to-black/50 backdrop-blur-[2px]" />
                <div className="relative flex justify-center items-center gap-10 z-10">
                  <div className="text-center group">
                    <div className="h-20 w-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-3 border border-white/30 transition-transform group-hover:scale-110 duration-300">
                      <Trophy className="text-primary-foreground drop-shadow-md" size={40} />
                    </div>
                    <p className="font-black text-xl tracking-tight drop-shadow-lg">{selectedMatchForDetail.team?.name}</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-medium">Home</p>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <div className="text-5xl font-black tracking-tighter drop-shadow-2xl filter flex items-baseline gap-2">
                       {selectedMatchForDetail.result ? (
                         <>
                           <span className="text-white">{selectedMatchForDetail.result.homeScore}</span>
                           <span className="text-white/40 text-3xl">-</span>
                           <span className="text-white">{selectedMatchForDetail.result.awayScore}</span>
                         </>
                       ) : (
                         <span className="text-white/90 text-4xl">VS</span>
                       )}
                    </div>
                    {selectedMatchForDetail.competition && (
                      <Badge variant="outline" className="mt-2 bg-white/10 border-white/20 text-white/90 text-[10px] uppercase tracking-wider backdrop-blur-sm px-3">
                        {selectedMatchForDetail.competition}
                      </Badge>
                    )}
                  </div>

                  <div className="text-center group">
                    <div className="h-20 w-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-3 border border-white/30 transition-transform group-hover:scale-110 duration-300 text-2xl font-black drop-shadow-md">
                      {selectedMatchForDetail.opponent.charAt(0)}
                    </div>
                    <p className="font-black text-xl tracking-tight drop-shadow-lg">{selectedMatchForDetail.opponent}</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-medium">Away</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Competition</p>
                  <p className="font-medium">{selectedMatchForDetail.competition || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Venue</p>
                  <p className="font-medium flex items-center gap-1"><MapPin size={14} /> {selectedMatchForDetail.venue || "TBD"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Date & Time</p>
                  <p className="font-medium flex items-center gap-1"><CalendarDays size={14} /> {new Date(selectedMatchForDetail.matchDate).toLocaleString()}</p>
                </div>
                {selectedMatchForDetail.result?.details && (
                  <div className="col-span-2 space-y-1 pt-2 border-t border-border">
                    <p className="text-muted-foreground">Match Summary</p>
                    <p className="italic">{selectedMatchForDetail.result.details}</p>
                  </div>
                )}
                {selectedMatchForDetail.result?.scorers?.length > 0 && (
                  <div className="col-span-2 pt-4 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-3 flex items-center gap-2">
                      <Trophy size={14} className="text-primary" /> Goal Scorers
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Home Team Scorers */}
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold text-muted-foreground uppercase">{selectedMatchForDetail.team.name}</p>
                        {selectedMatchForDetail.result.scorers.filter((s: any) => s.isHomeTeam).map((s: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between bg-primary/5 px-2 py-1.5 rounded-md border border-primary/10">
                            <span className="font-medium">{s.player?.user?.username || s.playerName}</span>
                            <Badge variant="outline" className="text-[10px] h-5 px-1 bg-background">{s.minute}' {s.goalCount > 1 && `(x${s.goalCount})`}</Badge>
                          </div>
                        ))}
                        {selectedMatchForDetail.result.scorers.filter((s: any) => s.isHomeTeam).length === 0 && (
                          <p className="text-xs text-muted-foreground italic">No goals</p>
                        )}
                      </div>
                      {/* Away Team Scorers */}
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold text-muted-foreground uppercase">{selectedMatchForDetail.opponent}</p>
                        {selectedMatchForDetail.result.scorers.filter((s: any) => !s.isHomeTeam).map((s: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between bg-secondary/20 px-2 py-1.5 rounded-md border border-border/50">
                            <span className="font-medium">{s.player?.user?.username || s.playerName}</span>
                            <Badge variant="outline" className="text-[10px] h-5 px-1 bg-background">{s.minute}' {s.goalCount > 1 && `(x${s.goalCount})`}</Badge>
                          </div>
                        ))}
                        {selectedMatchForDetail.result.scorers.filter((s: any) => !s.isHomeTeam).length === 0 && (
                          <p className="text-xs text-muted-foreground italic">No goals</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end pt-4 border-t border-border">
                <Button onClick={() => setSelectedMatchForDetail(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default MatchesTraining;

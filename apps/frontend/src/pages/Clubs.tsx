import React, { useState, useMemo } from "react";
import { RippleLoader } from "@/components/ui/ripple-loader";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Users,
  UserCircle,
  Mail,
  GraduationCap,
  CalendarDays,
  Plus,
  X,
  MoreHorizontal,
  LayoutGrid,
  Eye,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import FormationDesigner, { FormationDesignerHandle } from "@/components/FormationDesigner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import EditClubForm from "@/components/EditClubForm";

const statCards = [
  { label: "Total Clubs", value: 0, icon: Shield },
  { label: "Total Players", value: 0, icon: Users },
];

type ClubType = any;

const Clubs: React.FC = () => {
  const [selectedClub, setSelectedClub] = useState<ClubType | null>(null);
  const [editingClub, setEditingClub] = useState<ClubType | null>(null);
  const [confirmDeleteClub, setConfirmDeleteClub] = useState<ClubType | null>(null);
  const [showFormationDialog, setShowFormationDialog] = useState(false);
  const [formationName, setFormationName] = useState("");
  const [formationClubId, setFormationClubId] = useState("");
  const [formationCreated, setFormationCreated] = useState(false);
  const [viewingFormationsClub, setViewingFormationsClub] = useState<ClubType | null>(null);
  const [selectedFormationId, setSelectedFormationId] = useState<string | null>(null);
  const [confirmDeleteFormation, setConfirmDeleteFormation] = useState<any | null>(null);
  const formationRef = React.useRef<FormationDesignerHandle>(null);
  const editFormationRef = React.useRef<FormationDesignerHandle>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["teams"], queryFn: async () => {
      const res = await fetch("/api/teams?limit=100", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load teams");
      return res.json();
    }
  });

  const teams = data?.items ?? [];

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/teams/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Delete failed");
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast({ title: "Team deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete team", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch(`/api/teams/${body.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast({ title: "Team updated" });
    },
    onError: () => {
      toast({ title: "Failed to update team", variant: "destructive" });
    }
  });

  const { data: formationsData, isLoading: isLoadingFormations } = useQuery({
    queryKey: ["formations", viewingFormationsClub?.id],
    queryFn: async () => {
      if (!viewingFormationsClub) return [];
      const res = await fetch(`/api/formations?teamId=${viewingFormationsClub.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load formations");
      return res.json();
    },
    enabled: !!viewingFormationsClub,
  });

  const formations = formationsData ?? [];
  const currentFormation = selectedFormationId
    ? formations.find((f: any) => String(f.id) === String(selectedFormationId))
    : formations.find((f: any) => f.isActive) || formations[0];

  const saveFormationMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/formations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save formation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formations"] });
      toast({ title: "Formation saved successfully" });
      setShowFormationDialog(false);
      setFormationCreated(false);
    },
    onError: (err: any) => {
      toast({ title: "Error saving formation", description: err.message, variant: "destructive" });
    }
  });

  const updateFormationMutation = useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const res = await fetch(`/api/formations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update formation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formations"] });
      toast({ title: "Formation updated" });
    },
  });

  const handleCreateFormation = () => {
    if (!formationRef.current) return;
    const data = formationRef.current.getFormationData();
    saveFormationMutation.mutate({
      name: formationName,
      teamId: Number(formationClubId),
      template: data.template,
      positions: data.positions,
    });
  };

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" | null }>({
    key: "id",
    direction: "asc",
  });

  const sortedTeams = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return teams;

    return [...teams].sort((a: any, b: any) => {
      let aValue: any;
      let bValue: any;

      if (sortConfig.key === "coach") {
        aValue = a.coach?.user?.username || "";
        bValue = b.coach?.user?.username || "";
      } else if (sortConfig.key === "players") {
        aValue = a.players?.length || 0;
        bValue = b.players?.length || 0;
      } else {
        aValue = a[sortConfig.key];
        bValue = b[sortConfig.key];
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [teams, sortConfig]);

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" | null = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = null;
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return null;
    return sortConfig.direction === "asc" ? (
      <ChevronUp size={14} className="ml-1 inline" />
    ) : (
      <ChevronDown size={14} className="ml-1 inline" />
    );
  };

  const navigate = useNavigate();

  return (
    <DashboardLayout title="Clubs" subtitle="Manage your clubs and teams">
      {/* Top action */}
      <div className="flex justify-end gap-3 mb-6">
        <Button variant="outline" className="gap-2" onClick={() => { setShowFormationDialog(true); setFormationCreated(false); setFormationName(""); setFormationClubId(""); }}>
          <LayoutGrid size={16} /> Create Formation
        </Button>
        <Button className="gap-2" onClick={() => navigate("/dashboard/create-club")}>
          <Plus size={16} /> Create Club
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, idx) => (
          <Card key={stat.label} className="border-border">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <stat.icon size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground">
                  {idx === 0 ? teams.length : stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Clubs Table */}
      <Card className="mt-6 border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">All Clubs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 cursor-pointer hover:text-primary" onClick={() => handleSort("id")}>
                  ID <SortIcon column="id" />
                </TableHead>
                <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort("name")}>
                  Name <SortIcon column="name" />
                </TableHead>
                <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort("coach")}>
                  Coach <SortIcon column="coach" />
                </TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort("players")}>
                  Players <SortIcon column="players" />
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isLoading ? [] : sortedTeams).map((club: any) => (
                <TableRow key={club.id} className="transition-colors hover:bg-secondary/50">
                  <TableCell className="font-medium text-muted-foreground">{club.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {club.name.split(" ").map((w: string) => w[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">{club.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <UserCircle size={16} className="text-muted-foreground" />
                      <span className="text-foreground">{club.coach?.user?.username ?? "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{club.coach?.user?.email ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{club.players?.length ?? 0} players</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-primary/10 text-primary border-0">Active</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onSelect={(e) => setEditingClub(club)}>Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={(e) => {
                            setViewingFormationsClub(club);
                            setSelectedFormationId(null);
                          }}>
                            View Formation
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => navigate(`/dashboard/tactical-board?clubId=${club.id}`)}>
                            Tactical Board
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={(e) => setConfirmDeleteClub(club)}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Club Detail Dialog */}
      <Dialog open={!!selectedClub} onOpenChange={(open) => !open && setSelectedClub(null)}>
        <DialogContent className="sm:max-w-lg animate-scale-in">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Shield size={24} />
              </div>
              <div>
                <DialogTitle className="text-xl text-foreground">{selectedClub?.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">Club Details</p>
              </div>
            </div>
          </DialogHeader>
          {selectedClub && (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">
                      <div className="flex items-center gap-2"><Shield size={16} /> Club Name</div>
                    </td>
                    <td className="py-3 text-foreground">{selectedClub.name}</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">
                      <div className="flex items-center gap-2"><UserCircle size={16} /> Coach</div>
                    </td>
                    <td className="py-3 text-foreground">{selectedClub.coach?.user.username}</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">
                      <div className="flex items-center gap-2"><Mail size={16} /> Coach Email</div>
                    </td>
                    <td className="py-3 text-foreground">{selectedClub.coach?.user.email}</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">
                      <div className="flex items-center gap-2"><GraduationCap size={16} /> Role</div>
                    </td>
                    <td className="py-3">
                      <Badge variant="secondary">{selectedClub.coach?.user.role}</Badge>
                    </td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">
                      <div className="flex items-center gap-2"><Users size={16} /> Players</div>
                    </td>
                    <td className="py-3 text-foreground">
                      {selectedClub.players?.length > 0
                         ? `${selectedClub.players.length} player(s)`
                         : <span className="italic text-muted-foreground">No players yet</span>
                      }
                    </td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">
                      <div className="flex items-center gap-2"><CalendarDays size={16} /> Created</div>
                    </td>
                    <td className="py-3 text-foreground">
                      {new Date(selectedClub.coach?.createdAt || selectedClub.createdAt).toLocaleDateString("en-US", {
                        year: "numeric", month: "long", day: "numeric",
                      })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Club Dialog */}
      <Dialog open={!!editingClub} onOpenChange={(open) => !open && setEditingClub(null)}>
        <DialogContent className="sm:max-max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Club</DialogTitle>
          </DialogHeader>
          {editingClub && (
            <EditClubForm
              clubId={editingClub.id}
              onCancel={() => setEditingClub(null)}
              onSave={async (payload) => {
                await updateMutation.mutateAsync(payload);
                setEditingClub(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDeleteClub} onOpenChange={(open) => !open && setConfirmDeleteClub(null)}>
        <DialogContent className="sm:max-w-lg animate-scale-in">
          <DialogHeader>
            <DialogTitle>Delete Club</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">This will remove the club. Players' team associations will be nulled. Are you sure?</p>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setConfirmDeleteClub(null)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              if (!confirmDeleteClub) return;
              await deleteMutation.mutateAsync(confirmDeleteClub.id);
              setConfirmDeleteClub(null);
            }}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Formation Dialog */}
      <Dialog open={showFormationDialog} onOpenChange={(open) => { if (!open) setShowFormationDialog(false); }}>
        <DialogContent className="sm:max-w-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LayoutGrid size={20} />
              </div>
              <DialogTitle className="text-xl text-foreground">Create Formation</DialogTitle>
            </div>
          </DialogHeader>

          {!formationCreated ? (
            <div className="space-y-4 mt-2">
              <div>
                <Label>Formation Name</Label>
                <Input
                  placeholder="e.g. Main Match Formation"
                  value={formationName}
                  onChange={(e) => setFormationName(e.target.value)}
                />
              </div>
              <div>
                <Label>Select Club</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={formationClubId}
                  onChange={(e) => setFormationClubId(e.target.value)}
                >
                  <option value="">Choose a club…</option>
                  {teams.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowFormationDialog(false)}>Cancel</Button>
                <Button
                  disabled={!formationName.trim() || !formationClubId}
                  onClick={() => setFormationCreated(true)}
                >
                  Continue
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{formationName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {teams.find((t: any) => String(t.id) === String(formationClubId))?.name ?? "Club"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={saveFormationMutation.isPending}
                  onClick={handleCreateFormation}
                >
                  {saveFormationMutation.isPending ? "Saving..." : "Save Formation"}
                </Button>
              </div>
              <FormationDesigner
                ref={formationRef}
                players={
                  (teams.find((t: any) => String(t.id) === String(formationClubId))?.players ?? []).map((p: any) => ({
                    id: p.id,
                    name: p.user?.username ?? p.name ?? `Player ${p.id}`,
                    jerseyNumber: p.jerseyNumber ?? p.jersey_number,
                    position: p.position,
                  }))
                }
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Formation Dialog */}
      <Dialog open={!!viewingFormationsClub} onOpenChange={(open) => !open && setViewingFormationsClub(null)}>
        <DialogContent className="sm:max-w-4xl animate-scale-in max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <LayoutGrid size={20} />
                </div>
                <div>
                  <DialogTitle className="text-xl text-foreground">
                    {viewingFormationsClub?.name} Formations
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground">Tactical layout and player assignments</p>
                </div>
              </div>
              {formations.length > 0 && (
                <div className="flex items-center gap-3">
                  <Label className="text-sm font-medium">Select Formation:</Label>
                  <select
                    className="flex h-9 w-48 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={selectedFormationId || currentFormation?.id || ""}
                    onChange={(e) => setSelectedFormationId(e.target.value)}
                  >
                    {formations.map((f: any) => (
                      <option key={f.id} value={f.id}>
                        {f.name} {f.isActive ? "(Active)" : ""}
                      </option>
                    ))}
                  </select>
                  {!currentFormation?.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateFormationMutation.mutate({ id: currentFormation.id, isActive: true })}
                      disabled={updateFormationMutation.isPending && updateFormationMutation.variables?.isActive}
                    >
                      Set as Active
                    </Button>
                  )}
                  {currentFormation && (
                    <Button
                      size="sm"
                      disabled={updateFormationMutation.isPending && !updateFormationMutation.variables?.isActive}
                      onClick={() => {
                        if (!editFormationRef.current) return;
                        const data = editFormationRef.current.getFormationData();
                        const inputEl = document.getElementById("edit-formation-name") as HTMLInputElement;
                        updateFormationMutation.mutate({
                          id: currentFormation.id,
                          name: inputEl ? inputEl.value : currentFormation.name,
                          template: data.template,
                          positions: data.positions
                        });
                      }}
                    >
                      {updateFormationMutation.isPending && !updateFormationMutation.variables?.isActive ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>

          {isLoadingFormations ? (
            <div className="flex items-center justify-center h-64">
              <RippleLoader label="Loading formations..." />
            </div>
          ) : formations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl border-border">
              <LayoutGrid size={48} className="text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground mb-4 text-center">No formations created for this club yet.</p>
              <Button onClick={() => {
                setViewingFormationsClub(null);
                setShowFormationDialog(true);
                setFormationClubId(String(viewingFormationsClub?.id));
                setFormationCreated(false);
              }}>
                <Plus size={16} className="mr-2" /> Create First Formation
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
              <div className="lg:col-span-2">
                <FormationDesigner
                  ref={editFormationRef}
                  key={currentFormation?.id}
                  initialData={{
                    name: currentFormation?.template || "4-4-2",
                    positions: currentFormation?.positions || []
                  }}
                  players={
                    (viewingFormationsClub?.players ?? []).map((p: any) => ({
                      id: p.id,
                      name: p.user?.username ?? p.name ?? `Player ${p.id}`,
                      jerseyNumber: p.jerseyNumber ?? p.jersey_number,
                      position: p.position,
                    }))
                  }
                />
              </div>
              <div className="space-y-4">
                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm font-semibold">Formation Info</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="flex flex-col gap-1 text-sm mt-2">
                      <span className="text-muted-foreground">Name:</span>
                      <Input
                        key={currentFormation?.id}
                        id="edit-formation-name"
                        defaultValue={currentFormation?.name}
                        className="h-8"
                      />
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-muted-foreground">Template:</span>
                      <Badge variant="secondary">{currentFormation?.template}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className={currentFormation?.isActive ? "bg-primary/10 text-primary" : "bg-muted"}>
                        {currentFormation?.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Players:</span>
                      <span className="font-medium">
                        {currentFormation?.positions?.filter((p: any) => p.playerId).length} / {currentFormation?.positions?.length}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" className="w-full justify-start hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => {
                    setConfirmDeleteFormation(currentFormation);
                  }}>
                    <X size={16} className="mr-2 text-destructive" /> Delete Formation
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Formation Delete Confirmation */}
      <AlertDialog 
        open={!!confirmDeleteFormation} 
        onOpenChange={(open) => !open && setConfirmDeleteFormation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this formation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the formation
              "{confirmDeleteFormation?.name}" and all its player assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!confirmDeleteFormation) return;
                const id = confirmDeleteFormation.id;
                try {
                  const res = await fetch(`/api/formations/${id}`, { method: "DELETE", credentials: "include" });
                  if (!res.ok) throw new Error("Delete failed");
                  queryClient.invalidateQueries({ queryKey: ["formations"] });
                  toast({ title: "Formation deleted" });
                  setSelectedFormationId(null);
                  setConfirmDeleteFormation(null);
                } catch (err: any) {
                  toast({ title: "Error deleting formation", description: err.message, variant: "destructive" });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Clubs;

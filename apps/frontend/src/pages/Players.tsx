import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MoreHorizontal, Users, User, UserCircle, CalendarDays, Plus } from "lucide-react";
import EditPlayerForm from "@/components/EditPlayerForm";

// API Fetchers
async function fetchPlayers(): Promise<{ items: any[]; total: number }> {
  const res = await fetch("/api/players?limit=100", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch players");
  return res.json();
}

async function fetchTeams(): Promise<{ items: any[]; total: number }> {
  const res = await fetch("/api/teams?limit=200", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch teams");
  return res.json();
}

const Players: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Queries
  const { data, isLoading } = useQuery({ queryKey: ["players"], queryFn: fetchPlayers, staleTime: 1000 * 30 });
  const { data: teamsData } = useQuery({ queryKey: ["teams"], queryFn: fetchTeams });
  
  const players = data?.items ?? [];
  const teams = teamsData?.items ?? [];

  // State
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<any | null>(null);
  const [confirmDeletePlayer, setConfirmDeletePlayer] = useState<any | null>(null);

  const statCards = [
    { label: "Total Players", value: players.length, icon: Users },
    { label: "Total Clubs", value: teams.length, icon: User },
    { label: "Active Players", value: players.filter((p: any) => p.isActive).length, icon: CalendarDays },
  ];

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/players/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast({ title: "Player deleted" });
    },
    onError: () => toast({ title: "Failed to delete player", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch(`/api/players/${body.id}`, { 
        method: "PATCH", 
        credentials: "include", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(body) 
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast({ title: "Player updated" });
    },
    onError: () => toast({ title: "Failed to update player", variant: "destructive" }),
  });

  return (
    <DashboardLayout title="Players" subtitle="Manage your players and profiles">
      {/* Action Header */}
      <div className="flex justify-end mb-6">
        <Button className="gap-2" onClick={() => navigate("/dashboard/create-player")}>
          <Plus size={16} /> Create Player
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-border">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <stat.icon size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Table */}
      <Card className="mt-6 border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">All Players</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Club</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Nationality</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow>
              ) : (
                players.map((p: any) => (
                  <TableRow 
                    key={p.id} 
                    className="cursor-pointer transition-colors hover:bg-secondary/50"
                    onClick={() => setSelectedPlayer(p)}
                  >
                    <TableCell className="font-medium text-muted-foreground">{p.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {p.firstName ? p.firstName[0] : "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">{p.firstName} {p.lastName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{p.team?.name ?? "—"}</TableCell>
                    <TableCell>{p.position}</TableCell>
                    <TableCell>{p.nationality || "—"}</TableCell>
                    <TableCell>
                      <Badge className={`border-0 ${p.isActive ? "bg-primary/10 text-primary" : "bg-muted-foreground/10 text-muted-foreground"}`}>
                        {p.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingPlayer(p); }}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive" 
                            onClick={(e) => { e.stopPropagation(); setConfirmDeletePlayer(p); }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedPlayer} onOpenChange={(open) => !open && setSelectedPlayer(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <UserCircle size={24} className="text-primary" />
              <DialogTitle>{selectedPlayer?.firstName} {selectedPlayer?.lastName}</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-2 text-sm">
             <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Club</span><span>{selectedPlayer?.team?.name || "—"}</span></div>
             <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Phone</span><span>{selectedPlayer?.phone || "—"}</span></div>
             <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Position</span><span>{selectedPlayer?.position || "—"}</span></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!confirmDeletePlayer} onOpenChange={(open) => !open && setConfirmDeletePlayer(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Are you sure?</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">This action cannot be undone. This will permanently delete the player profile.</p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setConfirmDeletePlayer(null)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              await deleteMutation.mutateAsync(confirmDeletePlayer.id);
              setConfirmDeletePlayer(null);
            }}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Form Dialog */}
      <Dialog open={!!editingPlayer} onOpenChange={(open) => !open && setEditingPlayer(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Player</DialogTitle></DialogHeader>
          {editingPlayer && (
            <EditPlayerForm
              playerId={editingPlayer.id}
              teams={teams}
              onCancel={() => setEditingPlayer(null)}
              onSave={async (payload) => {
                await updateMutation.mutateAsync(payload);
                setEditingPlayer(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Players;
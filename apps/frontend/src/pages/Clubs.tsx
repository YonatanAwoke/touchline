import React, { useState } from "react";
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

const statCards = [
  { label: "Total Clubs", value: 0, icon: Shield },
  { label: "Total Players", value: 0, icon: Users },
];

type ClubType = any;

const Clubs: React.FC = () => {
  const [selectedClub, setSelectedClub] = useState<ClubType | null>(null);
  const [editingClub, setEditingClub] = useState<ClubType | null>(null);
  const [confirmDeleteClub, setConfirmDeleteClub] = useState<ClubType | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({ queryKey: ["teams"], queryFn: async () => {
    const res = await fetch("/api/teams?limit=100", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load teams");
    return res.json();
  }});

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

  const onSaveEdit = async (payload: any) => {
    await updateMutation.mutateAsync(payload);
    setEditingClub(null);
  };

  const navigate = useNavigate();

  return (
    <DashboardLayout title="Clubs" subtitle="Manage your clubs and teams">
      {/* Top action */}
      <div className="flex justify-end mb-6">
        <Button className="gap-2" onClick={() => navigate("/dashboard/create-club") }>
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
                <TableHead className="w-10">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Coach</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Players</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isLoading ? [] : teams).map((club: any) => (
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
        <DialogContent className="sm:max-w-lg animate-scale-in">
          <DialogHeader>
            <DialogTitle>Edit Club</DialogTitle>
          </DialogHeader>
          {editingClub && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input defaultValue={editingClub.name} id="club-name" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setEditingClub(null)}>Cancel</Button>
                <Button onClick={async () => {
                  const name = (document.getElementById("club-name") as HTMLInputElement).value;
                  await onSaveEdit({ id: editingClub.id, name });
                }}>Save</Button>
              </div>
            </div>
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
    </DashboardLayout>
  );
};

export default Clubs;

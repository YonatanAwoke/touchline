import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  User,
  UserCircle,
  Mail,
  CalendarDays,
  Plus,
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

// fetch players from backend
async function fetchPlayers(): Promise<{ items: any[]; total: number }> {
  const res = await fetch("/api/players?limit=100", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch players");
  const json = await res.json();
  return json;
}

const statCards = [
  { label: "Total Players", value: 0, icon: Users },
  { label: "Total Clubs", value: 1, icon: User },
  { label: "Total Organizations", value: 1, icon: UserCircle },
  { label: "Active Players", value: 0, icon: CalendarDays },
];

const Players: React.FC = () => {
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const { data, isLoading, error } = useQuery({ queryKey: ["players"], queryFn: fetchPlayers, staleTime: 1000 * 30 });

  const players = data?.items ?? [];
  const navigate = useNavigate();

  return (
    <DashboardLayout title="Players" subtitle="Manage your players and profiles">
      <div className="flex justify-end mb-6">
        <Button className="gap-2" onClick={() => navigate("/dashboard/create-player")}>
          <Plus size={16} /> Create Player
        </Button>
      </div>

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
                  {idx === 0 ? players.length : stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
                  <TableHead>Birthdate</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>H / W (cm/kg)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              {(isLoading ? [] : players).map((p: any, i: number) => {
                // map backend player shape to UI-friendly fields
                const row = {
                  id: p.id,
                  userId: p.userId,
                  teamId: p.teamId,
                  firstName: p.user?.username || p.firstName || "",
                  lastName: "",
                  email: p.user?.email || "",
                  phone: p.phone,
                  address: p.address,
                  city: p.city,
                  country: p.country,
                  birthdate: p.birthdate,
                  nationality: p.nationality,
                  position: p.position,
                  secondaryPositions: p.secondaryPositions,
                  heightCm: p.heightCm,
                  weightKg: p.weightKg,
                  dominantFoot: p.dominantFoot,
                  bio: p.bio,
                  attributes: p.attributes,
                  isActive: typeof p.isActive === "boolean" ? p.isActive : true,
                  profileVisibility: p.profileVisibility,
                  club: p.team?.name ?? "—",
                  createdAt: p.createdAt,
                };

                return (
                <TableRow
                  key={row.id ?? i}
                  className="cursor-pointer transition-colors hover:bg-secondary/50"
                  onClick={() => setSelectedPlayer(row)}
                >
                  <TableCell className="font-medium text-muted-foreground">{row.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {row.firstName ? row.firstName[0] : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">{row.firstName} {row.lastName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground">{row.club}</TableCell>
                  <TableCell className="text-foreground">{row.position}</TableCell>
                  <TableCell className="text-foreground">{row.nationality || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{row.birthdate ? new Date(row.birthdate).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{row.phone || "—"}</TableCell>
                  <TableCell className="text-foreground">{row.heightCm || "—"} / {row.weightKg || "—"}</TableCell>
                  <TableCell>
                    <Badge className={`border-0 ${row.isActive ? "bg-primary/10 text-primary" : "bg-muted-foreground/10 text-muted-foreground"}`}>
                      {row.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedPlayer} onOpenChange={(open) => !open && setSelectedPlayer(null)}>
        <DialogContent className="sm:max-w-lg animate-scale-in">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <UserCircle size={24} />
              </div>
              <div>
                <DialogTitle className="text-xl text-foreground">{selectedPlayer?.firstName} {selectedPlayer?.lastName}</DialogTitle>
                <p className="text-sm text-muted-foreground">Player Details</p>
              </div>
            </div>
          </DialogHeader>
          {selectedPlayer && (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">Name</td>
                    <td className="py-3 text-foreground">{selectedPlayer.firstName} {selectedPlayer.lastName}</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">User ID</td>
                    <td className="py-3 text-foreground">{selectedPlayer.userId ?? "—"}</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">Team ID</td>
                    <td className="py-3 text-foreground">{selectedPlayer.teamId ?? "—"}</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">Email</td>
                    <td className="py-3 text-foreground">{selectedPlayer.email ?? "—"}</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">Phone</td>
                    <td className="py-3 text-foreground">{selectedPlayer.phone ?? "—"}</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">Address</td>
                    <td className="py-3 text-foreground">{selectedPlayer.address ?? "—"}</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">City / Country</td>
                    <td className="py-3 text-foreground">{selectedPlayer.city ?? "—"} / {selectedPlayer.country ?? "—"}</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">Birthdate</td>
                    <td className="py-3 text-foreground">{selectedPlayer.birthdate ? new Date(selectedPlayer.birthdate).toLocaleDateString() : "—"}</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">Nationality</td>
                    <td className="py-3 text-foreground">{selectedPlayer.nationality ?? "—"}</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">Position(s)</td>
                    <td className="py-3 text-foreground">{selectedPlayer.position}{selectedPlayer.secondaryPositions?.length ? `, ${selectedPlayer.secondaryPositions.join(", ")}` : ""}</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">Height / Weight</td>
                    <td className="py-3 text-foreground">{selectedPlayer.heightCm ?? "—"} cm / {selectedPlayer.weightKg ?? "—"} kg</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">Dominant Foot</td>
                    <td className="py-3 text-foreground">{selectedPlayer.dominantFoot ?? "—"}</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">Profile Visibility</td>
                    <td className="py-3 text-foreground">{selectedPlayer.profileVisibility ?? "—"}</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">Bio</td>
                    <td className="py-3 text-foreground">{selectedPlayer.bio ?? "—"}</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">Attributes</td>
                    <td className="py-3 text-foreground">{selectedPlayer.attributes ? JSON.stringify(selectedPlayer.attributes) : "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Players;

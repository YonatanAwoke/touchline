import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2, Mail, Phone, MapPin, Users, Shield, Copy, CalendarDays, Plus, MoreHorizontal,
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
  { label: "Total Users", value: 0, icon: Users },
  { label: "Total Teams", value: 0, icon: Shield },
];

type OrgType = any;

const Organization: React.FC = () => {
  const [selectedOrg, setSelectedOrg] = useState<OrgType | null>(null);
  const [editingOrg, setEditingOrg] = useState<OrgType | null>(null);
  const [confirmDeleteOrg, setConfirmDeleteOrg] = useState<OrgType | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({ queryKey: ["organizations"], queryFn: async () => {
    const res = await fetch("/api/organizations", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load organizations");
    return res.json();
  }});

  const organizations = data ?? [];

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/organizations/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Delete failed");
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast({ title: "Organization deleted" });
    },
    onError: () => toast({ title: "Failed to delete organization", variant: "destructive" })
  });

  const updateMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch(`/api/organizations/${body.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast({ title: "Organization updated" });
    },
    onError: () => toast({ title: "Failed to update organization", variant: "destructive" })
  });

  const onSaveEdit = async (payload: any) => {
    await updateMutation.mutateAsync(payload);
    setEditingOrg(null);
  };

  const handleCopyJoinCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
  };

  const navigate = useNavigate();

  return (
    <DashboardLayout title="Organization" subtitle="Manage your organization details">
      {/* Top action */}
      <div className="flex justify-end mb-6">
        <Button className="gap-2" onClick={() => navigate("/dashboard/create-organization")}>
          <Plus size={16} /> Create Organization
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
                <p className="text-2xl font-bold text-foreground">{idx === 0 ? (organizations.reduce((acc: any, o: any) => acc + (o._count?.users || 0), 0)) : (idx === 1 ? organizations.reduce((acc: any, o: any) => acc + (o._count?.teams || 0), 0) : stat.value)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Organizations Table */}
      <Card className="mt-6 border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">All Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Teams</TableHead>
                <TableHead>Join Code</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isLoading ? [] : organizations).map((org: any) => (
                <TableRow key={org.id} className="transition-colors hover:bg-secondary/50">
                  <TableCell className="font-medium text-muted-foreground">{org.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {org.name.split(" ").map((w: string) => w[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">{org.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">/{org.slug}</TableCell>
                  <TableCell className="text-foreground">{org._count?.users ?? 0}</TableCell>
                  <TableCell className="text-foreground">{org._count?.teams ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono text-xs tracking-wider">{org.joinCode}</Badge>
                      <button onClick={(e) => handleCopyJoinCode(org.joinCode, e)} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" title="Copy join code"><Copy size={14} /></button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onSelect={() => setEditingOrg(org)}>Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => setConfirmDeleteOrg(org)}>Delete</DropdownMenuItem>
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

      {/* Organization Detail Dialog */}
      <Dialog open={!!selectedOrg} onOpenChange={(open) => !open && setSelectedOrg(null)}>
        <DialogContent className="sm:max-w-lg animate-scale-in">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Building2 size={24} /></div>
              <div>
                <DialogTitle className="text-xl text-foreground">{selectedOrg?.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">/{selectedOrg?.slug}</p>
              </div>
            </div>
          </DialogHeader>
          {selectedOrg && (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground"><div className="flex items-center gap-2"><Building2 size={16} /> Name</div></td>
                    <td className="py-3 text-foreground">{selectedOrg.name}</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground"><div className="flex items-center gap-2"><Mail size={16} /> Contact Email</div></td>
                    <td className="py-3 text-foreground">{selectedOrg.contactEmail || <span className="italic text-muted-foreground">Not set</span>}</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground"><div className="flex items-center gap-2"><Phone size={16} /> Contact Phone</div></td>
                    <td className="py-3 text-foreground">{selectedOrg.contactPhone || <span className="italic text-muted-foreground">Not set</span>}</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground"><div className="flex items-center gap-2"><MapPin size={16} /> Address</div></td>
                    <td className="py-3 text-foreground">{selectedOrg.address || <span className="italic text-muted-foreground">Not set</span>}</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground"><div className="flex items-center gap-2"><Copy size={16} /> Join Code</div></td>
                    <td className="py-3"><Badge variant="secondary" className="font-mono text-sm tracking-wider">{selectedOrg.joinCode}</Badge></td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground"><div className="flex items-center gap-2"><CalendarDays size={16} /> Created</div></td>
                    <td className="py-3 text-foreground">{new Date(selectedOrg.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground"><div className="flex items-center gap-2"><Users size={16} /> Members</div></td>
                    <td className="py-3 text-foreground">{selectedOrg._count?.users ?? 0} users</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground"><div className="flex items-center gap-2"><Shield size={16} /> Teams</div></td>
                    <td className="py-3 text-foreground">{selectedOrg._count?.teams ?? 0} team(s)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Organization Dialog */}
      <Dialog open={!!editingOrg} onOpenChange={(open) => !open && setEditingOrg(null)}>
        <DialogContent className="sm:max-w-lg animate-scale-in">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
          </DialogHeader>
          {editingOrg && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input defaultValue={editingOrg.name} id="org-name" />
              </div>
              <div>
                <Label>Contact Email</Label>
                <Input defaultValue={editingOrg.contactEmail || ""} id="org-email" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setEditingOrg(null)}>Cancel</Button>
                <Button onClick={async () => {
                  const name = (document.getElementById("org-name") as HTMLInputElement).value;
                  const contactEmail = (document.getElementById("org-email") as HTMLInputElement).value;
                  await onSaveEdit({ id: editingOrg.id, name, contactEmail });
                }}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDeleteOrg} onOpenChange={(open) => !open && setConfirmDeleteOrg(null)}>
        <DialogContent className="sm:max-w-lg animate-scale-in">
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">Deleting this organization will also remove related teams and players. This action is irreversible.</p>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setConfirmDeleteOrg(null)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              if (!confirmDeleteOrg) return;
              await deleteMutation.mutateAsync(confirmDeleteOrg.id);
              setConfirmDeleteOrg(null);
            }}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Organization;

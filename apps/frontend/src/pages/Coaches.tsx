import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, User, Mail, MoreHorizontal, CalendarDays, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

import EditCoachForm from "@/components/EditCoachForm";

type CoachType = any;

const Coaches: React.FC = () => {
  const [selectedCoach, setSelectedCoach] = useState<CoachType | null>(null);
  const [editingCoach, setEditingCoach] = useState<CoachType | null>(null);
  const [confirmDeleteCoach, setConfirmDeleteCoach] = useState<CoachType | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({ queryKey: ["coaches"], queryFn: async () => {
    const res = await fetch("/api/coaches", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load coaches");
    return res.json();
  }});

  const coaches = data ?? [];

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/coaches/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Delete failed");
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaches"] });
      toast({ title: "Coach deleted" });
    },
    onError: () => toast({ title: "Failed to delete coach", variant: "destructive" })
  });

  const updateMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch(`/api/coaches/${body.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaches"] });
      toast({ title: "Coach updated" });
    },
    onError: () => toast({ title: "Failed to update coach", variant: "destructive" })
  });

  return (
    <DashboardLayout title="Coaches" subtitle="Manage your coaches">
      <div className="flex justify-end mb-6">
        <Button className="gap-2" onClick={() => navigate("/dashboard/create-coach")}>
          <Plus size={16} /> Create Coach
        </Button>
      </div>

      <Card className="mt-2 border-border">
        <CardHeader>
          <CardTitle>All Coaches</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Org</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>Licenses</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isLoading ? [] : coaches).map((c: any) => (
                <TableRow key={c.id} className="transition-colors hover:bg-secondary/50">
                  <TableCell className="font-medium text-muted-foreground">{c.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">{c.user?.username?.[0] ?? "C"}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">{c.user?.username}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.user?.email}</TableCell>
                  <TableCell className="text-foreground">{c.user?.organizationId ?? "—"}</TableCell>
                  <TableCell>{(c.specialty || []).join(", ")}</TableCell>
                  <TableCell>{(c.licenseLevel || []).join(", ")}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("en-US")}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onSelect={() => setEditingCoach(c)}>Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => setConfirmDeleteCoach(c)}>Delete</DropdownMenuItem>
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

      {/* Edit dialog */}
      <Dialog open={!!editingCoach} onOpenChange={(open) => !open && setEditingCoach(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Coach</DialogTitle>
          </DialogHeader>
          {editingCoach && (
            <EditCoachForm
              coachId={editingCoach.id}
              onCancel={() => setEditingCoach(null)}
              onSave={async (payload) => {
                await updateMutation.mutateAsync(payload);
                setEditingCoach(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDeleteCoach} onOpenChange={(open) => !open && setConfirmDeleteCoach(null)}>
        <DialogContent className="sm:max-w-lg animate-scale-in">
          <DialogHeader>
            <DialogTitle>Delete Coach</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">This will remove the coach profile. Are you sure?</p>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setConfirmDeleteCoach(null)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              if (!confirmDeleteCoach) return;
              await deleteMutation.mutateAsync(confirmDeleteCoach.id);
              setConfirmDeleteCoach(null);
            }}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Coaches;

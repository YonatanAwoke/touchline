import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import CreateEntityForm from "@/components/CreateEntityForm";

const CreateClub: React.FC = () => {
  const [name, setName] = useState("");
  const [organizationId, setOrganizationId] = useState<number | "">("");
  const [coachId, setCoachId] = useState<number | "">("");

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  
  
  
  
  
  

  const createMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch("/api/teams", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Create failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast({ title: "Club created" });
      navigate("/dashboard/clubs");
    },
    onError: () => toast({ title: "Failed to create club", variant: "destructive" })
  });

  return (
    <DashboardLayout title="Create Club" subtitle="Add a new club/team">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Create Club</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
          <CreateEntityForm
            entity="club"
            onCancel={() => navigate(-1)}
            submitting={createMutation.isLoading}
            onSubmit={(payload) => createMutation.mutate(payload)}
          />
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default CreateClub;

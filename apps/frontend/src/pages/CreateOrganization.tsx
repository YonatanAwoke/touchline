import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import CreateEntityForm from "@/components/CreateEntityForm";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft } from "lucide-react";

const CreateOrganization: React.FC = () => {
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch("/api/organizations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Create failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast({ title: "Organization created" });
      navigate("/dashboard/organization");
    },
    onError: async (err: any) => {
      const text = await (err?.message ? Promise.resolve(err.message) : Promise.resolve("Failed to create"));
      toast({ title: "Create failed", description: String(text), variant: "destructive" });
    },
  });

  return (
    <DashboardLayout title="Create Organization" subtitle="Add a new organization">
      <div className="mb-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="items-center gap-2"><ChevronLeft size={16} /> Back</Button>
      </div>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Create Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateEntityForm
            entity="organization"
            onCancel={() => navigate(-1)}
            submitting={createMutation.isPending}
            onSubmit={(payload) => createMutation.mutate(payload)}
          />
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default CreateOrganization;

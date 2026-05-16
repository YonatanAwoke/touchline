import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import CreateEntityForm from "@/components/CreateEntityForm";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

const CreateCoach: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch("/api/coaches", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Create failed");
      }

      return res.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaches"] });

      toast({
        title: "Coach created",
      });

      navigate("/dashboard/coaches");
    },

    onError: (err: any) => {
      toast({
        title: "Failed to create coach",
        description: String(err?.message || err),
        variant: "destructive",
      });
    },
  });

  return (
    <DashboardLayout title="Create Coach" subtitle="Add a new coach profile">
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="items-center gap-2"
        >
          <ChevronLeft size={16} />
          Back
        </Button>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Create Coach</CardTitle>
        </CardHeader>

        <CardContent>
          <CreateEntityForm
            // @ts-ignore - CreateEntityForm now accepts "coach"
            entity="coach"
            onCancel={() => navigate(-1)}
            submitting={createMutation.isPending}
            onSubmit={(payload) => {
              const body: any = {};

              // create user if credentials are provided
              if (
                payload.email &&
                payload.username &&
                payload.password &&
                payload.organizationSlug &&
                payload.joinCode
              ) {
                body.createUser = {
                  email: payload.email,
                  username: payload.username,
                  password: payload.password,
                  organizationSlug: payload.organizationSlug,
                  joinCode: payload.joinCode,
                  role: "COACH",
                };
              }

              body.bio = payload.coachBio || payload.bio;

              if (payload.coachSpecialty) {
                body.specialty = payload.coachSpecialty
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter(Boolean);
              }

              if (payload.coachLicense) {
                body.licenseLevel = payload.coachLicense
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter(Boolean);
              }

              createMutation.mutate(body);
            }}
          />
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default CreateCoach;
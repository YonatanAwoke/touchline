import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CreateEntityForm from "@/components/CreateEntityForm";
import { useToast } from "@/components/ui/use-toast";

const CreatePlayer: React.FC = () => {
  const [userId, setUserId] = useState<number | "">("");
  const [teamId, setTeamId] = useState<number | "">("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [nationality, setNationality] = useState("");
  const [position, setPosition] = useState("");
  const [secondaryPositions, setSecondaryPositions] = useState("");
  const [heightCm, setHeightCm] = useState<number | "">("");
  const [weightKg, setWeightKg] = useState<number | "">("");
  const [dominantFoot, setDominantFoot] = useState("");
  const [bio, setBio] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [profileVisibility, setProfileVisibility] = useState("PUBLIC");

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch("/api/players", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Create failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast({ title: "Player created" });
      navigate("/dashboard/players");
    },
    onError: (err: any) => toast({ title: "Failed to create player", description: String(err?.message || err), variant: "destructive" })
  });

  return (
    <DashboardLayout title="Create Player" subtitle="Add a new player profile">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Create Player</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateEntityForm
            entity="player"
            onCancel={() => navigate(-1)}
            submitting={createMutation.isLoading}
            onSubmit={(payload) => createMutation.mutate(payload)}
          />
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default CreatePlayer;

import React, { useEffect, useState } from "react";
import { RippleLoader } from "@/components/ui/ripple-loader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { User, Dumbbell, Save } from "lucide-react";

type Props = {
  playerId: number;
  teams?: any[];
  onCancel: () => void;
  onSave: (payload: any) => void;
};

const POSITIONS = ["GK","CB","LB","RB","LWB","RWB","DM","CM","AM","LM","RM","LW","RW","ST","CF"];

const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="form-label">{label}</label>
    {children}
  </div>
);

const EditPlayerForm: React.FC<Props> = ({ playerId, teams = [], onCancel, onSave }) => {
  const [form, setForm] = useState<any>({ id: playerId });

  const { data: player, isLoading, error } = useQuery({
    queryKey: ["players", playerId],
    queryFn: async () => {
      const res = await fetch(`/api/players/${playerId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch player");
      return res.json();
    },
    enabled: !!playerId,
  });

  useEffect(() => {
    if (player) {
      setForm({
        id: player.id,
        phone: player.phone || "",
        address: player.address || "",
        city: player.city || "",
        country: player.country || "",
        postalCode: player.postalCode || "",
        birthdate: player.birthdate ? new Date(player.birthdate).toISOString().slice(0, 10) : "",
        nationality: player.nationality || "",
        position: player.position || "",
        secondaryPositions: (player.secondaryPositions || []).join(", "),
        heightCm: player.heightCm ?? "",
        weightKg: player.weightKg ?? "",
        dominantFoot: player.dominantFoot || "",
        bio: player.bio || "",
        teamId: player.team?.id ?? player.teamId ?? "",
        isActive: player.isActive,
        profileVisibility: player.profileVisibility || "PUBLIC",
      });
    }
  }, [player]);

  const handleChange = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));

  if (isLoading) return <div className="flex items-center justify-center p-8"><RippleLoader label="Loading player details..." /></div>;
  if (error) return <div className="p-4 text-center text-destructive">Error loading player details: {(error as Error).message}</div>;

  const handleSave = () => {
    const payload: any = { id: form.id || playerId };
    if (form.teamId) payload.teamId = Number(form.teamId);
    if (form.phone) payload.phone = form.phone;
    if (form.address) payload.address = form.address;
    if (form.city) payload.city = form.city;
    if (form.country) payload.country = form.country;
    if (form.postalCode) payload.postalCode = form.postalCode;
    if (form.birthdate) payload.birthdate = form.birthdate;
    if (form.nationality) payload.nationality = form.nationality;
    if (form.position) payload.position = form.position;
    if (form.secondaryPositions) payload.secondaryPositions = form.secondaryPositions.split(",").map((s: string) => s.trim()).filter(Boolean);
    if (form.heightCm !== "") payload.heightCm = Number(form.heightCm);
    if (form.weightKg !== "") payload.weightKg = Number(form.weightKg);
    if (form.dominantFoot) payload.dominantFoot = form.dominantFoot;
    if (form.bio) payload.bio = form.bio;
    if (typeof form.isActive === "boolean") payload.isActive = form.isActive;
    if (form.profileVisibility) payload.profileVisibility = form.profileVisibility;
    onSave(payload);
  };

  return (
    <div className="space-y-5">
      {/* Team & Contact */}
      <div className="form-section">
        <div className="form-section-title flex items-center gap-2">
          <User size={18} className="text-primary" />
          Assignment & Contact
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Team">
            <select value={form.teamId ?? ""} onChange={(e) => handleChange("teamId", e.target.value ? Number(e.target.value) : "")} className="form-select">
              <option value="">- Unassigned -</option>
              {teams.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Phone">
            <Input className="form-input-styled" value={form.phone || ""} onChange={(e) => handleChange("phone", e.target.value)} placeholder="+1 (555) 000-0000" />
          </FormField>
        </div>
      </div>

      {/* Player Details */}
      <div className="form-section">
        <div className="form-section-title flex items-center gap-2">
          <Dumbbell size={18} className="text-primary" />
          Player Details
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Position">
            <select value={form.position || ""} onChange={(e) => handleChange("position", e.target.value)} className="form-select">
              <option value="">- Select Position -</option>
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </FormField>
          <FormField label="Dominant Foot">
            <select value={form.dominantFoot || ""} onChange={(e) => handleChange("dominantFoot", e.target.value)} className="form-select">
              <option value="">- Select -</option>
              <option value="LEFT">Left</option>
              <option value="RIGHT">Right</option>
              <option value="BOTH">Both</option>
            </select>
          </FormField>
        </div>
        <FormField label="Secondary Positions (comma separated)">
          <Input className="form-input-styled" value={form.secondaryPositions || ""} onChange={(e) => handleChange("secondaryPositions", e.target.value)} placeholder="e.g. CM, AM, LW" />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Height (cm)">
            <Input type="number" className="form-input-styled" value={form.heightCm ?? ""} onChange={(e) => handleChange("heightCm", e.target.value ? Number(e.target.value) : "")} placeholder="e.g. 180" />
          </FormField>
          <FormField label="Weight (kg)">
            <Input type="number" className="form-input-styled" value={form.weightKg ?? ""} onChange={(e) => handleChange("weightKg", e.target.value ? Number(e.target.value) : "")} placeholder="e.g. 75" />
          </FormField>
        </div>
        <FormField label="Bio">
          <Textarea className="form-input-styled min-h-[80px] resize-none" value={form.bio || ""} onChange={(e) => handleChange("bio", e.target.value)} placeholder="Tell us about this player..." />
        </FormField>
      </div>

      {/* Footer */}
      <div className="form-footer">
        <Button variant="ghost" onClick={onCancel} className="px-6">Cancel</Button>
        <Button onClick={handleSave} className="px-8 gap-2">
          <Save size={16} />
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default EditPlayerForm;

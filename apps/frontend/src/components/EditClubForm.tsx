import React, { useEffect, useState } from "react";
import { RippleLoader } from "@/components/ui/ripple-loader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Shield, User, Save } from "lucide-react";

type Props = {
  clubId: number;
  onCancel: () => void;
  onSave: (payload: any) => void;
};

const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="form-label">{label}</label>
    {children}
  </div>
);

const EditClubForm: React.FC<Props> = ({ clubId, onCancel, onSave }) => {
  const [form, setForm] = useState<any>({ id: clubId });

  const { data: club, isLoading: isLoadingClub, error: clubError } = useQuery({
    queryKey: ["teams", clubId],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${clubId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch club");
      return res.json();
    },
    enabled: !!clubId,
  });

  const { data: coachesData, isLoading: isLoadingCoaches } = useQuery({
    queryKey: ["coaches"],
    queryFn: async () => {
      const res = await fetch("/api/coaches", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch coaches");
      return res.json();
    },
  });

  const coaches = coachesData ?? [];

  useEffect(() => {
    if (club) {
      setForm({
        id: club.id,
        name: club.name || "",
        coachId: club.coach?.id ?? club.coachId ?? "",
      });
    }
  }, [club]);

  const handleChange = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));

  if (isLoadingClub || isLoadingCoaches) return <div className="flex items-center justify-center p-8"><RippleLoader label="Loading club details..." /></div>;
  if (clubError) return <div className="p-4 text-center text-destructive">Error loading club details: {(clubError as Error).message}</div>;

  const handleSave = () => {
    const payload: any = { id: form.id || clubId };
    if (form.name) payload.name = form.name;
    if (form.coachId) payload.coachId = Number(form.coachId);
    onSave(payload);
  };

  return (
    <div className="space-y-5">
      <div className="form-section">
        <div className="form-section-title flex items-center gap-2">
          <Shield size={18} className="text-primary" />
          Club Assignment
        </div>
        <div className="grid grid-cols-1 gap-4">
          <FormField label="Club Name">
            <Input className="form-input-styled" value={form.name || ""} onChange={(e) => handleChange("name", e.target.value)} placeholder="Club Name" />
          </FormField>
          <FormField label="Head Coach">
            <select 
              value={form.coachId ?? ""} 
              onChange={(e) => handleChange("coachId", e.target.value ? Number(e.target.value) : "")} 
              className="form-select"
            >
              <option value="">- Select Coach -</option>
              {coaches.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.user?.username || `Coach ${c.id}`}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </div>

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

export default EditClubForm;

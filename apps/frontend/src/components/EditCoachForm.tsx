import React, { useEffect, useState } from "react";
import { RippleLoader } from "@/components/ui/ripple-loader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Save, ClipboardList, GraduationCap, User } from "lucide-react";

type Props = {
  coachId: number;
  onCancel: () => void;
  onSave: (payload: any) => void;
};

const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="form-label">{label}</label>
    {children}
  </div>
);

const EditCoachForm: React.FC<Props> = ({ coachId, onCancel, onSave }) => {
  const [form, setForm] = useState<any>({ id: coachId });

  const { data: coach, isLoading, error } = useQuery({
    queryKey: ["coaches", coachId],
    queryFn: async () => {
      const res = await fetch(`/api/coaches/${coachId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch coach");
      return res.json();
    },
    enabled: !!coachId,
  });

  useEffect(() => {
    if (coach) {
      setForm({
        id: coach.id,
        bio: coach.bio || "",
        specialty: (coach.specialty || []).join(", "),
        licenseLevel: (coach.licenseLevel || []).join(", "),
      });
    }
  }, [coach]);

  const handleChange = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));

  if (isLoading) return <div className="flex items-center justify-center p-8"><RippleLoader label="Loading coach details..." /></div>;
  if (error) return <div className="p-4 text-center text-destructive">Error loading coach details: {(error as Error).message}</div>;

  const handleSave = () => {
    const payload: any = { id: form.id || coachId };
    if (form.bio !== undefined) payload.bio = form.bio;
    if (form.specialty !== undefined) payload.specialty = form.specialty.split(",").map((s: string) => s.trim()).filter(Boolean);
    if (form.licenseLevel !== undefined) payload.licenseLevel = form.licenseLevel.split(",").map((l: string) => l.trim()).filter(Boolean);
    onSave(payload);
  };

  return (
    <div className="space-y-5">
      {/* Coach Info */}
      <div className="form-section">
        <div className="form-section-title flex items-center gap-2">
          <User size={18} className="text-primary" />
          General Info
        </div>
        <FormField label="Bio">
          <Textarea 
            className="form-input-styled min-h-[100px] resize-none" 
            value={form.bio || ""} 
            onChange={(e) => handleChange("bio", e.target.value)} 
            placeholder="Tell us about this coach..." 
          />
        </FormField>
      </div>

      {/* Specialties & Licenses */}
      <div className="form-section">
        <div className="form-section-title flex items-center gap-2">
          <ClipboardList size={18} className="text-primary" />
          Professional Details
        </div>
        <div className="grid grid-cols-1 gap-4">
          <FormField label="Specialties (comma separated)">
            <Input 
              className="form-input-styled" 
              value={form.specialty || ""} 
              onChange={(e) => handleChange("specialty", e.target.value)} 
              placeholder="e.g. Tactical, Goalkeeping, Fitness" 
            />
          </FormField>
          <FormField label="License Levels (comma separated)">
            <Input 
              className="form-input-styled" 
              value={form.licenseLevel || ""} 
              onChange={(e) => handleChange("licenseLevel", e.target.value)} 
              placeholder="e.g. UEFA Pro, AFC A" 
            />
          </FormField>
        </div>
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

export default EditCoachForm;

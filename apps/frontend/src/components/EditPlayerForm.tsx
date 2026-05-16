import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

type Props = {
  playerId: number;
  teams?: any[];
  onCancel: () => void;
  onSave: (payload: any) => void;
};

const POSITIONS = ["GK","CB","LB","RB","LWB","RWB","DM","CM","AM","LM","RM","LW","RW","ST","CF"];

const EditPlayerForm: React.FC<Props> = ({ playerId, teams = [], onCancel, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<any>({ id: playerId });

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/players/${playerId}`, { credentials: "include" });
        if (!res.ok) {
          let body = null;
          try { body = await res.text(); } catch (e) { /* ignore */ }
          console.error(`Fetch player failed (${res.status}):`, body);
          throw new Error("Failed to fetch player");
        }
        const json = await res.json();
        if (!mounted) return;
        // map fields
        setForm({
          id: json.id,
          phone: json.phone || "",
          address: json.address || "",
          city: json.city || "",
          country: json.country || "",
          postalCode: json.postalCode || "",
          birthdate: json.birthdate ? new Date(json.birthdate).toISOString().slice(0,10) : "",
          nationality: json.nationality || "",
          position: json.position || "",
          secondaryPositions: (json.secondaryPositions || []).join(", "),
          heightCm: json.heightCm ?? "",
          weightKg: json.weightKg ?? "",
          dominantFoot: json.dominantFoot || "",
          bio: json.bio || "",
          teamId: json.team?.id ?? json.teamId ?? "",
          isActive: json.isActive,
          profileVisibility: json.profileVisibility || "PUBLIC",
        });
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, [playerId]);

  const handleChange = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-4">
      <div>
        <Label>Team</Label>
        <select value={form.teamId ?? ""} onChange={(e) => handleChange('teamId', e.target.value ? Number(e.target.value) : "")} className="w-full rounded-md border px-3 py-2">
          <option value="">Unassigned</option>
          {teams.map((t: any) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      <div>
        <Label>Phone</Label>
        <Input value={form.phone || ""} onChange={(e) => handleChange('phone', e.target.value)} />
      </div>
      <div>
        <Label>Position</Label>
        <select value={form.position || ""} onChange={(e) => handleChange('position', e.target.value)} className="w-full rounded-md border px-3 py-2">
          <option value="">Select</option>
          {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div>
        <Label>Secondary Positions (comma separated)</Label>
        <Input value={form.secondaryPositions || ""} onChange={(e) => handleChange('secondaryPositions', e.target.value)} />
      </div>
      <div>
        <Label>Height (cm)</Label>
        <Input value={form.heightCm ?? ""} onChange={(e) => handleChange('heightCm', e.target.value ? Number(e.target.value) : "")} />
      </div>
      <div>
        <Label>Weight (kg)</Label>
        <Input value={form.weightKg ?? ""} onChange={(e) => handleChange('weightKg', e.target.value ? Number(e.target.value) : "")} />
      </div>
      <div>
        <Label>Bio</Label>
        <textarea value={form.bio || ""} onChange={(e) => handleChange('bio', e.target.value)} className="w-full rounded-md border px-3 py-2" />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button disabled={loading} onClick={() => {
          // prepare payload - always include id (fall back to playerId prop)
          const payload: any = { id: typeof form.id !== 'undefined' ? form.id : playerId };
          if (form.teamId) payload.teamId = Number(form.teamId);
          if (form.phone) payload.phone = form.phone;
          if (form.address) payload.address = form.address;
          if (form.city) payload.city = form.city;
          if (form.country) payload.country = form.country;
          if (form.postalCode) payload.postalCode = form.postalCode;
          if (form.birthdate) payload.birthdate = form.birthdate;
          if (form.nationality) payload.nationality = form.nationality;
          if (form.position) payload.position = form.position;
          if (form.secondaryPositions) payload.secondaryPositions = form.secondaryPositions.split(',').map((s: string) => s.trim()).filter(Boolean);
          if (form.heightCm !== "") payload.heightCm = Number(form.heightCm);
          if (form.weightKg !== "") payload.weightKg = Number(form.weightKg);
          if (form.dominantFoot) payload.dominantFoot = form.dominantFoot;
          if (form.bio) payload.bio = form.bio;
          if (typeof form.isActive === 'boolean') payload.isActive = form.isActive;
          if (form.profileVisibility) payload.profileVisibility = form.profileVisibility;

          onSave(payload);
        }}>Save</Button>
      </div>
    </div>
  );
};

export default EditPlayerForm;

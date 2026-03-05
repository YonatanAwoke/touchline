import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type Entity = "organization" | "club" | "player";

type Props = {
  entity: Entity;
  onCancel: () => void;
  onSubmit: (payload: any) => void;
  submitting?: boolean;
};

const CreateEntityForm: React.FC<Props> = ({ entity, onCancel, onSubmit, submitting }) => {
  // common organization fields
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");

  // club fields
  const [organizationId, setOrganizationId] = useState<number | "">("");
  const [coachId, setCoachId] = useState<number | "">("");

  // player fields
  // removed userId: create user on-the-fly instead
  const [teamId, setTeamId] = useState<number | "">("");
  const [phoneP, setPhoneP] = useState("");
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

  const { data: orgData } = useQuery({ queryKey: ["organizations"], queryFn: async () => {
    const res = await fetch("/api/organizations", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load organizations");
    return res.json();
  }, enabled: entity === "club" || entity === "player" });

  const { data: teamsData } = useQuery({ queryKey: ["teams"], queryFn: async () => {
    const res = await fetch("/api/teams?limit=100", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load teams");
    return res.json();
  }, enabled: entity === "player" });

  const { data: coachesData } = useQuery({ queryKey: ["coaches"], queryFn: async () => {
    const res = await fetch("/api/coaches", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load coaches");
    return res.json();
  }, enabled: entity === "club" });

  const organizations = orgData ?? [];
  const teams = teamsData?.items ?? [];
  const coaches = coachesData ?? [];
  // fields for creating a user when creating a player
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [joinCodeField, setJoinCodeField] = useState("");

  const handleSubmit = () => {
    if (entity === "organization") {
      onSubmit({ name, contactEmail, contactPhone, address, description });
      return;
    }

    if (entity === "club") {
      onSubmit({ name, organizationId: organizationId || undefined, coachId: coachId || undefined });
      return;
    }

    // player
    onSubmit({
      // if user creation fields are provided, send createUser, otherwise userId (deprecated)
      createUser: email && username && password && orgSlug && joinCodeField ? {
        email,
        username,
        password,
        organizationSlug: orgSlug,
        joinCode: joinCodeField,
        role: "PLAYER",
      } : undefined,
      teamId: teamId || undefined,
      phone: phoneP || undefined,
      city: city || undefined,
      country: country || undefined,
      postalCode: postalCode || undefined,
      birthdate: birthdate || undefined,
      nationality: nationality || undefined,
      position: position || undefined,
      secondaryPositions: secondaryPositions ? secondaryPositions.split(",").map(s => s.trim()) : undefined,
      heightCm: heightCm || undefined,
      weightKg: weightKg || undefined,
      dominantFoot: dominantFoot || undefined,
      bio: bio || undefined,
    });
  };

  return (
    <div className="grid gap-4">
      {entity === "organization" && (
        <>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Organization name" />
          </div>
          <div>
            <Label>Contact Email</Label>
            <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Contact email" />
          </div>
          <div>
            <Label>Contact Phone</Label>
            <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Contact phone" />
          </div>
          <div>
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </>
      )}

      {entity === "club" && (
        <>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Club name" />
          </div>
          <div>
            <Label>Organization</Label>
            <select value={organizationId} onChange={(e) => setOrganizationId(e.target.value ? Number(e.target.value) : "")} className="w-full rounded-md border px-3 py-2">
              <option value="">Select organization</option>
              {organizations.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>

          <div>
            <Label>Coach (optional)</Label>
            <select value={coachId || ""} onChange={(e) => setCoachId(e.target.value ? Number(e.target.value) : "")} className="w-full rounded-md border px-3 py-2">
              <option value="">Select coach</option>
              {coaches
                .filter((c: any) => {
                  // if organizationId selected, filter coaches for that org when available
                  if (!organizationId) return true;
                  const userOrg = c.user?.organizationId ?? null;
                  return userOrg ? Number(userOrg) === Number(organizationId) : true;
                })
                .map((c: any) => (
                  <option key={c.id} value={c.id}>{c.user?.username || c.user?.email || `Coach ${c.id}`}</option>
                ))}
            </select>
          </div>
        </>
      )}

      {entity === "player" && (
        <>
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
          </div>
          <div>
            <Label>Username</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" />
          </div>
          <div>
            <Label>Organization</Label>
            <select value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} className="w-full rounded-md border px-3 py-2">
              <option value="">Select organization</option>
              {organizations.map((o: any) => <option key={o.id} value={o.slug ?? o.name}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Join Code</Label>
            <Input value={joinCodeField} onChange={(e) => setJoinCodeField(e.target.value)} placeholder="Organization join code" />
          </div>
          <div>
            <Label>Team</Label>
            <select value={teamId} onChange={(e) => setTeamId(e.target.value ? Number(e.target.value) : "")} className="w-full rounded-md border px-3 py-2">
              <option value="">Select team</option>
              {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phoneP} onChange={(e) => setPhoneP(e.target.value)} />
          </div>
          <div>
            <Label>City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <Label>Country</Label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
          <div>
            <Label>Postal Code</Label>
            <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
          </div>
          <div>
            <Label>Birthdate</Label>
            <Input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
          </div>
          <div>
            <Label>Nationality</Label>
            <Input value={nationality} onChange={(e) => setNationality(e.target.value)} />
          </div>
          <div>
            <Label>Position</Label>
            <Input value={position} onChange={(e) => setPosition(e.target.value)} />
          </div>
          <div>
            <Label>Secondary Positions (comma separated)</Label>
            <Input value={secondaryPositions} onChange={(e) => setSecondaryPositions(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Height (cm)</Label>
              <Input value={heightCm || ""} onChange={(e) => setHeightCm(e.target.value ? Number(e.target.value) : "")} />
            </div>
            <div>
              <Label>Weight (kg)</Label>
              <Input value={weightKg || ""} onChange={(e) => setWeightKg(e.target.value ? Number(e.target.value) : "")} />
            </div>
          </div>
          <div>
            <Label>Dominant Foot</Label>
            <Input value={dominantFoot} onChange={(e) => setDominantFoot(e.target.value)} />
          </div>
          <div>
            <Label>Bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
        </>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={submitting}>{entity === "player" ? "Create" : "Create"}</Button>
      </div>
    </div>
  );
};

export default CreateEntityForm;

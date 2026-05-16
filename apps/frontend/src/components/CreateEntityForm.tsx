import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type Entity = "organization" | "club" | "player" | "coach";

type Props = {
  entity: Entity;
  onCancel: () => void;
  onSubmit: (payload: any) => void;
  submitting?: boolean;
};

const CreateEntityForm: React.FC<Props> = ({ entity, onCancel, onSubmit, submitting }) => {
  // --- 1. STATE DECLARATIONS (All at the top to avoid hoisting errors) ---
  
  // Common / Organization / Club fields
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [organizationId, setOrganizationId] = useState<number | "">("");
  const [coachId, setCoachId] = useState<number | "">("");

  // User account fields (Used for creating a Coach or Player user)
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [joinCodeField, setJoinCodeField] = useState("");

  // Player specific fields
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

  // Coach specific fields
  const [coachBio, setCoachBio] = useState("");
  const [coachSpecialty, setCoachSpecialty] = useState("");
  const [coachLicense, setCoachLicense] = useState("");

  // --- 2. DATA FETCHING ---

  const { data: orgData } = useQuery({ 
    queryKey: ["organizations"], 
    queryFn: async () => {
      const res = await fetch("/api/organizations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load organizations");
      return res.json();
    }, 
    enabled: entity !== "organization" 
  });

  const { data: teamsData } = useQuery({ 
    queryKey: ["teams"], 
    queryFn: async () => {
      const res = await fetch("/api/teams?limit=100", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load teams");
      return res.json();
    }, 
    enabled: entity === "player" 
  });

  const { data: coachesData } = useQuery({ 
    queryKey: ["coaches"], 
    queryFn: async () => {
      const res = await fetch("/api/coaches", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load coaches");
      return res.json();
    }, 
    enabled: entity === "club" 
  });

  const organizations = orgData ?? [];
  const teams = teamsData?.items ?? [];
  const coaches = coachesData ?? [];

  // --- 3. FILTERING LOGIC ---

  const selectedOrgIdForPlayer = orgSlug
    ? (organizations.find((o: any) => (o.slug ?? o.name) === orgSlug)?.id ?? null)
    : null;

  const filteredTeams = selectedOrgIdForPlayer 
    ? teams.filter((t: any) => Number(t.organizationId) === Number(selectedOrgIdForPlayer)) 
    : teams;

  const filteredCoaches = organizationId
    ? coaches.filter((c: any) => Number(c.user?.organizationId) === Number(organizationId))
    : coaches;

  // Reset selections if they no longer exist in the filtered lists
  useEffect(() => {
    if (teamId && filteredTeams.length > 0) {
      const exists = filteredTeams.some((t: any) => Number(t.id) === Number(teamId));
      if (!exists) setTeamId("");
    }
  }, [orgSlug, filteredTeams, teamId]);

  useEffect(() => {
    if (coachId && filteredCoaches.length > 0) {
      const exists = filteredCoaches.some((c: any) => Number(c.id) === Number(coachId));
      if (!exists) setCoachId("");
    }
  }, [organizationId, filteredCoaches, coachId]);

  // --- 4. SUBMIT HANDLER ---

  const handleSubmit = () => {
    // Shared user creation payload
    const createUserPayload = email && username && password && orgSlug && joinCodeField ? {
      email,
      username,
      password,
      organizationSlug: orgSlug,
      joinCode: joinCodeField,
    } : undefined;

    if (entity === "organization") {
      onSubmit({ name, contactEmail, contactPhone, address, description });
      return;
    }

    if (entity === "club") {
      onSubmit({ 
        name, 
        organizationId: organizationId || undefined, 
        coachId: coachId || undefined 
      });
      return;
    }

    if (entity === "coach") {
      onSubmit({
        createUser: createUserPayload ? { ...createUserPayload, role: "COACH" } : undefined,
        bio: coachBio || undefined,
        specialty: coachSpecialty || undefined,
        license: coachLicense || undefined,
      });
      return;
    }

    if (entity === "player") {
      onSubmit({
        createUser: createUserPayload ? { ...createUserPayload, role: "PLAYER" } : undefined,
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
    }
  };

  // --- 5. RENDER ---

  return (
    <div className="grid gap-4 py-4 max-h-[80vh] overflow-y-auto px-1">
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
            <select value={organizationId} onChange={(e) => setOrganizationId(e.target.value ? Number(e.target.value) : "")} className="w-full rounded-md border bg-background px-3 py-2">
              <option value="">Select organization</option>
              {organizations.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Coach (optional)</Label>
            <select value={coachId} onChange={(e) => setCoachId(e.target.value ? Number(e.target.value) : "")} className="w-full rounded-md border bg-background px-3 py-2">
              <option value="">Select coach</option>
              {filteredCoaches.map((c: any) => (
                <option key={c.id} value={c.id}>{c.user?.username || c.user?.email || `Coach ${c.id}`}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {entity === "player" && (
        <>
          <div className="bg-secondary/20 p-4 rounded-lg space-y-4">
            <h3 className="text-sm font-semibold">User Account</h3>
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
              <select value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2">
                <option value="">Select organization</option>
                {organizations.map((o: any) => <option key={o.id} value={o.slug ?? o.name}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Join Code</Label>
              <Input value={joinCodeField} onChange={(e) => setJoinCodeField(e.target.value)} placeholder="Organization join code" />
            </div>
          </div>

          <h3 className="text-sm font-semibold mt-4">Player Profile</h3>
          <div>
            <Label>Team</Label>
            <select value={teamId} onChange={(e) => setTeamId(e.target.value ? Number(e.target.value) : "")} className="w-full rounded-md border bg-background px-3 py-2">
              <option value="">Select team</option>
              {filteredTeams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Position</Label>
              <select value={position} onChange={(e) => setPosition(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2">
                <option value="">Select</option>
                {["GK","CB","LB","RB","DM","CM","AM","LW","RW","ST"].map(pos => <option key={pos} value={pos}>{pos}</option>)}
              </select>
            </div>
            <div><Label>Nationality</Label><Input value={nationality} onChange={(e) => setNationality(e.target.value)} /></div>
          </div>
          <div><Label>Secondary Positions (comma separated)</Label><Input value={secondaryPositions} onChange={(e) => setSecondaryPositions(e.target.value)} /></div>
          <div><Label>Birthdate</Label><Input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} /></div>
          <div><Label>Bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} /></div>
        </>
      )}

      {entity === "coach" && (
        <>
          <div className="bg-secondary/20 p-4 rounded-lg space-y-4">
            <h3 className="text-sm font-semibold">User Account</h3>
            <div><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label>Username</Label><Input value={username} onChange={(e) => setUsername(e.target.value)} /></div>
            <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <div><Label>Organization</Label>
              <select value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2">
                <option value="">Select organization</option>
                {organizations.map((o: any) => <option key={o.id} value={o.slug ?? o.name}>{o.name}</option>)}
              </select>
            </div>
            <div><Label>Join Code</Label><Input value={joinCodeField} onChange={(e) => setJoinCodeField(e.target.value)} /></div>
          </div>
          <h3 className="text-sm font-semibold mt-4">Coach Profile</h3>
          <div><Label>Specialty</Label><Input value={coachSpecialty} onChange={(e) => setCoachSpecialty(e.target.value)} /></div>
          <div><Label>License Level</Label><Input value={coachLicense} onChange={(e) => setCoachLicense(e.target.value)} /></div>
          <div><Label>Bio</Label><Textarea value={coachBio} onChange={(e) => setCoachBio(e.target.value)} /></div>
        </>
      )}

      <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Creating..." : "Create"}
        </Button>
      </div>
    </div>
  );
};

export default CreateEntityForm;
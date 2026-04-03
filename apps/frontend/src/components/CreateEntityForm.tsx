import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { User, Building2, Shield, Dumbbell } from "lucide-react";

type Entity = "organization" | "club" | "player" | "coach";

type Props = {
  entity: Entity;
  onCancel: () => void;
  onSubmit: (payload: any) => void;
  submitting?: boolean;
};
const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="form-label">{label}</label>
    {children}
  </div>
);

const CreateEntityForm: React.FC<Props> = ({ entity, onCancel, onSubmit, submitting }) => {
  // Common / Organization / Club fields
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [organizationId, setOrganizationId] = useState<number | "">("");
  const [coachId, setCoachId] = useState<number | "">("");

  // User account fields
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

  // Data fetching
  const { data: orgData } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const res = await fetch("/api/organizations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load organizations");
      return res.json();
    },
    enabled: entity !== "organization",
  });

  const { data: teamsData } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await fetch("/api/teams?limit=100", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load teams");
      return res.json();
    },
    enabled: entity === "player",
  });

  const { data: coachesData } = useQuery({
    queryKey: ["coaches"],
    queryFn: async () => {
      const res = await fetch("/api/coaches", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load coaches");
      return res.json();
    },
    enabled: entity === "club",
  });

  const organizations = orgData ?? [];
  const teams = teamsData?.items ?? [];
  const coaches = coachesData ?? [];

  // Filtering
  const selectedOrgIdForPlayer = orgSlug
    ? (organizations.find((o: any) => (o.slug ?? o.name) === orgSlug)?.id ?? null)
    : null;

  const filteredTeams = selectedOrgIdForPlayer
    ? teams.filter((t: any) => Number(t.organizationId) === Number(selectedOrgIdForPlayer))
    : teams;

  const filteredCoaches = organizationId
    ? coaches.filter((c: any) => Number(c.user?.organizationId) === Number(organizationId))
    : coaches;

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

  // Submit
  const handleSubmit = () => {
    const createUserPayload = email && username && password && orgSlug && joinCodeField ? {
      email, username, password, organizationSlug: orgSlug, joinCode: joinCodeField,
    } : undefined;

    if (entity === "organization") {
      onSubmit({ name, contactEmail, contactPhone, address, description });
      return;
    }
    if (entity === "club") {
      onSubmit({ name, organizationId: organizationId || undefined, coachId: coachId || undefined });
      return;
    }
    if (entity === "coach") {
      onSubmit({
        createUser: createUserPayload ? { ...createUserPayload, role: "COACH" } : undefined,
        bio: coachBio || undefined,
        specialty: coachSpecialty ? coachSpecialty.split(",").map(s => s.trim()).filter(Boolean) : undefined,
        licenseLevel: coachLicense ? coachLicense.split(",").map(s => s.trim()).filter(Boolean) : undefined,
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

  // Helper components

  const entityLabels: Record<Entity, { icon: React.ReactNode; title: string }> = {
    organization: { icon: <Building2 size={18} />, title: "Organization Details" },
    club: { icon: <Shield size={18} />, title: "Club Details" },
    player: { icon: <User size={18} />, title: "Player Profile" },
    coach: { icon: <Dumbbell size={18} />, title: "Coach Profile" },
  };

  return (
    <div className="space-y-6 max-h-[75vh] overflow-y-auto px-1 py-2">
      {/* Organization Form */}
      {entity === "organization" && (
        <div className="form-section">
          <div className="form-section-title flex items-center gap-2">
            <Building2 size={18} className="text-primary" />
            Organization Details
          </div>
          <FormField label="Organization Name">
            <Input className="form-input-styled" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter organization name" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Contact Email">
              <Input className="form-input-styled" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@example.com" />
            </FormField>
            <FormField label="Contact Phone">
              <Input className="form-input-styled" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
            </FormField>
          </div>
          <FormField label="Address">
            <Input className="form-input-styled" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter address" />
          </FormField>
          <FormField label="Description">
            <Textarea className="form-input-styled min-h-[100px] resize-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the organization..." />
          </FormField>
        </div>
      )}

      {/* Club Form */}
      {entity === "club" && (
        <div className="form-section">
          <div className="form-section-title flex items-center gap-2">
            <Shield size={18} className="text-primary" />
            Club Details
          </div>
          <FormField label="Club Name">
            <Input className="form-input-styled" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter club name" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Organization">
              <select value={organizationId} onChange={(e) => setOrganizationId(e.target.value ? Number(e.target.value) : "")} className="form-select">
                <option value="">- Select Organization -</option>
                {organizations.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </FormField>
            <FormField label="Coach (optional)">
              <select value={coachId} onChange={(e) => setCoachId(e.target.value ? Number(e.target.value) : "")} className="form-select">
                <option value="">- Select Coach -</option>
                {filteredCoaches.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.user?.username || c.user?.email || `Coach ${c.id}`}</option>
                ))}
              </select>
            </FormField>
          </div>
        </div>
      )}

      {/* Player Form */}
      {entity === "player" && (
        <>
          {/* User Account Section */}
          <div className="form-section">
            <div className="form-section-title flex items-center gap-2">
              <User size={18} className="text-primary" />
              User Account
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Email">
                <Input className="form-input-styled" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
              </FormField>
              <FormField label="Username">
                <Input className="form-input-styled" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" />
              </FormField>
            </div>
            <FormField label="Password">
              <Input type="password" className="form-input-styled" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Organization">
                <select value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} className="form-select">
                  <option value="">- Select Organization -</option>
                  {organizations.map((o: any) => <option key={o.id} value={o.slug ?? o.name}>{o.name}</option>)}
                </select>
              </FormField>
              <FormField label="Join Code">
                <Input className="form-input-styled" value={joinCodeField} onChange={(e) => setJoinCodeField(e.target.value)} placeholder="Organization join code" />
              </FormField>
            </div>
          </div>

          {/* Player Profile Section */}
          <div className="form-section">
            <div className="form-section-title flex items-center gap-2">
              <Dumbbell size={18} className="text-primary" />
              Player Profile
            </div>
            <FormField label="Team">
              <select value={teamId} onChange={(e) => setTeamId(e.target.value ? Number(e.target.value) : "")} className="form-select">
                <option value="">- Select Team -</option>
                {filteredTeams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Position">
                <select value={position} onChange={(e) => setPosition(e.target.value)} className="form-select">
                  <option value="">- Select Position -</option>
                  {["GK","CB","LB","RB","DM","CM","AM","LW","RW","ST"].map(pos => <option key={pos} value={pos}>{pos}</option>)}
                </select>
              </FormField>
              <FormField label="Nationality">
                <Input className="form-input-styled" value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="Enter nationality" />
              </FormField>
            </div>
            <FormField label="Secondary Positions (comma separated)">
              <Input className="form-input-styled" value={secondaryPositions} onChange={(e) => setSecondaryPositions(e.target.value)} placeholder="e.g. CM, AM, LW" />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Date of Birth">
                <Input type="date" className="form-input-styled" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
              </FormField>
              <FormField label="Dominant Foot">
                <select value={dominantFoot} onChange={(e) => setDominantFoot(e.target.value)} className="form-select">
                  <option value="">- Select -</option>
                  <option value="LEFT">Left</option>
                  <option value="RIGHT">Right</option>
                  <option value="BOTH">Both</option>
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Height (cm)">
                <Input type="number" className="form-input-styled" value={heightCm} onChange={(e) => setHeightCm(e.target.value ? Number(e.target.value) : "")} placeholder="e.g. 180" />
              </FormField>
              <FormField label="Weight (kg)">
                <Input type="number" className="form-input-styled" value={weightKg} onChange={(e) => setWeightKg(e.target.value ? Number(e.target.value) : "")} placeholder="e.g. 75" />
              </FormField>
            </div>
            <FormField label="Bio">
              <Textarea className="form-input-styled min-h-[80px] resize-none" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about this player..." />
            </FormField>
          </div>
        </>
      )}

      {/* Coach Form */}
      {entity === "coach" && (
        <>
          <div className="form-section">
            <div className="form-section-title flex items-center gap-2">
              <User size={18} className="text-primary" />
              User Account
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Email">
                <Input className="form-input-styled" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
              </FormField>
              <FormField label="Username">
                <Input className="form-input-styled" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" />
              </FormField>
            </div>
            <FormField label="Password">
              <Input type="password" className="form-input-styled" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Organization">
                <select value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} className="form-select">
                  <option value="">- Select Organization -</option>
                  {organizations.map((o: any) => <option key={o.id} value={o.slug ?? o.name}>{o.name}</option>)}
                </select>
              </FormField>
              <FormField label="Join Code">
                <Input className="form-input-styled" value={joinCodeField} onChange={(e) => setJoinCodeField(e.target.value)} placeholder="Organization join code" />
              </FormField>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title flex items-center gap-2">
              <Dumbbell size={18} className="text-primary" />
              Coach Profile
            </div>
            <FormField label="Specialty">
              <Input className="form-input-styled" value={coachSpecialty} onChange={(e) => setCoachSpecialty(e.target.value)} placeholder="e.g. Youth Development, Goalkeeping" />
            </FormField>
            <FormField label="License Level">
              <Input className="form-input-styled" value={coachLicense} onChange={(e) => setCoachLicense(e.target.value)} placeholder="e.g. UEFA A, UEFA B" />
            </FormField>
            <FormField label="Bio">
              <Textarea className="form-input-styled min-h-[80px] resize-none" value={coachBio} onChange={(e) => setCoachBio(e.target.value)} placeholder="Tell us about this coach..." />
            </FormField>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="form-footer">
        <Button variant="ghost" onClick={onCancel} className="px-6">Cancel</Button>
        <Button onClick={handleSubmit} disabled={submitting} className="px-8 gap-2">
          {submitting ? "Creating..." : (
            <>
              {entityLabels[entity].icon}
              Create {entity.charAt(0).toUpperCase() + entity.slice(1)}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default CreateEntityForm;

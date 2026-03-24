import React, { useEffect, useState } from "react";
import { RippleLoader } from "@/components/ui/ripple-loader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Save, Building2, Mail, Phone, MapPin, Image } from "lucide-react";

type Props = {
  orgId: number;
  onCancel: () => void;
  onSave: (payload: any) => void;
};

const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="form-label">{label}</label>
    {children}
  </div>
);

const EditOrganizationForm: React.FC<Props> = ({ orgId, onCancel, onSave }) => {
  const [form, setForm] = useState<any>({ id: orgId });

  const { data: org, isLoading, error } = useQuery({
    queryKey: ["organizations", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch organization");
      return res.json();
    },
    enabled: !!orgId,
  });

  useEffect(() => {
    if (org) {
      setForm({
        id: org.id,
        name: org.name || "",
        description: org.description || "",
        address: org.address || "",
        contactEmail: org.contactEmail || "",
        contactPhone: org.contactPhone || "",
        logoUrl: org.logoUrl || "",
      });
    }
  }, [org]);

  const handleChange = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));

  if (isLoading) return <div className="flex items-center justify-center p-8"><RippleLoader label="Loading organization details..." /></div>;
  if (error) return <div className="p-4 text-center text-destructive">Error loading organization details: {(error as Error).message}</div>;

  const handleSave = () => {
    const payload: any = { id: form.id || orgId };
    if (form.name) payload.name = form.name;
    if (form.description !== undefined) payload.description = form.description;
    if (form.address !== undefined) payload.address = form.address;
    if (form.contactEmail !== undefined) payload.contactEmail = form.contactEmail;
    if (form.contactPhone !== undefined) payload.contactPhone = form.contactPhone;
    if (form.logoUrl !== undefined) payload.logoUrl = form.logoUrl;
    onSave(payload);
  };

  return (
    <div className="space-y-5">
      {/* Basic Info */}
      <div className="form-section">
        <div className="form-section-title flex items-center gap-2">
          <Building2 size={18} className="text-primary" />
          General Information
        </div>
        <div className="grid grid-cols-1 gap-4">
          <FormField label="Organization Name">
            <Input 
              className="form-input-styled" 
              value={form.name || ""} 
              onChange={(e) => handleChange("name", e.target.value)} 
              placeholder="Organization Name" 
            />
          </FormField>
          <FormField label="Description">
            <Textarea 
              className="form-input-styled min-h-[80px] resize-none" 
              value={form.description || ""} 
              onChange={(e) => handleChange("description", e.target.value)} 
              placeholder="Tell us about your organization..." 
            />
          </FormField>
        </div>
      </div>

      {/* Contact Details */}
      <div className="form-section">
        <div className="form-section-title flex items-center gap-2">
          <Mail size={18} className="text-primary" />
          Contact Details
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Contact Email">
            <Input 
              className="form-input-styled" 
              value={form.contactEmail || ""} 
              onChange={(e) => handleChange("contactEmail", e.target.value)} 
              placeholder="email@example.com" 
            />
          </FormField>
          <FormField label="Contact Phone">
            <Input 
              className="form-input-styled" 
              value={form.contactPhone || ""} 
              onChange={(e) => handleChange("contactPhone", e.target.value)} 
              placeholder="+1 (555) 000-0000" 
            />
          </FormField>
        </div>
        <FormField label="Address">
          <div className="relative">
            <MapPin size={16} className="absolute left-3 top-3 text-muted-foreground" />
            <Input 
              className="form-input-styled pl-9" 
              value={form.address || ""} 
              onChange={(e) => handleChange("address", e.target.value)} 
              placeholder="123 Sport St, City, Country" 
            />
          </div>
        </FormField>
      </div>

      {/* Media */}
      <div className="form-section">
        <div className="form-section-title flex items-center gap-2">
          <Image size={18} className="text-primary" />
          Media
        </div>
        <FormField label="Logo URL">
          <Input 
            className="form-input-styled" 
            value={form.logoUrl || ""} 
            onChange={(e) => handleChange("logoUrl", e.target.value)} 
            placeholder="https://example.com/logo.png" 
          />
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

export default EditOrganizationForm;

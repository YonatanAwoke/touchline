import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Camera, Copy, ExternalLink, Shield, Bell, Globe, Palette, Moon, Sun, Monitor } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useQuery, useMutation } from "@tanstack/react-query";

const fetchUserProfile = async (userId: number) => {
  const res = await fetch(`/api/users/${userId}`);
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
};

const fetchOrganization = async (orgId: number) => {
  const res = await fetch(`/api/organizations/${orgId}`);
  if (!res.ok) throw new Error("Failed to fetch organization");
  return res.json();
};

const updateProfile = async ({ userId, data }: { userId: number; data: any }) => {
  const res = await fetch(`/api/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update profile");
  return res.json();
};

const changePassword = async (data: any) => {
  const res = await fetch(`/api/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to change password");
  return res.json();
};

const Settings = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  // Profile form state
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    username: "",
    phone: "",
    email: "",
    city: "",
    state: "",
    postcode: "",
    country: "",
  });

  // Password state
  const [passwordState, setPasswordState] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // System settings state
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("europe-london");
  const [notifications, setNotifications] = useState({
    emailUpdates: true,
    matchReminders: true,
    trainingAlerts: true,
    weeklyDigest: false,
    pushNotifications: true,
    soundAlerts: false,
  });

  const { data: userProfile, refetch: refetchUser } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: () => fetchUserProfile(user!.id),
    enabled: !!user?.id,
  });

  const { data: organization } = useQuery({
    queryKey: ["organization", user?.organizationId],
    queryFn: () => fetchOrganization(user!.organizationId!),
    enabled: !!user?.organizationId,
  });

  useEffect(() => {
    if (userProfile) {
      setProfile((prev) => ({
        ...prev,
        firstName: userProfile.firstName || "",
        lastName: userProfile.lastName || "",
        username: userProfile.username || "",
        email: userProfile.email || "",
      }));
    }
  }, [userProfile]);

  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      toast({ title: "Profile updated", description: "Your account settings have been saved." });
      refetchUser();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast({ title: "Password updated", description: "Your password has been changed successfully." });
      setPasswordState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to change password. Please check your current password.", variant: "destructive" });
    },
  });

  const profileLink = `https://app.touchline.io/u/${userProfile?.username || "user"}`;

  const handleProfileUpdate = () => {
    if (!user) return;
    profileMutation.mutate({
      userId: user.id,
      data: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        username: profile.username,
        email: profile.email,
      },
    });
  };

  const handlePasswordUpdate = () => {
    if (!passwordState.currentPassword || !passwordState.newPassword) {
      toast({ title: "Validation Error", description: "Please enter your current and new password.", variant: "destructive" });
      return;
    }
    if (passwordState.newPassword !== passwordState.confirmPassword) {
      toast({ title: "Validation Error", description: "New password and confirmation do not match.", variant: "destructive" });
      return;
    }
    passwordMutation.mutate({
      currentPassword: passwordState.currentPassword,
      newPassword: passwordState.newPassword,
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileLink);
    toast({ title: "Copied!", description: "Profile link copied to clipboard." });
  };

  const stats = [
    { label: "Matches coached", value: 26 },
  ];

  const initials = `${profile.firstName?.charAt(0) || ""}${profile.lastName?.charAt(0) || ""}`.toUpperCase() || userProfile?.username?.charAt(0).toUpperCase() || "U";

  return (
    <DashboardLayout title="Settings" subtitle="Manage your profile and preferences">
      {/* Cover Banner */}
      <div className="relative h-40 rounded-xl bg-gradient-to-r from-primary/80 via-primary to-primary/60 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-40" />
        <Button
          size="sm"
          variant="outline"
          className="absolute top-4 right-4 gap-2 bg-background/80 backdrop-blur-sm border-border hover:bg-background"
        >
          <Camera size={14} />
          Change Cover
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 -mt-16 relative z-10">
        {/* Left Profile Card */}
        <div className="w-full lg:w-72 shrink-0">
          <Card className="border-border">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <div className="relative mb-3">
                <Avatar className="h-24 w-24 border-4 border-background shadow-md">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">{initials}</AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors">
                  <Camera size={14} />
                </button>
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {profile.firstName || profile.lastName ? `${profile.firstName} ${profile.lastName}` : userProfile?.username || "User"}
              </h3>
              <p className="text-sm text-muted-foreground">{organization?.name || "No Organization"}</p>

              <Separator className="my-4" />

              <div className="w-full space-y-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{stat.label}</span>
                    <span className="font-semibold text-primary">{stat.value}</span>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <Button variant="outline" className="w-full gap-2 text-sm" size="sm">
                <ExternalLink size={14} />
                View Public Profile
              </Button>

              <div className="mt-3 flex items-center gap-2 w-full rounded-lg border border-border bg-muted/50 px-3 py-2">
                <span className="text-xs text-muted-foreground truncate flex-1">{profileLink}</span>
                <button onClick={handleCopyLink} className="text-muted-foreground hover:text-foreground transition-colors">
                  <Copy size={14} />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Tabbed Settings */}
        <div className="flex-1 min-w-0">
          <Card className="border-border">
            <Tabs defaultValue="account">
              <div className="border-b border-border px-6 pt-4">
                <TabsList className="bg-transparent h-auto p-0 gap-0">
                  {[
                    { value: "account", label: "Account Settings" },
                    { value: "organization", label: "Organization" },
                    { value: "appearance", label: "Appearance" },
                    { value: "notifications", label: "Notifications" },
                    { value: "security", label: "Security" },
                  ].map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {/* Account Settings */}
              <TabsContent value="account" className="p-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">First Name</Label>
                    <Input value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Last Name</Label>
                    <Input value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Username</Label>
                    <Input value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Email Address</Label>
                    <Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Phone Number</Label>
                    <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="Not supported yet" disabled />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">City</Label>
                    <Input value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} placeholder="Not supported yet" disabled />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">State / County</Label>
                    <Input value={profile.state} onChange={(e) => setProfile({ ...profile, state: e.target.value })} placeholder="Not supported yet" disabled />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Country</Label>
                    <Select value={profile.country} onValueChange={(v) => setProfile({ ...profile, country: v })} disabled>
                      <SelectTrigger>
                        <SelectValue placeholder="Not supported yet" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                        <SelectItem value="United States">United States</SelectItem>
                        <SelectItem value="Germany">Germany</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-3">
                  <Button onClick={handleProfileUpdate} disabled={profileMutation.isPending}>
                    {profileMutation.isPending ? "Saving..." : "Update"}
                  </Button>
                </div>
              </TabsContent>

              {/* Organization Settings */}
              <TabsContent value="organization" className="p-6 mt-0">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1">Organization Details</h3>
                    <p className="text-sm text-muted-foreground mb-4">You must have CLUB_ADMIN role to manage your organization's information.</p>
                  </div>
                  {organization ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Organization Name</Label>
                        <Input value={organization.name || ""} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Join Code (for invites)</Label>
                        <Input value={organization.joinCode || "No join code"} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Contact Email</Label>
                        <Input value={organization.contactEmail || ""} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Contact Phone</Label>
                        <Input value={organization.contactPhone || ""} disabled />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm text-muted-foreground">Address</Label>
                        <Input value={organization.address || ""} disabled />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Loading organization...</p>
                  )}
                  <div className="mt-2 text-xs text-muted-foreground">
                    Note: Direct editing of organization info is disabled from this view for standard coaches.
                  </div>
                </div>
              </TabsContent>

              {/* Appearance */}
              <TabsContent value="appearance" className="p-6 mt-0">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1">Appearance</h3>
                    <p className="text-sm text-muted-foreground mb-4">Customize how the app looks and feels.</p>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-foreground">Theme</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: "light", icon: Sun, label: "Light" },
                        { value: "dark", icon: Moon, label: "Dark" },
                        { value: "system", icon: Monitor, label: "System" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setTheme(opt.value as "light" | "dark" | "system")}
                          className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                            theme === opt.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-muted-foreground/30"
                          }`}
                        >
                          <opt.icon size={20} className={theme === opt.value ? "text-primary" : "text-muted-foreground"} />
                          <span className={`text-sm font-medium ${theme === opt.value ? "text-foreground" : "text-muted-foreground"}`}>
                            {opt.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground flex items-center gap-2">
                        <Globe size={14} /> Language
                      </Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Español</SelectItem>
                          <SelectItem value="fr">Français</SelectItem>
                          <SelectItem value="de">Deutsch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Timezone</Label>
                      <Select value={timezone} onValueChange={setTimezone}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="europe-london">Europe/London (GMT)</SelectItem>
                          <SelectItem value="europe-berlin">Europe/Berlin (CET)</SelectItem>
                          <SelectItem value="america-new_york">America/New York (EST)</SelectItem>
                          <SelectItem value="america-los_angeles">America/Los Angeles (PST)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Notifications */}
              <TabsContent value="notifications" className="p-6 mt-0">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1">Notifications</h3>
                    <p className="text-sm text-muted-foreground mb-4">Choose how and when you want to be notified.</p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                      <Bell size={15} /> Email Notifications
                    </h4>
                    {[
                      { key: "emailUpdates" as const, label: "Email updates", desc: "Receive important account updates via email" },
                      { key: "matchReminders" as const, label: "Match reminders", desc: "Get reminded before upcoming matches" },
                      { key: "trainingAlerts" as const, label: "Training alerts", desc: "Notifications for training session changes" },
                      { key: "weeklyDigest" as const, label: "Weekly digest", desc: "Receive a weekly summary of activities" },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between rounded-lg border border-border p-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                        <Switch
                          checked={notifications[item.key]}
                          onCheckedChange={(v) => setNotifications({ ...notifications, [item.key]: v })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Security */}
              <TabsContent value="security" className="p-6 mt-0">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1 flex items-center gap-2">
                      <Shield size={16} /> Security & Privacy
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">Manage your password and security preferences.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Current Password</Label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={passwordState.currentPassword}
                        onChange={(e) => setPasswordState({ ...passwordState, currentPassword: e.target.value })}
                      />
                    </div>
                    <div />
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">New Password</Label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={passwordState.newPassword}
                        onChange={(e) => setPasswordState({ ...passwordState, newPassword: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Confirm New Password</Label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={passwordState.confirmPassword}
                        onChange={(e) => setPasswordState({ ...passwordState, confirmPassword: e.target.value })}
                      />
                    </div>
                  </div>

                  <Button onClick={handlePasswordUpdate} disabled={passwordMutation.isPending}>
                    {passwordMutation.isPending ? "Updating..." : "Update Password"}
                  </Button>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground">Two-Factor Authentication</h4>
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">Enable 2FA</p>
                        <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
                      </div>
                      <Switch />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground">Danger Zone</h4>
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                      <p className="text-sm font-medium text-foreground">Delete Account</p>
                      <p className="text-xs text-muted-foreground mb-3">Permanently delete your account and all associated data.</p>
                      <Button variant="destructive" size="sm">Delete Account</Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;


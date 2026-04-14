import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuth from "@/lib/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import {
  Home,
  Users,
  CalendarDays,
  Video,
  Clock,
  Settings,
  LogOut,
  Search,
  Bell,
  Building2,
  Shield,
  Trophy,
  ClipboardCheck,
} from "lucide-react";

const sidebarItems = [
  { icon: Home, label: "Home", path: "/dashboard" },
  { icon: Users, label: "Players", path: "/dashboard/players" },
  { icon: Shield, label: "Clubs", path: "/dashboard/clubs" },
  { icon: Trophy, label: "Matches & Training", path: "/dashboard/matches-training" },
  { icon: Building2, label: "Organization", path: "/dashboard/organization" },
  { icon: Users, label: "Coaches", path: "/dashboard/coaches" },
  { icon: Video, label: "Analysis", path: "/dashboard/analysis" },
  { icon: ClipboardCheck, label: "Examination", path: "/dashboard/examination" },
  { icon: CalendarDays, label: "Schedule", path: "/dashboard/schedule" },
  { icon: Clock, label: "History", path: "/dashboard/history" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title, subtitle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const displayUser = user || { username: "Demo User", email: "demo@touchline.com", id: 0, role: "coach" };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar collapsible="icon">
          <SidebarHeader className="items-center">
            <span className="text-xl font-black italic text-primary">T</span>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sidebarItems.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        asChild
                        isActive={location.pathname === item.path}
                        tooltip={item.label}
                      >
                        <NavLink to={item.path} end activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                          <item.icon size={20} />
                          <span>{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Logout" onClick={() => logout()}>
                  <LogOut size={20} />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-10">
          {/* Top bar */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-1" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary">
                <Search size={18} />
              </button>
              <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary">
                <Bell size={18} />
              </button>
            </div>
          </div>

          <div className="mt-8">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;

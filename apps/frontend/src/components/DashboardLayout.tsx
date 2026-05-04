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
  useSidebar,
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
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const SidebarBrand: React.FC = () => {
  const { state, isMobile } = useSidebar();
  // On mobile the sidebar is always rendered "expanded" inside a sheet,
  // so we should always show the full wordmark there.
  const expanded = isMobile || state === "expanded";
  return (
    <div className="relative flex h-9 w-full items-center justify-center overflow-hidden">
      {/* Standalone T (collapsed state) */}
      <span
        aria-hidden={expanded}
        className={`pointer-events-none absolute inset-0 flex items-center justify-center text-2xl font-black italic leading-none text-primary transition-all duration-300 ease-out ${
          expanded ? "scale-75 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        T
      </span>
      {/* Full TOUCHLINE wordmark (expanded state) */}
      <span
        aria-hidden={!expanded}
        className={`pointer-events-none absolute inset-0 flex items-center justify-center whitespace-nowrap text-xl font-black italic leading-none tracking-tight transition-all duration-300 ease-out ${
          expanded ? "scale-100 opacity-100" : "scale-90 opacity-0"
        }`}
      >
        <span className="text-primary">T</span>
        <span className="text-foreground">OUCHLINE</span>
      </span>
    </div>
  );
};

const SIDEBAR_STORAGE_KEY = "touchline-sidebar-open";

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title, subtitle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });

  React.useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarOpen));
  }, [sidebarOpen]);

  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (searchOpen) {
      // wait for transition to start, then focus
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [searchOpen]);

  const displayUser = user || { username: "Demo User", email: "demo@touchline.com", id: 0, role: "coach" };

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <div className="flex min-h-screen w-full">
        <Sidebar collapsible="icon">
          <SidebarHeader className="items-center px-2">
            <SidebarBrand />
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
              <div
                className={`flex h-9 items-center rounded-lg border border-border bg-background overflow-hidden transition-[width] duration-300 ease-out ${
                  searchOpen ? "w-64" : "w-9"
                }`}
              >
                <button
                  type="button"
                  aria-label="Toggle search"
                  onClick={() => {
                    if (searchOpen) {
                      setSearchValue("");
                      setSearchOpen(false);
                    } else {
                      setSearchOpen(true);
                    }
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-secondary"
                >
                  <Search size={18} />
                </button>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onBlur={() => {
                    if (!searchValue) setSearchOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setSearchValue("");
                      setSearchOpen(false);
                    }
                  }}
                  placeholder="Search..."
                  tabIndex={searchOpen ? 0 : -1}
                  className={`h-full flex-1 bg-transparent pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground transition-opacity duration-200 ${
                    searchOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
                />
              </div>
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

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Me from "./pages/Me";
import Dashboard from "./pages/Dashboard";
import Organization from "./pages/Organization";
import Clubs from "./pages/Clubs";
import Players from "./pages/Players";
import CreateOrganization from "./pages/CreateOrganization";
import CreateClub from "./pages/CreateClub";
import CreatePlayer from "./pages/CreatePlayer";
import Coaches from "./pages/Coaches";
import CreateCoach from "./pages/CreateCoach";
import RequireAuth from "./components/RequireAuth";
import Landing from "./pages/Landing";
import EarlyAccess from "./pages/EarlyAccess";
import MatchesTraining from "./pages/MatchesTraining";
import Schedule from "./pages/Schedule";
import Settings from "./pages/Settings";
import Analysis from "./pages/Analysis";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./lib/auth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
 <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/me" element={<Me />} />
            {/* <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} /> */}
            <Route path="/dashboard" element={<Dashboard />} />
            {/* <Route path="/dashboard/players" element={<RequireAuth><Players /></RequireAuth>} /> */}
            <Route path="/dashboard/players" element={<Players />} />
            {/* <Route path="/dashboard/organization" element={<RequireAuth><Organization /></RequireAuth>} /> */}
            <Route path="/dashboard/organization" element={<Organization />} />
            {/* <Route path="/dashboard/clubs" element={<RequireAuth><Clubs /></RequireAuth>} /> */}
            <Route path="/dashboard/clubs" element={<Clubs />} />
            <Route path="/dashboard/coaches" element={<Coaches />} />
            <Route path="/dashboard/create-coach" element={<CreateCoach />} />
            {/* <Route path="/dashboard/create-organization" element={<RequireAuth><CreateOrganization /></RequireAuth>} /> */}
            <Route path="/dashboard/create-organization" element={<CreateOrganization />} />
            {/* <Route path="/dashboard/create-club" element={<RequireAuth><CreateClub /></RequireAuth>} /> */}
            <Route path="/dashboard/create-club" element={<CreateClub />} />
            {/* <Route path="/dashboard/create-player" element={<RequireAuth><CreatePlayer /></RequireAuth>} /> */}
            <Route path="/dashboard/create-player" element={<CreatePlayer />} />
            <Route path="/dashboard/matches-training" element={<MatchesTraining />} />
            <Route path="/dashboard/schedule" element={<Schedule />} />
            <Route path="/dashboard/analysis" element={<Analysis />} />
            <Route path="/dashboard/settings" element={<Settings />} />
            <Route path="/early-access" element={<EarlyAccess />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import React from "react";
import useAuth from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, Settings, ArrowUpRight, Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const resultColor: Record<string, string> = {
  Win: "text-primary",
  Draw: "text-muted-foreground",
  Loss: "text-destructive",
  Upcoming: "text-accent-foreground",
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const displayUser = user || { username: "Demo User" };

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  // Fetch Dashboard Stats
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load stats");
      return res.json();
    }
  });

  // Fetch Last Three Games
  const { data: matchesData } = useQuery({
    queryKey: ["last-matches"],
    queryFn: async () => {
      const res = await fetch("/api/matches?limit=3", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load matches");
      return res.json();
    }
  });
  const lastGames = matchesData?.items ?? [];

  const getMatchResult = (match: any) => {
    if (!match.result) return "Upcoming";
    const { homeScore, awayScore } = match.result;
    if (homeScore > awayScore) return "Win";
    if (homeScore < awayScore) return "Loss";
    return "Draw";
  };

  const statCards = [
    { title: "Total Players", subtitle: "Registered athletes", value: stats?.players ?? 0 },
    { title: "Total Clubs", subtitle: "Number of teams", value: stats?.teams ?? 0 },
    { title: "Total Organization", subtitle: "Active organizations", value: stats?.organizations ?? 0 },
    { title: "Total Coaches", subtitle: "Assigned coaches", value: stats?.coaches ?? 0 },
  ];

  return (
    <DashboardLayout title={`Welcome, ${displayUser.username || "User"}`} subtitle={today}>
      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-border">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <h3 className="text-base font-semibold text-foreground">{stat.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{stat.subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-foreground">{stat.value}</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background">
                  <ArrowUpRight size={16} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Schedule + Last Games */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold text-foreground">
            Current Progress <span className="text-sm font-normal text-muted-foreground">(Monthly Activity)</span>
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Card className="border-border">
              <CardContent className="p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                  <Users size={20} className="text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Training Progress</h3>
                <div className="mt-4">
                  <Progress value={20} className="h-2" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">4</span>/20 Planned Sessions
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                  <Trophy size={20} className="text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Match Performance</h3>
                <div className="mt-4">
                  <Progress value={40} className="h-2" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">4</span>/10 Completed Matches
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground">Recent Performance</h2>
          <Card className="mt-4 border-border">
            <CardContent className="flex flex-col gap-4 p-5">
              {lastGames.length > 0 ? (
                lastGames.map((game: any) => {
                  const result = getMatchResult(game);
                  return (
                    <div key={game.id} className="flex items-center gap-3">
                      <Trophy size={18} className={resultColor[result]} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          Vs {game.opponent}
                        </p>
                        <p className={`text-xs ${resultColor[result]}`}>
                          {result} {game.result ? `(${game.result.homeScore}-${game.result.awayScore})` : ""}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">No recent matches found.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

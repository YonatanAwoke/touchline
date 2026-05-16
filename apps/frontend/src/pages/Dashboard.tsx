import React, { useState } from "react";
import useAuth from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, Settings, ArrowUpRight, Trophy, Calendar as CalendarIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { Link } from "react-router-dom";
import DashboardMetrics from "@/components/dashboard/DashboardMetrics";

const resultColor: Record<string, string> = {
  Win: "text-primary",
  Draw: "text-muted-foreground",
  Loss: "text-destructive",
  Upcoming: "text-accent-foreground",
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const displayUser = user || { username: "Demo User" };

  const today = format(new Date(), "PP");

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  // Fetch Dashboard Stats with progress range
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", dateRange?.from, dateRange?.to],
    queryFn: async () => {
      let url = "/api/stats";
      if (dateRange?.from && dateRange?.to) {
        url += `?from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`;
      }
      const res = await fetch(url, { credentials: "include" });
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
    { title: "Total Players", subtitle: "Registered athletes", value: stats?.players ?? 0, path: "/dashboard/players" },
    { title: "Total Clubs", subtitle: "Number of teams", value: stats?.teams ?? 0, path: "/dashboard/clubs" },
    { title: "Total Organization", subtitle: "Active organizations", value: stats?.organizations ?? 0, path: "/dashboard/organization" },
    { title: "Total Coaches", subtitle: "Assigned coaches", value: stats?.coaches ?? 0, path: "/dashboard/coaches" },
  ];

  const totalSessions = stats?.progress?.totalSessions || 0;
  const completedSessions = stats?.progress?.completedSessions || 0;
  const sessionProgress = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

  const totalMatches = stats?.progress?.totalMatches || 0;
  const completedMatches = stats?.progress?.completedMatches || 0;
  const matchProgress = totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;

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
                <Link
                  to={stat.path}
                  aria-label={`Go to ${stat.title}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background transition-transform hover:scale-105 hover:bg-primary hover:text-primary-foreground"
                >
                  <ArrowUpRight size={16} />
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Schedule + Last Games */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">
              Current Progress
            </h2>
            <div className="mt-2 sm:mt-0 flex items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "w-[260px] justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Card className="border-border">
              <CardContent className="p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                  <Users size={20} className="text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Training Progress</h3>
                <div className="mt-4">
                  <Progress value={sessionProgress} className="h-2" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{completedSessions}</span>/{totalSessions} Planned Sessions
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
                  <Progress value={matchProgress} className="h-2" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{completedMatches}</span>/{totalMatches} Completed Matches
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div>
           <h2 className="text-xl font-bold text-foreground">Recent Performance</h2>
          <Card className="mt-4 border-border h-[calc(100%-3rem)] min-h-[300px]">
             <CardContent className="flex flex-col gap-4 p-5 h-full">
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

      {/* Performance Metrics */}
      <div className="mt-10">
        <h2 className="mb-4 text-xl font-bold text-foreground">Performance Metrics</h2>
        <DashboardMetrics />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

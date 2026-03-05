import React from "react";
import useAuth from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, Settings, ArrowUpRight, Trophy } from "lucide-react";

const statCards = [
  { title: "Open Players", subtitle: "Number of players", value: 50 },
  { title: "Open Clubs", subtitle: "Number of teams", value: 2 },
  { title: "Open Organization", subtitle: "Number of Organization", value: 2 },
  { title: "Open Coaches", subtitle: "Number of coaches", value: 4 },
];

const lastGames = [
  { opponent: "Bole FC", result: "Win" as const },
  { opponent: "Gerji FC", result: "Draw" as const },
  { opponent: "Tulu Dimtu", result: "Loss" as const },
];

const resultColor = {
  Win: "text-primary",
  Draw: "text-muted-foreground",
  Loss: "text-destructive",
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const displayUser = user || { username: "Demo User" };

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

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
            Upcoming Schedule <span className="text-sm font-normal text-muted-foreground">(Monthly)</span>
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Card className="border-border">
              <CardContent className="p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                  <Users size={20} className="text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Training Session</h3>
                <div className="mt-4">
                  <Progress value={20} className="h-2" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">4</span>/20 Sessions
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                  <Settings size={20} className="text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Match Day</h3>
                <div className="mt-4">
                  <Progress value={40} className="h-2" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">4</span>/10 Matches
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground">Last Three Games</h2>
          <Card className="mt-4 border-border">
            <CardContent className="flex flex-col gap-4 p-5">
              {lastGames.map((game) => (
                <div key={game.opponent} className="flex items-center gap-3">
                  <Trophy size={18} className={resultColor[game.result]} />
                  <span className="text-sm font-medium text-foreground">
                    Vs {game.opponent} <span className={resultColor[game.result]}>({game.result})</span>
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

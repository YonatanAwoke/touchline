"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Session {
    id: string;
    title: string;
    date: string;
    _count: {
        videos: number;
    };
}

const fetchSessions = async (): Promise<Session[]> => {
    const response = await fetch("/api/proxy/sessions");
    if (!response.ok) throw new Error("Failed to fetch sessions");
    return response.json();
};

export default function SessionsPage() {
    const { data: sessions, isLoading } = useQuery({
        queryKey: ["sessions"],
        queryFn: fetchSessions,
    });

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Training Sessions</h1>
                    <p className="text-muted-foreground mt-2">Manage and analyze your team's training sessions.</p>
                </div>
                <Button className="rounded-full shadow-lg">
                    <Plus className="mr-2 h-4 w-4" /> New Session
                </Button>
            </div>

            <Card className="border-none shadow-xl bg-card/50 backdrop-blur">
                <CardHeader>
                    <CardTitle>All Sessions</CardTitle>
                    <CardDescription>A list of your recent coaching sessions and their video analysis status.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Videos</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10">Loading sessions...</TableCell>
                                </TableRow>
                            ) : sessions?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10">No sessions found. Create your first one!</TableCell>
                                </TableRow>
                            ) : (
                                sessions?.map((session) => (
                                    <TableRow key={session.id} className="hover:bg-accent/50 cursor-pointer transition-colors">
                                        <TableCell className="font-medium">{session.title}</TableCell>
                                        <TableCell>{new Date(session.date).toLocaleDateString()}</TableCell>
                                        <TableCell>{session._count.videos} videos</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">View Analysis</Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

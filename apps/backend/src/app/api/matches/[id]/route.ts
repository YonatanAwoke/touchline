import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth } from "@/lib/security";
import { matchUpdateSchema } from "@/lib/validation";

/**
 * @openapi
 * /api/matches/{id}:
 *   get:
 *     summary: Get match details
 *     tags:
 *       - Matches
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Match id
 *     responses:
 *       200:
 *         description: Match details
 *       404:
 *         description: Not found
 *       500:
 *         description: Internal server error
 *   patch:
 *     summary: Update a match
 *     tags:
 *       - Matches
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               opponent:
 *                 type: string
 *               competition:
 *                 type: string
 *                 enum: [LEAGUE, CUP, FRIENDLY, OTHER]
 *               venue:
 *                 type: string
 *               matchDate:
 *                 type: string
 *                 format: date-time
 *               result:
 *                 type: object
 *                 properties:
 *                   homeScore:
 *                     type: integer
 *                   awayScore:
 *                     type: integer
 *                   homePenalties:
 *                     type: integer
 *                   awayPenalties:
 *                     type: integer
 *                   details:
 *                     type: string
 *                   scorers:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         playerId:
 *                           type: integer
 *                         playerName:
 *                           type: string
 *                         minute:
 *                           type: string
 *                         isHomeTeam:
 *                           type: boolean
 *                         goalCount:
 *                           type: integer
 *     responses:
 *       200:
 *         description: Match updated
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete a match
 *     tags:
 *       - Matches
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       204:
 *         description: Match deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *       500:
 *         description: Internal server error
 */
export async function GET(request: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    try {
        const resolvedParams = await params as any;
        const id = Number(resolvedParams.id);

        const match = await prisma.match.findUnique({
            where: { id },
            include: {
                team: true,
                videos: true,
                result: {
                    include: { 
                        scorers: {
                            include: { player: { include: { user: { select: { username: true } } } } }
                        } 
                    }
                }
            }
        });

        if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

        if (session.role !== "SUPER_ADMIN" && session.organizationId !== match.team.organizationId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json(match);
    } catch (error) {
        console.error("Get match error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    try {
        const resolvedParams = await params as any;
        const id = Number(resolvedParams.id);

        let body;
        try {
            const text = await request.text();
            body = text ? JSON.parse(text) : {};
        } catch (e) {
            return NextResponse.json({ error: "Invalid JSON input" }, { status: 400 });
        }

        const result = matchUpdateSchema.safeParse(body);
        if (!result.success) return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });

        const existing = await prisma.match.findUnique({
            where: { id },
            include: {
                team: true,
                result: true
            }
        });

        if (!existing) return NextResponse.json({ error: "Match not found" }, { status: 404 });

        if (session.role === "SUPER_ADMIN") {
            // allowed
        } else if (session.role === "CLUB_ADMIN") {
            if (session.organizationId !== existing.team.organizationId) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        } else if (session.role === "COACH" || session.role === "ANALYST") {
            // Check if coach is assigned to the team
            if (!session.coachId || session.coachId !== existing.team.coachId) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
            // Also verify organization just in case
            if (session.organizationId !== existing.team.organizationId) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        } else {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const updateData: any = {};
        if (typeof result.data.opponent !== "undefined") updateData.opponent = result.data.opponent;
        if (typeof result.data.competition !== "undefined") updateData.competition = result.data.competition;
        if (typeof result.data.venue !== "undefined") updateData.venue = result.data.venue;
        if (typeof result.data.matchDate !== "undefined") updateData.matchDate = new Date(result.data.matchDate);

        if (typeof result.data.result !== "undefined") {
            if (existing.result) {
                updateData.result = {
                    update: {
                        homeScore: result.data.result.homeScore,
                        awayScore: result.data.result.awayScore,
                        homePenalties: result.data.result.homePenalties,
                        awayPenalties: result.data.result.awayPenalties,
                        details: result.data.result.details,
                        scorers: {
                            deleteMany: {}, // Simplest way to update scorers is to replace them
                            create: result.data.result.scorers.map(s => ({
                                playerId: s.playerId,
                                playerName: s.playerName,
                                minute: s.minute,
                                isHomeTeam: s.isHomeTeam,
                                goalCount: s.goalCount
                            }))
                        }
                    }
                };
            } else {
                updateData.result = {
                    create: {
                        homeScore: result.data.result.homeScore,
                        awayScore: result.data.result.awayScore,
                        homePenalties: result.data.result.homePenalties,
                        awayPenalties: result.data.result.awayPenalties,
                        details: result.data.result.details,
                        scorers: {
                            create: result.data.result.scorers.map(s => ({
                                playerId: s.playerId,
                                playerName: s.playerName,
                                minute: s.minute,
                                isHomeTeam: s.isHomeTeam,
                                goalCount: s.goalCount
                            }))
                        }
                    }
                };
            }
        }

        const updated = await prisma.match.update({
            where: { id },
            data: updateData,
            include: {
                result: {
                    include: { 
                        scorers: {
                            include: { player: { include: { user: { select: { username: true } } } } }
                        } 
                    }
                }
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Update match error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    try {
        const resolvedParams = await params as any;
        const id = Number(resolvedParams.id);

        const existing = await prisma.match.findUnique({
            where: { id },
            include: { team: true }
        });

        if (!existing) return NextResponse.json({ error: "Match not found" }, { status: 404 });

        if (session.role === "SUPER_ADMIN") {
            // allowed
        } else if (session.role === "CLUB_ADMIN") {
            if (session.organizationId !== existing.team.organizationId) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        } else if (session.role === "COACH" || session.role === "ANALYST") {
            if (!session.coachId || session.coachId !== existing.team.coachId) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
            if (session.organizationId !== existing.team.organizationId) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        } else {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.match.delete({ where: { id } });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("Delete match error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

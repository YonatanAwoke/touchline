import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth } from "@/lib/security";
import { matchCreateSchema } from "@/lib/validation";

/**
 * @openapi
 * /api/matches:
 *   post:
 *     summary: Create a new match
 *     tags:
 *       - Matches
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - teamId
 *               - opponent
 *               - matchDate
 *             properties:
 *               teamId:
 *                 type: integer
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
 *       201:
 *         description: Match created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
export async function POST(request: Request) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    try {
        let body;
        try {
            const text = await request.text();
            body = text ? JSON.parse(text) : {};
        } catch (e) {
            return NextResponse.json({ error: "Invalid JSON input" }, { status: 400 });
        }

        const result = matchCreateSchema.safeParse(body);
        if (!result.success) return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });

        const { teamId, opponent, competition, venue, matchDate, result: matchResultData } = result.data;

        // Verify team exists and belongs to the same org
        const team = await prisma.team.findUnique({ where: { id: teamId } });
        if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

        if (session.role !== "SUPER_ADMIN" && session.organizationId !== team.organizationId) {
            return NextResponse.json({ error: "Forbidden - cannot create match for this team" }, { status: 403 });
        }

        const match = await prisma.match.create({
            data: {
                teamId,
                opponent,
                competition: competition as any,
                venue,
                matchDate: new Date(matchDate),
                result: matchResultData ? {
                    create: {
                        homeScore: matchResultData.homeScore,
                        awayScore: matchResultData.awayScore,
                        homePenalties: matchResultData.homePenalties,
                        awayPenalties: matchResultData.awayPenalties,
                        details: matchResultData.details,
                        scorers: {
                            create: matchResultData.scorers.map(s => ({
                                playerId: s.playerId,
                                playerName: s.playerName,
                                minute: s.minute,
                                isHomeTeam: s.isHomeTeam,
                                goalCount: s.goalCount
                            }))
                        }
                    }
                } : undefined
            },
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

        return NextResponse.json(match, { status: 201 });
    } catch (error) {
        console.error("Create match error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * @openapi
 * /api/matches:
 *   get:
 *     summary: List matches
 *     tags:
 *       - Matches
 *     parameters:
 *       - in: query
 *         name: teamId
 *         schema:
 *           type: integer
 *         required: false
 *         description: Filter matches by team id
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         required: false
 *         description: Number of items to return (default 25, max 100)
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *         required: false
 *         description: Number of items to skip
 *     responses:
 *       200:
 *         description: List of matches
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: Request) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    try {
        const url = new URL(request.url);
        const params = url.searchParams;
        const skip = parseInt(params.get("skip") || "0", 10) || 0;
        const take = Math.min(parseInt(params.get("limit") || "25", 10) || 25, 100);
        const teamIdParam = params.get("teamId");

        const where: any = {};
        if (teamIdParam) {
            where.teamId = Number(teamIdParam);
        }

        // If not SUPER_ADMIN, filter by organization through Team
        if (session.role !== "SUPER_ADMIN") {
            where.team = { organizationId: session.organizationId };
        }

        const [items, total] = await prisma.$transaction([
            prisma.match.findMany({
                where,
                include: {
                    team: true,
                    result: {
                        include: { 
                            scorers: {
                                include: { player: { include: { user: { select: { username: true } } } } }
                            } 
                        }
                    }
                },
                skip,
                take,
                orderBy: { matchDate: 'desc' }
            }),
            prisma.match.count({ where })
        ]);

        return NextResponse.json({ items, total, skip, limit: take });
    } catch (error) {
        console.error("List matches error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

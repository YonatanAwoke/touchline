import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth } from "@/lib/security";
import { matchAnalysisCreateSchema } from "@/lib/validation";

/**
 * @openapi
 * /api/examinations/match:
 *   post:
 *     summary: Create a new match analysis
 *     tags:
 *       - Examinations
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, date, homeTeam, awayTeam, matchStats, matchEvents]
 *     responses:
 *       201:
 *         description: Match analysis created
 */
export async function POST(request: Request) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    try {
        const body = await request.json();
        const result = matchAnalysisCreateSchema.safeParse({ ...body, organizationId: session.organizationId });
        if (!result.success) return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });

        const data = result.data;
        const analysis = await prisma.matchAnalysis.create({
            data: {
                title: data.title,
                date: new Date(data.date),
                matchId: data.matchId,
                homeTeam: data.homeTeam,
                awayTeam: data.awayTeam,
                notes: data.notes,
                inputMode: data.inputMode,
                videoId: data.videoId,
                matchStats: data.matchStats,
                matchEvents: data.matchEvents,
                organizationId: session.organizationId,
            }
        });

        return NextResponse.json(analysis, { status: 201 });
    } catch (error) {
        console.error("Create match analysis error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * @openapi
 * /api/examinations/match:
 *   get:
 *     summary: List match analyses
 *     tags:
 *       - Examinations
 *     parameters:
 *       - in: query
 *         name: matchId
 *         schema:
 *           type: integer
 */
export async function GET(request: Request) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    const url = new URL(request.url);
    const matchId = url.searchParams.get("matchId");

    try {
        const where: any = { organizationId: session.organizationId };
        if (matchId) where.matchId = Number(matchId);

        const items = await prisma.matchAnalysis.findMany({
            where,
            orderBy: { date: 'desc' }
        });
        return NextResponse.json({ items });
    } catch (error) {
        console.error("List match analyses error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

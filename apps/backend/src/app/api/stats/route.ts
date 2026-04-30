import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth } from "@/lib/security";

/**
 * @openapi
 * /api/stats:
 *   get:
 *     summary: Get dashboard statistics (counts)
 *     description: Includes progressive counts (trainings/matches) if from/to are passed. Defaults to current month.
 *     tags:
 *       - Stats
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Statistics object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: Request) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    const { searchParams } = new URL(request.url);
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");

    let from: Date;
    let to: Date;

    const now = new Date();
    if (fromStr && toStr) {
        from = new Date(fromStr);
        to = new Date(toStr);
    } else {
        // Default to current month boundary
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Ensure valid Dates
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return NextResponse.json({ error: "Invalid date params" }, { status: 400 });
    }

    try {
        const organizationId = session.organizationId;
        const isSuperAdmin = session.role === "SUPER_ADMIN";

        const where: any = isSuperAdmin ? {} : { organizationId };
        const playerWhere: any = isSuperAdmin ? {} : { user: { organizationId } };
        const coachWhere: any = isSuperAdmin ? {} : { user: { organizationId } };

        const [
            playerCount, 
            teamCount, 
            orgCount, 
            coachCount,
            totalSessions,
            completedSessions,
            totalMatches,
            completedMatches
        ] = await Promise.all([
            // existing overview
            prisma.player.count({ where: playerWhere }),
            prisma.team.count({ where }),
            isSuperAdmin ? prisma.organization.count() : Promise.resolve(1),
            prisma.coach.count({ where: coachWhere }),

            // progressive details
            prisma.session.count({
                where: { ...where, date: { gte: from, lte: to } }
            }),
            prisma.session.count({
                where: { ...where, date: { gte: from, lte: to }, status: "COMPLETED" } // COMPLETED status session
            }),
            prisma.match.count({
                // Note: match needs team relation since it doesn't directly have organizationId
                where: isSuperAdmin 
                    ? { matchDate: { gte: from, lte: to } }
                    : { matchDate: { gte: from, lte: to }, team: { organizationId } }
            }),
            prisma.match.count({
                where: isSuperAdmin
                    ? { matchDate: { gte: from, lte: to }, result: { isNot: null } }
                    : { matchDate: { gte: from, lte: to }, team: { organizationId }, result: { isNot: null } }
            })
        ]);

        return NextResponse.json({
            players: playerCount,
            teams: teamCount,
            organizations: isSuperAdmin ? orgCount : 1,
            coaches: coachCount,
            progress: {
                totalSessions,
                completedSessions,
                totalMatches,
                completedMatches
            }
        });
    } catch (error) {
        console.error("Get stats error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

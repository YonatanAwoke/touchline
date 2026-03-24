import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth } from "@/lib/security";

/**
 * @openapi
 * /api/stats:
 *   get:
 *     summary: Get dashboard statistics (counts)
 *     tags:
 *       - Stats
 *     responses:
 *       200:
 *         description: Statistics object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET() {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    try {
        const organizationId = session.organizationId;
        const isSuperAdmin = session.role === "SUPER_ADMIN";

        const where: any = isSuperAdmin ? {} : { organizationId };
        const playerWhere: any = isSuperAdmin ? {} : { user: { organizationId } };
        const coachWhere: any = isSuperAdmin ? {} : { user: { organizationId } };

        const [playerCount, teamCount, orgCount, coachCount] = await Promise.all([
            prisma.player.count({ where: playerWhere }),
            prisma.team.count({ where }),
            isSuperAdmin ? prisma.organization.count() : Promise.resolve(1),
            prisma.coach.count({ where: coachWhere }),
        ]);

        return NextResponse.json({
            players: playerCount,
            teams: teamCount,
            organizations: isSuperAdmin ? orgCount : 1,
            coaches: coachCount
        });
    } catch (error) {
        console.error("Get stats error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

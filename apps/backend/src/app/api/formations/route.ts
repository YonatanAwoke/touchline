import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth } from "@/lib/security";

/**
 * @openapi
 * /api/formations:
 *   post:
 *     summary: Create a new formation
 *     tags:
 *       - Formations
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - teamId
 *               - positions
 *             properties:
 *               name:
 *                 type: string
 *               teamId:
 *                 type: integer
 *               positions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                     x:
 *                       type: number
 *                     y:
 *                       type: number
 *                     playerId:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Formation created
 *       400:
 *         description: Missing fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function POST(request: Request) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const body = await request.json();
        const { name, teamId, positions, template } = body;

        if (!name || !teamId || !positions || !template) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Create the formation and its positions in a transaction
        const formation = await prisma.$transaction(async (tx) => {
            // If this is the first formation for the team, or specified as active, deactivate others
            const count = await tx.formation.count({ where: { teamId } });
            const isActive = count === 0 ? true : (body.isActive || false);

            if (isActive) {
                await tx.formation.updateMany({
                    where: { teamId },
                    data: { isActive: false }
                });
            }

            return tx.formation.create({
                data: {
                    name,
                    teamId,
                    template,
                    isActive,
                    positions: {
                        create: positions.map((p: any) => ({
                            role: p.role,
                            x: p.x,
                            y: p.y,
                            playerId: p.playerId || null
                        }))
                    }
                },
                include: {
                    positions: true
                }
            });
        });

        return NextResponse.json(formation, { status: 201 });
    } catch (error) {
        console.error("Create formation error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * @openapi
 * /api/formations:
 *   get:
 *     summary: List formations for a team
 *     tags:
 *       - Formations
 *     parameters:
 *       - in: query
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of formations
 *       400:
 *         description: Missing teamId
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: Request) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const url = new URL(request.url);
        const teamId = url.searchParams.get("teamId");

        if (!teamId) {
            return NextResponse.json({ error: "teamId is required" }, { status: 400 });
        }

        const formations = await prisma.formation.findMany({
            where: { teamId: Number(teamId) },
            include: {
                positions: {
                    include: {
                        player: {
                            include: {
                                user: {
                                    select: {
                                        username: true,
                                        email: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { updatedAt: "desc" }
        });

        return NextResponse.json(formations);
    } catch (error) {
        console.error("List formations error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

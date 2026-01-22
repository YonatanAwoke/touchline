import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth, requireRole } from "@/lib/security";
import { teamUpdateSchema } from "@/lib/validation";

/**
 * @openapi
 * /api/teams/{id}:
 *   get:
 *     summary: Get a single team by id
 *     tags:
 *       - Teams
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Team object with relations
 *       404:
 *         description: Team not found
 *       500:
 *         description: Internal server error
 */
export async function GET(request: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params as any;
        const id = Number(resolvedParams.id);
        const userSafeSelect = {
            id: true,
            email: true,
            username: true,
            role: true,
            organizationId: true,
            createdAt: true,
            updatedAt: true,
        };

        const team = await prisma.team.findUnique({
            where: { id },
            include: {
                coach: { include: { user: { select: userSafeSelect } } },
                players: { include: { user: { select: userSafeSelect } } }
            }
        });

        if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

        return NextResponse.json(team);
    } catch (error) {
        console.error("Get team error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * @openapi
 * /api/teams/{id}:
 *   patch:
 *     summary: Update a team's properties
 *     tags:
 *       - Teams
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               coachId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Team updated
 *       400:
 *         description: Validation failed or bad input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Team or Coach not found
 *       500:
 *         description: Internal server error
 */
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

        const result = teamUpdateSchema.safeParse(body);
        if (!result.success) return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });

        const team = await prisma.team.findUnique({ where: { id } });
        if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

        // Permission: SUPER_ADMIN or CLUB_ADMIN of org, or the team's coach (if session.coachId matches)
        if (session.role !== "SUPER_ADMIN" && session.role !== "CLUB_ADMIN") {
            if (!session.coachId || session.coachId !== team.coachId) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        const updateData: any = {};
        if (result.data.name) updateData.name = result.data.name;
        if (typeof result.data.coachId !== "undefined") {
            // validate coach
            const coach = await prisma.coach.findUnique({ where: { id: result.data.coachId }, include: { user: true } });
            if (!coach) return NextResponse.json({ error: "Coach not found" }, { status: 404 });
            if (coach.user.organizationId !== team.organizationId) {
                return NextResponse.json({ error: "Coach does not belong to this organization" }, { status: 400 });
            }
            updateData.coachId = result.data.coachId;
        }

        const userSafeSelect = {
            id: true,
            email: true,
            username: true,
            role: true,
            organizationId: true,
            createdAt: true,
            updatedAt: true,
        };

        const updated = await prisma.team.update({ where: { id }, data: updateData, include: { coach: { include: { user: { select: userSafeSelect } } }, players: { include: { user: { select: userSafeSelect } } } } });
        return NextResponse.json(updated);
    } catch (error) {
        console.error("Update team error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * @openapi
 * /api/teams/{id}:
 *   delete:
 *     summary: Delete a team (nulls players' team associations)
 *     tags:
 *       - Teams
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Team deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Team not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(request: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    const resolvedParams = await params as any;
    const id = Number(resolvedParams.id);

    // Only SUPER_ADMIN or CLUB_ADMIN may delete teams
    const roleCheck = requireRole(["SUPER_ADMIN", "CLUB_ADMIN"])(session);
    if (roleCheck.error) return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });

    try {
        const team = await prisma.team.findUnique({ where: { id } });
        if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

        if (session.role !== "SUPER_ADMIN" && session.organizationId !== team.organizationId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Null out players' teamId and delete team in a transaction
        await prisma.$transaction([
            prisma.player.updateMany({ where: { teamId: id }, data: { teamId: null } }),
            prisma.team.delete({ where: { id } })
        ]);

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("Delete team error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

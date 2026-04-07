import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth, requireRole } from "@/lib/security";
import { teamCreateSchema } from "@/lib/validation";

/**
 * @openapi
 * /api/teams:
 *   post:
 *     summary: Create a new team
 *     tags:
 *       - Teams
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - organizationId
 *             properties:
 *               name:
 *                 type: string
 *               organizationId:
 *                 type: integer
 *               coachId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Team created successfully
 *       400:
 *         description: Validation failed or bad input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Organization or coach not found
 *       409:
 *         description: Conflict - duplicate team name in organization
 *       500:
 *         description: Internal server error
 */
export async function POST(request: Request) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    const roleCheck = requireRole(["CLUB_ADMIN", "SUPER_ADMIN"])(session);
    if (roleCheck.error) return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });

    try {
        let body;
        try {
            const text = await request.text();
            body = text ? JSON.parse(text) : {};
        } catch (e) {
            return NextResponse.json({ error: "Invalid JSON input" }, { status: 400 });
        }

        const result = teamCreateSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });
        }

        const { name, organizationId, coachId } = result.data;

        // Ensure org exists and caller belongs to it (unless SUPER_ADMIN)
        const org = await prisma.organization.findUnique({ where: { id: organizationId } });
        if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

        if (session.role !== "SUPER_ADMIN" && session.organizationId !== organizationId) {
            return NextResponse.json({ error: "Forbidden - cannot create team for this organization" }, { status: 403 });
        }

        // If coachId provided, verify coach exists and belongs to org
        if (coachId) {
            const coach = await prisma.coach.findUnique({ where: { id: coachId }, include: { user: true } });
            if (!coach) return NextResponse.json({ error: "Coach not found" }, { status: 404 });
            if (coach.user.organizationId !== organizationId) {
                return NextResponse.json({ error: "Coach does not belong to this organization" }, { status: 400 });
            }
        }

        // Prevent duplicate team name within same org
        const existing = await prisma.team.findFirst({ where: { name, organizationId } });
        if (existing) return NextResponse.json({ error: "Team with this name already exists in organization" }, { status: 409 });

        const team = await prisma.team.create({
            data: {
                name,
                organization: { connect: { id: organizationId } },
                ...(coachId !== undefined ? { coach: { connect: { id: coachId } } } : {}),
            } as any
        });

        return NextResponse.json(team, { status: 201 });
    } catch (error) {
        console.error("Create team error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * @openapi
 * /api/teams:
 *   get:
 *     summary: List teams
 *     tags:
 *       - Teams
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: integer
 *         required: false
 *         description: Filter teams by organization id (admins may omit)
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
 *         description: List of teams
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
        const take = Math.min(parseInt(params.get("limit") || "25", 10) || 25, 1000);
        const organizationIdParam = params.get("organizationId");

        const where: any = {};
        if (organizationIdParam) {
            where.organizationId = Number(organizationIdParam);
        } else if (session.role !== "SUPER_ADMIN") {
            where.organizationId = session.organizationId;
        }

        const userSafeSelect = {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            role: true,
            organizationId: true,
            createdAt: true,
            updatedAt: true,
        };

        const [items, total] = await prisma.$transaction([
            prisma.team.findMany({
                where,
                include: {
                    coach: { include: { user: { select: userSafeSelect } } },
                    players: { include: { user: { select: userSafeSelect } } }
                },
                skip,
                take
            }),
            prisma.team.count({ where })
        ]);

        return NextResponse.json({ items, total, skip, limit: take });
    } catch (error: any) {
        console.error("List teams error:", error);
        return NextResponse.json({ 
            error: error.message || "Internal server error",
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}

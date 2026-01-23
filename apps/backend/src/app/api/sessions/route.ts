import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth, requireRole } from "@/lib/security";
import { sessionCreateSchema } from "@/lib/validation";

/**
 * @openapi
 * /api/sessions:
 *   get:
 *     summary: List sessions (scoped to organization)
 *     tags:
 *       - Sessions
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         required: false
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *         required: false
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: integer
 *         required: false
 *     responses:
 *       200:
 *         description: List of sessions
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Create a training session
 *     tags:
 *       - Sessions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - date
 *               - organizationId
 *               - coachId
 *             properties:
 *               title:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               organizationId:
 *                 type: integer
 *               coachId:
 *                 type: integer
 *               teamId:
 *                 type: integer
 *               type:
 *                 type: string
 *               duration:
 *                 type: integer
 *               intensity:
 *                 type: integer
 *               venue:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Session created
 *       400:
 *         description: Validation failed or bad input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Organization, team or coach not found
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

        const where: any = {};
        if (session.role !== "SUPER_ADMIN") {
            where.organizationId = session.organizationId;
        }

        // include shallow counts
        const [items, total] = await prisma.$transaction([
            prisma.session.findMany({ where, include: { participants: { select: { id: true } }, videos: { select: { id: true, status: true } } }, skip, take, orderBy: { date: 'desc' } }),
            prisma.session.count({ where })
        ]);

        return NextResponse.json({ items, total, skip, limit: take });
    } catch (error) {
        console.error("List sessions error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    const roleCheck = requireRole(["CLUB_ADMIN", "SUPER_ADMIN", "COACH"])(session);
    if (roleCheck.error) return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });

    try {
        let body;
        try {
            const text = await request.text();
            body = text ? JSON.parse(text) : {};
        } catch (e) {
            return NextResponse.json({ error: "Invalid JSON input" }, { status: 400 });
        }

        const result = sessionCreateSchema.safeParse(body);
        if (!result.success) return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });

        const data = result.data;

        // verify org/team/coach
        const org = await prisma.organization.findUnique({ where: { id: data.organizationId } });
        if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

        if (session.role !== "SUPER_ADMIN" && session.organizationId !== data.organizationId) {
            return NextResponse.json({ error: "Forbidden - cannot create sessions for this organization" }, { status: 403 });
        }

        if (data.teamId) {
            const team = await prisma.team.findUnique({ where: { id: data.teamId } });
            if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
            if (team.organizationId !== data.organizationId) return NextResponse.json({ error: "Team and organization mismatch" }, { status: 400 });
        }

        const coach = await prisma.coach.findUnique({ where: { id: data.coachId }, include: { user: true } });
        if (!coach) return NextResponse.json({ error: "Coach not found" }, { status: 404 });
        if (coach.user.organizationId !== data.organizationId) return NextResponse.json({ error: "Coach not in organization" }, { status: 400 });

        const createData: any = {
            title: data.title,
            date: new Date(data.date),
            organizationId: data.organizationId,
            teamId: data.teamId ?? undefined,
            coachId: data.coachId,
            type: data.type ?? undefined,
            duration: data.duration ?? undefined,
            intensity: data.intensity ?? undefined,
            venue: data.venue ?? undefined,
            notes: data.notes ?? undefined,
        };

        const created = await prisma.session.create({ data: createData });

        // emit event (simple console log for now)
        console.info("Event: SessionCreated", { sessionId: created.id });

        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        console.error("Create session error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
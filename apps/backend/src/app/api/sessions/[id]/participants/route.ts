import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth, requireRole } from "@/lib/security";
import { participantCreateSchema } from "@/lib/validation";

/**
 * @openapi
 * /api/sessions/{id}/participants:
 *   get:
 *     summary: List participants for a session
 *     tags:
 *       - Sessions
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Session id
 *     responses:
 *       200:
 *         description: Array of participants
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Session not found
 *   post:
 *     summary: Add a participant to a session
 *     tags:
 *       - Sessions
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Session id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - one of: playerId, coachId, userId
 *             properties:
 *               playerId:
 *                 type: integer
 *               role:
 *                 type: string
 *               attendanceStatus:
 *                 type: string
 *                 enum: [PENDING, PRESENT, ABSENT, EXCUSED]
 *               joinedAt:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Participant created
 *       400:
 *         description: Validation failed / participant already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Referenced player/coach/user not found or session not found
 */

export async function GET(request: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    const resolvedParams = await params as any;
    const sessionId = Number(resolvedParams.id);

    try {
        const targetSession = await prisma.session.findUnique({ where: { id: sessionId } });
        if (!targetSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });

        if (session.role !== "SUPER_ADMIN" && session.organizationId !== targetSession.organizationId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const participants = await prisma.sessionParticipant.findMany({ where: { sessionId }, include: { player: { include: { user: { select: { id: true, email: true, username: true, role: true, organizationId: true } } } }, coach: { include: { user: { select: { id: true, email: true, username: true, role: true, organizationId: true } } } }, user: { select: { id: true, email: true, username: true, role: true, organizationId: true } } } });
        return NextResponse.json(participants);
    } catch (error) {
        console.error("List participants error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    const resolvedParams = await params as any;
    const sessionId = Number(resolvedParams.id);

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

        const result = participantCreateSchema.safeParse(body);
        if (!result.success) {
            const flat = result.error.flatten();
            return NextResponse.json({ error: "Validation failed", details: { fieldErrors: flat.fieldErrors, formErrors: flat.formErrors } }, { status: 400 });
        }

        const data = result.data;

        // ensure session exists
        const targetSession = await prisma.session.findUnique({ where: { id: sessionId } });
        if (!targetSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });

        // permission: org-scoped
        if (session.role !== "SUPER_ADMIN" && session.organizationId !== targetSession.organizationId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        // Only players are allowed as participants now
        const player = await prisma.player.findUnique({ where: { id: data.playerId }, include: { user: true } });
        if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
        if (player.user.organizationId !== targetSession.organizationId) return NextResponse.json({ error: "Player does not belong to organization" }, { status: 400 });

        // create participant (player only)
        const createData: any = {
            sessionId,
            playerId: data.playerId,
            role: data.role ?? undefined,
            attendanceStatus: data.attendanceStatus ?? undefined,
            joinedAt: data.joinedAt ? new Date(data.joinedAt) : undefined,
            notes: data.notes ?? undefined,
        };

        const participant = await prisma.sessionParticipant.create({
            data: createData,
            include: {
                player: { include: { user: { select: { id: true, email: true, username: true, role: true, organizationId: true } } } },
                coach: { include: { user: { select: { id: true, email: true, username: true, role: true, organizationId: true } } } },
                user: { select: { id: true, email: true, username: true, role: true, organizationId: true } }
            }
        });

        console.info("Event: ParticipantAdded", { participantId: participant.id, sessionId });

        return NextResponse.json(participant, { status: 201 });
    } catch (error) {
        console.error("Create participant error:", error);
        // handle unique constraint violation gracefully
        if ((error as any)?.code === 'P2002') {
            return NextResponse.json({ error: 'Participant already exists for this session' }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

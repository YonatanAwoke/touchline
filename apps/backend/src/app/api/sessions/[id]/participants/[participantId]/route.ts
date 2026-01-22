import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth, requireRole } from "@/lib/security";
import { participantUpdateSchema } from "@/lib/validation";

/**
 * @openapi
 * /api/sessions/{id}/participants/{participantId}:
 *   patch:
 *     summary: Update a session participant
 *     tags:
 *       - Sessions
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *       - in: path
 *         name: participantId
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
 *               role:
 *                 type: string
 *               attendanceStatus:
 *                 type: string
 *               joinedAt:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Participant updated
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *   delete:
 *     summary: Remove a participant from a session
 *     tags:
 *       - Sessions
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *       - in: path
 *         name: participantId
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       204:
 *         description: Participant removed
 */
export async function PATCH(request: Request, { params }: { params: { id: string, participantId: string } | Promise<{ id: string, participantId: string }> }) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    const resolvedParams = await params as any;
    const sessionId = Number(resolvedParams.id);
    const participantId = Number(resolvedParams.participantId);

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

        const result = participantUpdateSchema.safeParse(body);
        if (!result.success) return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });

        const existing = await prisma.sessionParticipant.findUnique({ where: { id: participantId }, include: { session: true } });
        if (!existing) return NextResponse.json({ error: "Participant not found" }, { status: 404 });
        if (existing.sessionId !== sessionId) return NextResponse.json({ error: "Participant does not belong to session" }, { status: 400 });

        if (session.role !== "SUPER_ADMIN" && session.organizationId !== existing.session.organizationId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const updateData: any = {};
        if (typeof result.data.role !== "undefined") updateData.role = result.data.role;
        if (typeof result.data.attendanceStatus !== "undefined") updateData.attendanceStatus = result.data.attendanceStatus;
        if (typeof result.data.joinedAt !== "undefined") updateData.joinedAt = result.data.joinedAt ? new Date(result.data.joinedAt) : null;
        if (typeof result.data.notes !== "undefined") updateData.notes = result.data.notes;

        const updated = await prisma.sessionParticipant.update({ where: { id: participantId }, data: updateData, include: { player: { include: { user: { select: { id: true, email: true, username: true, role: true, organizationId: true } } } }, coach: { include: { user: { select: { id: true, email: true, username: true, role: true, organizationId: true } } } }, user: { select: { id: true, email: true, username: true, role: true, organizationId: true } } } });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Update participant error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string, participantId: string } | Promise<{ id: string, participantId: string }> }) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    const resolvedParams = await params as any;
    const sessionId = Number(resolvedParams.id);
    const participantId = Number(resolvedParams.participantId);

    const roleCheck = requireRole(["SUPER_ADMIN", "CLUB_ADMIN"])(session);
    if (roleCheck.error) return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });

    try {
        const existing = await prisma.sessionParticipant.findUnique({ where: { id: participantId }, include: { session: true } });
        if (!existing) return NextResponse.json({ error: "Participant not found" }, { status: 404 });
        if (existing.sessionId !== sessionId) return NextResponse.json({ error: "Participant does not belong to session" }, { status: 400 });

        if (session.role !== "SUPER_ADMIN" && session.organizationId !== existing.session.organizationId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        await prisma.sessionParticipant.delete({ where: { id: participantId } });
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("Delete participant error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

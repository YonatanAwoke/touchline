import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth } from "@/lib/security";

/**
 * @openapi
 * /api/sessions/{id}/attendance:
 *   patch:
 *     summary: Bulk update attendance for a session
 *     tags:
 *       - Sessions
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - attendance
 *             properties:
 *               attendance:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     playerId:
 *                       type: integer
 *                     status:
 *                       type: string
 *                       enum: [PENDING, PRESENT, ABSENT, EXCUSED]
 *     responses:
 *       200:
 *         description: Attendance updated
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Session not found
 */
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } | Promise<{ id: string }> }
) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    const resolvedParams = await params as any;
    const sessionId = Number(resolvedParams.id);

    try {
        const targetSession = await prisma.session.findUnique({
            where: { id: sessionId }
        });

        if (!targetSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });

        // Permission check: Organziation owner or assigned coach
        if (session.role !== "SUPER_ADMIN" && session.organizationId !== targetSession.organizationId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { attendance } = await request.json();

        if (!Array.isArray(attendance)) {
            return NextResponse.json({ error: "Attendance must be an array" }, { status: 400 });
        }

        // Perform bulk update within a transaction
        await prisma.$transaction(
            attendance.map((item: any) =>
                prisma.sessionParticipant.update({
                    where: {
                        sessionId_playerId: {
                            sessionId: sessionId,
                            playerId: item.playerId
                        }
                    },
                    data: {
                        attendanceStatus: item.status
                    }
                })
            )
        );

        return NextResponse.json({ message: "Attendance updated successfully" });
    } catch (error: any) {
        console.error("Bulk attendance update error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth } from "@/lib/security";
import { sessionUpdateSchema } from "@/lib/validation";

/**
 * @openapi
 * /api/sessions/{id}:
 *   get:
 *     summary: Get session details
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
 *         description: Session details
 *       404:
 *         description: Not found
 *       500:
 *         description: Internal server error
 *   patch:
 *     summary: Update a session
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
 *             properties:
 *               title:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               type:
 *                 type: string
 *               duration:
 *                 type: integer
 *               intensity:
 *                 type: integer
 *               status:
 *                 type: string
 *               venue:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Session updated
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Cancel (soft-delete) a session
 *     tags:
 *       - Sessions
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Session cancelled
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
export async function GET(request: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

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

        const targetSession = await prisma.session.findUnique({
            where: { id },
            include: {
                participants: {
                    include: {
                        player: { include: { user: { select: userSafeSelect } } },
                        coach: { include: { user: { select: userSafeSelect } } },
                        user: { select: userSafeSelect }
                    }
                },
                videos: { select: { id: true, storagePath: true, status: true } },
                coach: { include: { user: { select: userSafeSelect } } },
                team: true,
            }
        });

        if (!targetSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });

        if (session.role !== "SUPER_ADMIN" && session.organizationId !== targetSession.organizationId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json(targetSession);
    } catch (error: any) {
        console.error("Get session error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

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

        const result = sessionUpdateSchema.safeParse(body);
        if (!result.success) return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });

        const existing = await prisma.session.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: "Session not found" }, { status: 404 });

        // permission: SUPER_ADMIN | CLUB_ADMIN | coach assigned to this session
        if (session.role !== "SUPER_ADMIN" && session.role !== "CLUB_ADMIN") {
            if (!session.coachId || session.coachId !== existing.coachId) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        const updateData: any = {};
        if (typeof result.data.title !== "undefined") updateData.title = result.data.title;
        if (typeof result.data.date !== "undefined") updateData.date = new Date(result.data.date);
        if (typeof result.data.type !== "undefined") updateData.type = result.data.type;
        if (typeof result.data.duration !== "undefined") updateData.duration = result.data.duration;
        if (typeof result.data.intensity !== "undefined") updateData.intensity = result.data.intensity;
        if (typeof result.data.status !== "undefined") updateData.status = result.data.status;
        if (typeof result.data.venue !== "undefined") updateData.venue = result.data.venue;
        if (typeof result.data.notes !== "undefined") updateData.notes = result.data.notes;

        const updated = await prisma.session.update({ where: { id }, data: updateData });

        if (updateData.status === "COMPLETED") {
            console.info("Event: SessionCompleted", { sessionId: id });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Update session error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    const resolvedParams = await params as any;
    const id = Number(resolvedParams.id);

    try {
        const existing = await prisma.session.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: "Session not found" }, { status: 404 });

        // Permission rules:
        // - SUPER_ADMIN can cancel any session
        // - CLUB_ADMIN can cancel sessions for their organization
        // - COACH can cancel only sessions where they are the assigned coach
        if (session.role === "SUPER_ADMIN") {
            // allowed
        } else if (session.role === "CLUB_ADMIN") {
            if (session.organizationId !== existing.organizationId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        } else if (session.role === "COACH") {
            if (!session.coachId || session.coachId !== existing.coachId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        } else {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // soft-delete: set status to CANCELLED
        const updated = await prisma.session.update({ where: { id }, data: { status: 'CANCELLED' } });

        console.info("Event: SessionCancelled", { sessionId: id });

        return NextResponse.json({ message: 'Session cancelled', session: updated }, { status: 200 });
    } catch (error) {
        console.error("Delete session error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

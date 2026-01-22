import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth, requireRole } from "@/lib/security";
import { participantCreateSchema, participantUpdateSchema } from "@/lib/validation";

export async function GET(request: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
    const resolvedParams = await params as any;
    const sessionId = Number(resolvedParams.id);

    try {
        const participants = await prisma.sessionParticipant.findMany({ where: { sessionId }, include: { player: { include: { user: { select: { id: true, email: true, username: true, role: true, organizationId: true } } } } } });
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
        if (!result.success) return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });

        const data = result.data;

        // ensure session exists
        const targetSession = await prisma.session.findUnique({ where: { id: sessionId } });
        if (!targetSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });

        // permission: org-scoped
        if (session.role !== "SUPER_ADMIN" && session.organizationId !== targetSession.organizationId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        // ensure player exists and belongs to org
        const player = await prisma.player.findUnique({ where: { id: data.playerId }, include: { user: true } });
        if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
        if (player.user.organizationId !== targetSession.organizationId) return NextResponse.json({ error: "Player does not belong to organization" }, { status: 400 });

        // create participant (unique constraint prevents duplicates)
        const participant = await prisma.sessionParticipant.create({ data: { sessionId, playerId: data.playerId, role: data.role ?? undefined, attendanceStatus: data.attendanceStatus ?? undefined, joinedAt: data.joinedAt ? new Date(data.joinedAt) : undefined, notes: data.notes ?? undefined }, include: { player: { include: { user: { select: { id: true, email: true, username: true, role: true, organizationId: true } } } } } });

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

export async function PATCH(request: Request, { params }: { params: { id: string, participantId?: string } | Promise<{ id: string, participantId?: string }> }) {
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

        const updated = await prisma.sessionParticipant.update({ where: { id: participantId }, data: updateData, include: { player: { include: { user: { select: { id: true, email: true, username: true, role: true, organizationId: true } } } } } });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Update participant error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string, participantId?: string } | Promise<{ id: string, participantId?: string }> }) {
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

import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth } from "@/lib/security";

export async function DELETE(
    request: Request,
    { params }: { params: { id: string; playerId: string } | Promise<{ id: string; playerId: string }> }
) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    const resolvedParams = await params as any;
    const sessionId = Number(resolvedParams.id);
    const playerId = Number(resolvedParams.playerId);

    try {
        const targetSession = await prisma.session.findUnique({ where: { id: sessionId } });
        if (!targetSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });

        // Permission check
        if (session.role !== "SUPER_ADMIN" && session.organizationId !== targetSession.organizationId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.sessionParticipant.delete({
            where: {
                sessionId_playerId: {
                    sessionId,
                    playerId
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Remove participant error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

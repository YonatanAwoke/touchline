import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth, requireRole } from "@/lib/security";
import { tacticalBoardUpdateSchema } from "@/lib/validation";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    
    try {
        const board = await prisma.tacticalBoard.findUnique({
            where: { id },
            include: { team: true }
        });
        
        if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });
        if (board.organizationId !== auth.session.organizationId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        
        return NextResponse.json(board);
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    
    const roleCheck = requireRole(["COACH", "CLUB_ADMIN", "SUPER_ADMIN"])(auth.session);
    if (roleCheck.error) return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });

    try {
        const body = await request.json();
        const result = tacticalBoardUpdateSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });
        }

        const existing = await prisma.tacticalBoard.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: "Board not found" }, { status: 404 });
        if (existing.organizationId !== auth.session.organizationId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const updated = await prisma.tacticalBoard.update({
            where: { id },
            data: result.data as any
        });

        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    
    const roleCheck = requireRole(["COACH", "CLUB_ADMIN", "SUPER_ADMIN"])(auth.session);
    if (roleCheck.error) return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });

    try {
        const existing = await prisma.tacticalBoard.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: "Board not found" }, { status: 404 });
        if (existing.organizationId !== auth.session.organizationId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.tacticalBoard.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

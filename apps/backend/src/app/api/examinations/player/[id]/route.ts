import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth } from "@/lib/security";
import { playerAnalysisUpdateSchema } from "@/lib/validation";

export async function GET(request: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    try {
        const resolvedParams = await params as any;
        const id = Number(resolvedParams.id);
        const item = await prisma.playerAnalysis.findUnique({
            where: { id },
             include: { 
                 player: {
                     include: { user: { select: { firstName: true, lastName: true, username: true } } }
                 },
                 session: true
             }
        });
        if (!item || (session.role !== "SUPER_ADMIN" && item.organizationId !== session.organizationId)) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        return NextResponse.json(item);
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    try {
        const resolvedParams = await params as any;
        const id = Number(resolvedParams.id);
        const body = await request.json();
        const result = playerAnalysisUpdateSchema.safeParse(body);
        if (!result.success) return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });

        const item = await prisma.playerAnalysis.findUnique({ where: { id } });
        if (!item || (session.role !== "SUPER_ADMIN" && item.organizationId !== session.organizationId)) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const updated = await prisma.playerAnalysis.update({
            where: { id },
            data: result.data as any
        });

        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    try {
        const resolvedParams = await params as any;
        const id = Number(resolvedParams.id);
        const item = await prisma.playerAnalysis.findUnique({ where: { id } });
        if (!item || (session.role !== "SUPER_ADMIN" && item.organizationId !== session.organizationId)) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        await prisma.playerAnalysis.delete({ where: { id } });
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

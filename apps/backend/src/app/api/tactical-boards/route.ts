import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth, requireRole } from "@/lib/security";
import { tacticalBoardCreateSchema } from "@/lib/validation";

/**
 * @openapi
 * /api/tactical-boards:
 *   get:
 *     summary: List tactical boards
 *     tags: [Tactical Boards]
 *     parameters:
 *       - in: query
 *         name: teamId
 *         schema:
 *           type: integer
 *   post:
 *     summary: Create a tactical board
 *     tags: [Tactical Boards]
 */
export async function GET(request: Request) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    
    try {
        const [items, total] = await prisma.$transaction([
            prisma.tacticalBoard.findMany({
                where: {
                    organizationId: auth.session.organizationId,
                    teamId: teamId ? parseInt(teamId) : undefined,
                },
                orderBy: { updatedAt: "desc" },
                include: {
                    user: {
                        select: { username: true }
                    },
                    formation: true,
                }
            }),
            prisma.tacticalBoard.count({
                where: {
                    organizationId: auth.session.organizationId,
                    teamId: teamId ? parseInt(teamId) : undefined,
                }
            })
        ]);
        
        return NextResponse.json({ items, total });
    } catch (error) {
        console.error("Fetch tactical boards error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    
    const roleCheck = requireRole(["COACH", "CLUB_ADMIN", "SUPER_ADMIN"])(auth.session);
    if (roleCheck.error) return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });

    try {
        const body = await request.json();
        const result = tacticalBoardCreateSchema.safeParse({
            ...body,
            organizationId: auth.session.organizationId
        });

        if (!result.success) {
            console.error("Create Tactical Board validation failed:", result.error.format());
            return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });
        }

        console.log("Creating board with data:", {
            ...result.data,
            createdBy: auth.session.userId,
        });

        const board = await prisma.tacticalBoard.create({
            data: {
                ...result.data,
                createdBy: auth.session.userId,
            }
        });

        return NextResponse.json(board, { status: 201 });
    } catch (error: any) {
        console.error("Create tactical board error:", error);
        return NextResponse.json({ 
            error: error.message || "Internal server error",
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}

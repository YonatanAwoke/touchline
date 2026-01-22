import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth, requireRole } from "@/lib/security";
import { playerCreateSchema } from "@/lib/validation";

/**
 * @openapi
 * /api/players:
 *   get:
 *     summary: List players in the requester's organization
 *     tags:
 *       - Players
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
 *     responses:
 *       200:
 *         description: A paginated list of players
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Create a player profile for an existing user
 *     tags:
 *       - Players
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: integer
 *               teamId:
 *                 type: integer
 *               phone:
 *                 type: string
 *               birthdate:
 *                 type: string
 *                 format: date
 *               position:
 *                 type: string
 *     responses:
 *       201:
 *         description: Player profile created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User or Team not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete players (org-scoped for CLUB_ADMIN, global for SUPER_ADMIN)
 *     tags:
 *       - Players
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: integer
 *         required: false
 *     responses:
 *       204:
 *         description: Players deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
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

        const result = playerCreateSchema.safeParse(body);
        if (!result.success) return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });

        const data = result.data;

        // verify user exists
        const targetUser = await prisma.user.findUnique({ where: { id: data.userId } });
        if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

        if (session.role !== "SUPER_ADMIN" && targetUser.organizationId !== session.organizationId) {
            return NextResponse.json({ error: "Forbidden - user outside organization" }, { status: 403 });
        }

        // if teamId provided, ensure team exists and belongs to same org
        if (data.teamId) {
            const team = await prisma.team.findUnique({ where: { id: data.teamId } });
            if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
            if (team.organizationId !== targetUser.organizationId) return NextResponse.json({ error: "Team and user organization mismatch" }, { status: 400 });
        }

        // ensure player profile doesn't already exist
        const existing = await prisma.player.findUnique({ where: { userId: data.userId } });
        if (existing) return NextResponse.json({ error: "Player profile already exists for this user" }, { status: 400 });

        const createData: any = {
            userId: data.userId,
            teamId: data.teamId ?? undefined,
            phone: data.phone ?? undefined,
            address: data.address ?? undefined,
            city: data.city ?? undefined,
            country: data.country ?? undefined,
            postalCode: data.postalCode ?? undefined,
            birthdate: data.birthdate ? new Date(data.birthdate) : undefined,
            nationality: data.nationality ?? undefined,
            position: data.position ?? undefined,
            secondaryPositions: data.secondaryPositions ?? undefined,
            heightCm: data.heightCm ?? undefined,
            weightKg: data.weightKg ?? undefined,
            dominantFoot: data.dominantFoot ?? undefined,
            bio: data.bio ?? undefined,
            attributes: data.attributes ?? undefined,
            isActive: typeof data.isActive === "boolean" ? data.isActive : undefined,
            profileVisibility: data.profileVisibility ?? undefined,
        };

        const userSafeSelect = {
            id: true,
            email: true,
            username: true,
            role: true,
            organizationId: true,
            createdAt: true,
            updatedAt: true,
        };

        const player = await prisma.player.create({ data: createData, include: { user: { select: userSafeSelect }, team: true } });

        return NextResponse.json(player, { status: 201 });
    } catch (error) {
        console.error("Create player error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

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
            where.user = { organizationId: session.organizationId };
        }

        const userSafeSelect = {
            id: true,
            email: true,
            username: true,
            role: true,
            organizationId: true,
            createdAt: true,
            updatedAt: true,
        };

        const [items, total] = await prisma.$transaction([
            prisma.player.findMany({ where, include: { user: { select: userSafeSelect }, team: true }, skip, take }),
            prisma.player.count({ where })
        ]);

        return NextResponse.json({ items, total, skip, limit: take });
    } catch (error) {
        console.error("List players error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * DELETE /api/players - delete players in an organization or all (SUPER_ADMIN)
 * Query params: `organizationId` (optional, SUPER_ADMIN only)
 */
export async function DELETE(request: Request) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    const roleCheck = requireRole(["SUPER_ADMIN", "CLUB_ADMIN"])(session);
    if (roleCheck.error) return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });

    try {
        const url = new URL(request.url);
        const orgParam = url.searchParams.get("organizationId");

        // SUPER_ADMIN may delete across orgs; CLUB_ADMIN may only delete within their org
        if (session.role === "SUPER_ADMIN") {
            if (orgParam) {
                const orgId = Number(orgParam);
                await prisma.player.deleteMany({ where: { user: { organizationId: orgId } } });
                return new NextResponse(null, { status: 204 });
            }
            // delete all players
            await prisma.player.deleteMany({});
            return new NextResponse(null, { status: 204 });
        } else {
            // CLUB_ADMIN: delete players for their organization
            await prisma.player.deleteMany({ where: { user: { organizationId: session.organizationId } } });
            return new NextResponse(null, { status: 204 });
        }
    } catch (error) {
        console.error("Delete players error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth, requireRole } from "@/lib/security";
import { playerUpdateSchema } from "@/lib/validation";

/**
 * @openapi
 * /api/players/{id}:
 *   get:
 *     summary: Get a single player by id
 *     tags:
 *       - Players
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Player fetched successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Player not found
 *       500:
 *         description: Internal server error
 *   patch:
 *     summary: Update a player's profile
 *     tags:
 *       - Players
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               position:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Player updated successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Player not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete a player
 *     tags:
 *       - Players
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Player deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Player not found
 *       500:
 *         description: Internal server error
 */
export async function GET(request: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
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

        const player = await prisma.player.findUnique({ where: { id }, include: { user: { select: userSafeSelect }, team: true } });
        if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

        return NextResponse.json(player);
    } catch (error) {
        console.error("Get player error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * @openapi
 * /api/players/{id}:
 *   get:
 *     summary: Get player by id
 *     tags:
 *       - Players
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *   patch:
 *     summary: Update player profile
 *     tags:
 *       - Players
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               position:
 *                 type: string
 *               phone:
 *                 type: string
 *   delete:
 *     summary: Delete player
 *     tags:
 *       - Players
 */

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

        const result = playerUpdateSchema.safeParse(body);
        if (!result.success) return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });

        const player = await prisma.player.findUnique({ where: { id } });
        if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

        // permission: SUPER_ADMIN or CLUB_ADMIN of org or coach of player's team
        if (session.role !== "SUPER_ADMIN" && session.role !== "CLUB_ADMIN") {
            if (!session.coachId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            // check coach owns the team (if player has a teamId)
            if (!player.teamId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            const team = await prisma.team.findUnique({ where: { id: player.teamId } });
            if (!team || team.coachId !== session.coachId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const updateData: any = {};
        if (typeof result.data.teamId !== "undefined") updateData.teamId = result.data.teamId;
        if (typeof result.data.phone !== "undefined") updateData.phone = result.data.phone;
        if (typeof result.data.address !== "undefined") updateData.address = result.data.address;
        if (typeof result.data.city !== "undefined") updateData.city = result.data.city;
        if (typeof result.data.country !== "undefined") updateData.country = result.data.country;
        if (typeof result.data.postalCode !== "undefined") updateData.postalCode = result.data.postalCode;
        if (typeof result.data.birthdate !== "undefined") updateData.birthdate = result.data.birthdate ? new Date(result.data.birthdate) : null;
        if (typeof result.data.nationality !== "undefined") updateData.nationality = result.data.nationality;
        if (typeof result.data.position !== "undefined") updateData.position = result.data.position;
        if (typeof result.data.secondaryPositions !== "undefined") updateData.secondaryPositions = result.data.secondaryPositions;
        if (typeof result.data.heightCm !== "undefined") updateData.heightCm = result.data.heightCm;
        if (typeof result.data.weightKg !== "undefined") updateData.weightKg = result.data.weightKg;
        if (typeof result.data.dominantFoot !== "undefined") updateData.dominantFoot = result.data.dominantFoot;
        if (typeof result.data.bio !== "undefined") updateData.bio = result.data.bio;
        if (typeof result.data.attributes !== "undefined") updateData.attributes = result.data.attributes;
        if (typeof result.data.isActive !== "undefined") updateData.isActive = result.data.isActive;
        if (typeof result.data.profileVisibility !== "undefined") updateData.profileVisibility = result.data.profileVisibility;

        // if changing teamId, validate team belongs to same org as user
        if (typeof updateData.teamId !== "undefined" && updateData.teamId !== null) {
            const team = await prisma.team.findUnique({ where: { id: updateData.teamId } });
            if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
            const user = await prisma.user.findUnique({ where: { id: player.userId } });
            if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
            if (team.organizationId !== user.organizationId) return NextResponse.json({ error: "Team and user organization mismatch" }, { status: 400 });
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

        const updated = await prisma.player.update({ where: { id }, data: updateData, include: { user: { select: userSafeSelect }, team: true } });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Update player error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    const resolvedParams = await params as any;
    const id = Number(resolvedParams.id);

    const roleCheck = requireRole(["SUPER_ADMIN", "CLUB_ADMIN"])(session);
    if (roleCheck.error) return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });

    try {
        const player = await prisma.player.findUnique({ where: { id } });
        if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

        // ensure org match for non-super-admin
        if (session.role !== "SUPER_ADMIN") {
            const user = await prisma.user.findUnique({ where: { id: player.userId } });
            if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
            if (user.organizationId !== session.organizationId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.player.delete({ where: { id } });
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("Delete player error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth } from "@/lib/security";

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     summary: Retrieve a single user by ID
 *     description: Returns detailed information about a user, restricted to your organization.
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user ID
 *     responses:
 *       200:
 *         description: User information fetched successfully
 *       400:
 *         description: Invalid user ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Outside your organization
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    const { organizationId, role } = session;

    try {
        const { id } = await params;
        const userId = parseInt(id);

        if (isNaN(userId)) {
            return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
        }

        const user = await prisma.user.findFirst({
            where: {
                id: userId,
                organizationId: role === "SUPER_ADMIN" ? undefined : organizationId,
            },
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                createdAt: true,
                coachProfile: true,
                playerProfile: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error("Fetch user by ID error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * @openapi
 * /api/users/{id}:
 *   patch:
 *     summary: Update user details
 *     description: Updates profile or role. Restricted by organization and role hierarchy.
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [SUPER_ADMIN, CLUB_ADMIN, COACH, ANALYST, PLAYER]
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Bad Request - Invalid input or no fields to update
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions or outside organization
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    const { organizationId, role, userId: currentUserId } = session;
    const { id } = await params;
    const targetUserId = parseInt(id);

    if (isNaN(targetUserId)) {
        return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    try {
        let body;
        try {
            const text = await request.text();
            body = text ? JSON.parse(text) : {};
        } catch (e) {
            return NextResponse.json({ error: "Invalid JSON input" }, { status: 400 });
        }
        const { email, username, role: newRole } = body;

        // 1. Fetch target user to check organization
        const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId }
        });

        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // 2. RBAC Checks
        const isSelf = currentUserId === targetUserId;
        const isSuperAdmin = role === "SUPER_ADMIN";
        const isClubAdmin = role === "CLUB_ADMIN" && targetUser.organizationId === organizationId;

        if (!isSuperAdmin && !isClubAdmin && !isSelf) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 3. Restricted Updates
        const data: any = {};
        if (email) data.email = email;
        if (username) data.username = username;

        // Only Admins can change roles
        if (newRole && (isSuperAdmin || isClubAdmin)) {
            // Club admin cannot promote themselves to super admin
            if (isClubAdmin && newRole === "SUPER_ADMIN") {
                return NextResponse.json({ error: "Cannot assign SUPER_ADMIN role" }, { status: 403 });
            }
            data.role = newRole;
        }

        if (Object.keys(data).length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: targetUserId },
            data,
            select: { id: true, email: true, username: true, role: true }
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("Update user error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a user
 *     description: Permanently removes a user from the system. Restricted to Admins within the organization.
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       400:
 *         description: Invalid user ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires Admin permissions
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    const { organizationId, role } = session;
    const { id } = await params;
    const targetUserId = parseInt(id);

    if (isNaN(targetUserId)) {
        return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    try {
        const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId }
        });

        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const isSuperAdmin = role === "SUPER_ADMIN";
        const isClubAdmin = role === "CLUB_ADMIN" && targetUser.organizationId === organizationId;

        if (!isSuperAdmin && !isClubAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.user.delete({
            where: { id: targetUserId }
        });

        return NextResponse.json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Delete user error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

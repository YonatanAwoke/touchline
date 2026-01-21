import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth, requireRole } from "@/lib/security";
import bcrypt from "bcryptjs";

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Retrieve users in your organization
 *     description: Returns a sanitized list of users belonging to the same organization as the requester. SUPER_ADMINs see all users.
 *     tags:
 *       - Users
 *     responses:
 *       200:
 *         description: List of users fetched successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET() {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    const { organizationId, role } = session;

    try {
        const users = await prisma.user.findMany({
            where: {
                organizationId: role === "SUPER_ADMIN" ? undefined : organizationId
            },
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                createdAt: true,
            },
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error("Fetch users error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * @openapi
 * /api/users:
 *   post:
 *     summary: Add a new user to the organization (CLUB_ADMIN only)
 *     description: Allows a Club Admin to create COACH, ANALYST, or PLAYER accounts within their own organization.
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - username
 *               - password
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [COACH, ANALYST, PLAYER]
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Bad Request - Validation failed or invalid role
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires CLUB_ADMIN or SUPER_ADMIN
 *       500:
 *         description: Internal server error
 */
export async function POST(request: Request) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    // Only CLUB_ADMIN or SUPER_ADMIN can create users
    const roleCheck = requireRole(["CLUB_ADMIN", "SUPER_ADMIN"])(session);
    if (roleCheck.error) return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });

    try {
        const body = await request.json();
        const { email, username, password, role } = body;

        // Validate role (don't allow self-elevation to admin or super_admin via this endpoint)
        if (!["COACH", "ANALYST", "PLAYER"].includes(role)) {
            return NextResponse.json({ error: "Invalid role assignment" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
                role,
                organizationId: session.organizationId,
            }
        });

        return NextResponse.json({
            message: "User created successfully",
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role
            }
        }, { status: 201 });
    } catch (error) {
        console.error("Create user error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

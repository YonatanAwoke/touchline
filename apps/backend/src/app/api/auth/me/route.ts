import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { getSession } from "@/lib/auth";

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     description: Returns the currently logged-in user based on the HTTP-only access token.
 *     tags:
 *       - Auth
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved authenticated user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     email:
 *                       type: string
 *                     username:
 *                       type: string
 *                     role:
 *                       type: string
 *                     organizationId:
 *                       type: integer
 *                     coachProfile:
 *                       type: object
 *                       nullable: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - No valid session
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.userId as number;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { coachProfile: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const safeUser = {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            organizationId: user.organizationId,
            coachProfile: user.coachProfile ?? null,
            createdAt: user.createdAt,
        };

        return NextResponse.json({ user: safeUser });
    } catch (error) {
        console.error("/api/auth/me error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

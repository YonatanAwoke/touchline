import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth, requireRole } from "@/lib/security";
import { coachProfileSchema } from "@/lib/validation";

/**
 * @openapi
 * /api/coaches:
 *   get:
 *     summary: List all coaches in the organization
 *     description: Returns a list of coaches belonging to the requester's organization.
 *     tags:
 *       - Coaches
 *     responses:
 *       200:
 *         description: List of coaches fetched successfully
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
        const coaches = await prisma.coach.findMany({
            where: {
                user: {
                    organizationId: role === "SUPER_ADMIN" ? undefined : organizationId
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        organizationId: true,
                    }
                },
                _count: {
                    select: { teams: true, sessions: true }
                }
            }
        });

        return NextResponse.json(coaches);
    } catch (error) {
        console.error("Fetch coaches error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * @openapi
 * /api/coaches:
 *   post:
 *     summary: Create a coach profile for an existing user
 *     description: Links professional metadata (bio, specialties, licenses) to a coach.
 *     tags:
 *       - Coaches
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
 *               bio:
 *                 type: string
 *               specialty:
 *                 type: array
 *                 items:
 *                   type: string
 *               licenseLevel:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Coach profile created successfully
 *       400:
 *         description: Bad Request - Validation failed
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
export async function POST(request: Request) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    const roleCheck = requireRole(["CLUB_ADMIN", "SUPER_ADMIN"])(session);
    if (roleCheck.error) return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });

    try {
        let body;
        try {
            const text = await request.text();
            body = text ? JSON.parse(text) : {};
        } catch (e) {
            return NextResponse.json({ error: "Invalid JSON input" }, { status: 400 });
        }

        const result = coachProfileSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { userId, bio, specialty, licenseLevel } = result.data;

        if (!userId) {
            return NextResponse.json({ error: "userId is required" }, { status: 400 });
        }

        // Verify user exists, belongs to org, and has COACH role
        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { coachProfile: true }
        });

        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (session.role !== "SUPER_ADMIN" && targetUser.organizationId !== session.organizationId) {
            return NextResponse.json({ error: "Forbidden - User outside organization" }, { status: 403 });
        }

        if (targetUser.role !== "COACH") {
            return NextResponse.json({ error: "User does not have the COACH role" }, { status: 400 });
        }

        if (targetUser.coachProfile) {
            return NextResponse.json({ error: "Coach profile already exists for this user" }, { status: 400 });
        }

        const coach = await prisma.coach.create({
            data: {
                userId,
                bio,
                specialty,
                licenseLevel
            }
        });

        return NextResponse.json(coach, { status: 201 });
    } catch (error) {
        console.error("Create coach profile error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

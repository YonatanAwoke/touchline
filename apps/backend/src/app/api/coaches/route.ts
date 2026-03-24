import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth, requireRole } from "@/lib/security";
import { coachProfileSchema, createUserSchema } from "@/lib/validation";
import bcrypt from "bcryptjs";

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

        // First try to parse coach fields
        const coachResult = coachProfileSchema.safeParse(body);
        if (!coachResult.success) {
            return NextResponse.json(
                { error: "Validation failed", details: coachResult.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const coachData = coachResult.data;

        // If the client provided a createUser block, validate and create the user first
        let userIdToUse: number | null = null;
        if ((body as any).createUser) {
            const userResult = createUserSchema.safeParse((body as any).createUser);
            if (!userResult.success) return NextResponse.json({ error: "Invalid createUser payload", details: userResult.error.flatten().fieldErrors }, { status: 400 });

            const { email, username, password, organizationSlug, joinCode, role } = userResult.data;

            // find organization
            const org = await prisma.organization.findUnique({ where: { slug: organizationSlug } });
            if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
            if (org.joinCode !== joinCode) return NextResponse.json({ error: "Invalid join code for this organization" }, { status: 400 });

            // check existing user
            const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
            if (existing) return NextResponse.json({ error: "Email or username already in use" }, { status: 400 });

            const hashedPassword = await bcrypt.hash(password, 10);
            const createdUser = await prisma.user.create({
                data: {
                    email,
                    username,
                    password: hashedPassword,
                    role: role,
                    organizationId: org.id
                }
            });

            userIdToUse = createdUser.id;
        } else {
            userIdToUse = coachData.userId ?? null;
        }

        if (!userIdToUse) return NextResponse.json({ error: "userId is required" }, { status: 400 });

        // Verify user exists, belongs to org, and has COACH role
        const targetUser = await prisma.user.findUnique({ where: { id: userIdToUse }, include: { coachProfile: true } });
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

        const coach = await prisma.coach.create({ data: { userId: userIdToUse, bio: coachData.bio, specialty: coachData.specialty, licenseLevel: coachData.licenseLevel } });
        return NextResponse.json(coach, { status: 201 });
    } catch (error) {
        console.error("Create coach profile error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

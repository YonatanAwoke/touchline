import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth } from "@/lib/security";
import { coachProfileSchema } from "@/lib/validation";

/**
 * @openapi
 * /api/coaches/{id}:
 *   get:
 *     summary: Get detailed coach profile
 *     description: Returns professional info about a coach. Restricted to same organization.
 *     tags:
 *       - Coaches
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The coach ID
 *     responses:
 *       200:
 *         description: Coach profile fetched successfully
 *       400:
 *         description: Invalid coach ID
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Coach not found
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    const { id } = await params;
    const coachId = parseInt(id);

    if (isNaN(coachId)) {
        return NextResponse.json({ error: "Invalid coach ID" }, { status: 400 });
    }

    try {
        const coach = await prisma.coach.findUnique({
            where: { id: coachId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        organizationId: true,
                    }
                },
                teams: true,
                sessions: true,
            }
        });

        if (!coach) {
            return NextResponse.json({ error: "Coach not found" }, { status: 404 });
        }

        // Auth check: SUPER_ADMIN or same organization
        if (session.role !== "SUPER_ADMIN" && coach.user.organizationId !== session.organizationId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json(coach);
    } catch (error) {
        console.error("Fetch coach detail error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * @openapi
 * /api/coaches/{id}:
 *   patch:
 *     summary: Update coach profile
 *     description: Updates professional metadata (bio, specialties, licenses).
 *     tags:
 *       - Coaches
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
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
 *       200:
 *         description: Coach profile updated successfully
 *       400:
 *         description: Bad Request - Validation failed
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Coach not found
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

    const { id } = await params;
    const coachId = parseInt(id);

    if (isNaN(coachId)) {
        return NextResponse.json({ error: "Invalid coach ID" }, { status: 400 });
    }

    try {
        // 1. Fetch coach to check ownership/org
        const coach = await prisma.coach.findUnique({
            where: { id: coachId },
            include: { user: true }
        });

        if (!coach) {
            return NextResponse.json({ error: "Coach not found" }, { status: 404 });
        }

        // 2. Auth checks
        const isSelf = session.userId === coach.userId;
        const isClubAdmin = session.role === "CLUB_ADMIN" && coach.user.organizationId === session.organizationId;
        const isSuperAdmin = session.role === "SUPER_ADMIN";

        if (!isSelf && !isClubAdmin && !isSuperAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 3. Robust JSON parsing
        let body;
        try {
            const text = await request.text();
            body = text ? JSON.parse(text) : {};
        } catch (e) {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const result = coachProfileSchema.partial().safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { bio, specialty, licenseLevel } = result.data;

        const data: any = {};
        if (bio !== undefined) data.bio = bio;
        if (specialty !== undefined) data.specialty = specialty;
        if (licenseLevel !== undefined) data.licenseLevel = licenseLevel;

        if (Object.keys(data).length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        const updatedCoach = await prisma.coach.update({
            where: { id: coachId },
            data
        });

        return NextResponse.json(updatedCoach);
    } catch (error) {
        console.error("Update coach error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * @openapi
 * /api/coaches/{id}:
 *   delete:
 *     summary: Remove coach profile
 *     description: Permanently deletes the professional metadata (bio, specialty, etc.) but retains the User account.
 *     tags:
 *       - Coaches
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Coach profile removed successfully
 *       400:
 *         description: Invalid coach ID
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Coach profile not found
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    const { id } = await params;
    const coachId = parseInt(id);

    if (isNaN(coachId)) {
        return NextResponse.json({ error: "Invalid coach ID" }, { status: 400 });
    }

    try {
        const coach = await prisma.coach.findUnique({
            where: { id: coachId },
            include: { user: true }
        });

        if (!coach) {
            return NextResponse.json({ error: "Coach not found" }, { status: 404 });
        }

        // Auth checks: Self or Admin of the org
        const isSelf = session.userId === coach.userId;
        const isClubAdmin = session.role === "CLUB_ADMIN" && coach.user.organizationId === session.organizationId;
        const isSuperAdmin = session.role === "SUPER_ADMIN";

        if (!isSelf && !isClubAdmin && !isSuperAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.coach.delete({
            where: { id: coachId }
        });

        return NextResponse.json({ message: "Coach profile removed successfully" });
    } catch (error) {
        console.error("Delete coach error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth, requireRole } from "@/lib/security";
import { organizationSchema } from "@/lib/validation";

/**
 * @openapi
 * /api/organizations:
 *   get:
 *     summary: List all organizations (SUPER_ADMIN only)
 *     description: Returns a list of all organizations in the system with their member counts.
 *     tags:
 *       - Organizations
 *     responses:
 *       200:
 *         description: List of organizations fetched successfully
 *       401:
 *         description: Unauthorized - User not logged in
 *       403:
 *         description: Forbidden - Insufficient permissions (Requires SUPER_ADMIN)
 *       500:
 *         description: Internal server error
 */
export async function GET() {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    // Only SUPER_ADMIN can list all organizations
    const roleCheck = requireRole(["SUPER_ADMIN"])(session);
    if (roleCheck.error) return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });

    try {
        const orgs = await prisma.organization.findMany({
            include: {
                _count: {
                    select: { users: true, teams: true }
                }
            }
        });
        return NextResponse.json(orgs);
    } catch (error) {
        console.error("Fetch organizations error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * @openapi
 * /api/organizations:
 *   post:
 *     summary: Create a standalone organization (SUPER_ADMIN only)
 *     description: Registers a new organization with a unique name and automatically generated slug/joinCode.
 *     tags:
 *       - Organizations
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               address:
 *                 type: string
 *               contactEmail:
 *                 type: string
 *               contactPhone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Organization created successfully
 *       400:
 *         description: Bad Request - Validation failed or organization already exists
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

    const roleCheck = requireRole(["SUPER_ADMIN"])(session);
    if (roleCheck.error) return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });

    try {
        let body;
        try {
            const text = await request.text();
            body = text ? JSON.parse(text) : {};
        } catch (e) {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const result = organizationSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { name, description, address, contactEmail, contactPhone } = result.data;

        const slug = name.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "");

        const existingOrg = await prisma.organization.findFirst({
            where: { OR: [{ name }, { slug }] }
        });

        if (existingOrg) {
            return NextResponse.json({ error: "Organization with this name or slug already exists" }, { status: 400 });
        }

        const org = await prisma.$transaction(async (tx) => {
            // 1. Create with initial data
            const newOrg = await tx.organization.create({
                data: {
                    name,
                    slug,
                    description,
                    address,
                    contactEmail,
                    contactPhone
                }
            });

            // 2. Generate joinCode using ID (e.g., name-id or slug-id)
            const joinCode = `${slug}-${newOrg.id}`.toUpperCase();

            // 3. Update with joinCode
            return await tx.organization.update({
                where: { id: newOrg.id },
                data: { joinCode }
            });
        });

        return NextResponse.json(org, { status: 201 });
    } catch (error) {
        console.error("Create organization error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth, requireRole } from "@/lib/security";

/**
 * @openapi
 * /api/organizations:
 *   get:
 *     summary: List all organizations (SUPER_ADMIN only)
 *     tags:
 *       - Organizations
 */
export async function GET() {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

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

        const { name, description, address, contactEmail, contactPhone } = body;

        if (!name) {
            return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
        }

        const slug = name.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "");

        const existingOrg = await prisma.organization.findFirst({
            where: { OR: [{ name }, { slug }] }
        });

        if (existingOrg) {
            return NextResponse.json({ error: "Organization with this name or slug already exists" }, { status: 400 });
        }

        const org = await prisma.organization.create({
            data: {
                name,
                slug,
                description,
                address,
                contactEmail,
                contactPhone
            }
        });

        return NextResponse.json(org, { status: 201 });
    } catch (error) {
        console.error("Create organization error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

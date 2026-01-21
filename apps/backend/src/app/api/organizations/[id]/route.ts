import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth, requireRole } from "@/lib/security";
import { organizationSchema } from "@/lib/validation";

/**
 * @openapi
 * /api/organizations/{id}:
 *   get:
 *     summary: Get organization details
 *     description: Returns detailed info about a specific organization. Requires SUPER_ADMIN or membership.
 *     tags:
 *       - Organizations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The organization ID
 *     responses:
 *       200:
 *         description: Organization details fetched successfully
 *       400:
 *         description: Invalid organization ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a member or SUPER_ADMIN
 *       404:
 *         description: Organization not found
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

    const { id } = await params;
    const orgId = parseInt(id);

    if (isNaN(orgId)) {
        return NextResponse.json({ error: "Invalid organization ID" }, { status: 400 });
    }

    // Access Control: SUPER_ADMIN or own organization
    if (session.role !== "SUPER_ADMIN" && session.organizationId !== orgId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            include: {
                _count: {
                    select: { users: true, teams: true }
                }
            }
        });

        if (!org) {
            return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        return NextResponse.json(org);
    } catch (error) {
        console.error("Fetch organization error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * @openapi
 * /api/organizations/{id}:
 *   patch:
 *     summary: Update organization details
 *     description: Updates metadata fields of an organization. Automatic slug regeneration if name changes.
 *     tags:
 *       - Organizations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The organization ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               logoUrl:
 *                 type: string
 *               address:
 *                 type: string
 *               contactEmail:
 *                 type: string
 *               contactPhone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Organization updated successfully
 *       400:
 *         description: Bad Request - Validation failed or no fields to update
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires SUPER_ADMIN or CLUB_ADMIN of the organization
 *       404:
 *         description: Organization not found
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
    const orgId = parseInt(id);

    if (isNaN(orgId)) {
        return NextResponse.json({ error: "Invalid organization ID" }, { status: 400 });
    }

    // Access Control: SUPER_ADMIN or CLUB_ADMIN of the org
    const isSuperAdmin = session.role === "SUPER_ADMIN";
    const isClubAdminOfOrg = session.role === "CLUB_ADMIN" && session.organizationId === orgId;

    if (!isSuperAdmin && !isClubAdminOfOrg) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body;
    try {
        const text = await request.text();
        body = text ? JSON.parse(text) : {};
    } catch (e) {
        return NextResponse.json({ error: "Invalid JSON input" }, { status: 400 });
    }

    const result = organizationSchema.partial().safeParse(body);
    if (!result.success) {
        return NextResponse.json(
            { error: "Validation failed", details: result.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    const { name, description, address, contactEmail, contactPhone } = result.data;
    const { logoUrl } = body; // logoUrl not in validation yet, keeping as is

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (logoUrl !== undefined) data.logoUrl = logoUrl;
    if (address !== undefined) data.address = address;
    if (contactEmail !== undefined) data.contactEmail = contactEmail;
    if (contactPhone !== undefined) data.contactPhone = contactPhone;

    if (name) {
        data.slug = name.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "");
    }

    if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    try {
        const updatedOrg = await prisma.organization.update({
            where: { id: orgId },
            data
        });

        return NextResponse.json(updatedOrg);
    } catch (error) {
        console.error("Update organization error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * @openapi
 * /api/organizations/{id}:
 *   delete:
 *     summary: Delete organization (SUPER_ADMIN only)
 *     description: Permanently removes an organization and all associated data.
 *     tags:
 *       - Organizations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The organization ID
 *     responses:
 *       200:
 *         description: Organization deleted successfully
 *       400:
 *         description: Invalid organization ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires SUPER_ADMIN
 *       404:
 *         description: Organization not found
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

    const roleCheck = requireRole(["SUPER_ADMIN"])(session);
    if (roleCheck.error) return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });

    const { id } = await params;
    const orgId = parseInt(id);

    if (isNaN(orgId)) {
        return NextResponse.json({ error: "Invalid organization ID" }, { status: 400 });
    }

    try {
        await prisma.organization.delete({
            where: { id: orgId }
        });

        return NextResponse.json({ message: "Organization deleted successfully" });
    } catch (error) {
        console.error("Delete organization error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

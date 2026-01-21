import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import bcrypt from "bcryptjs";
import { onboardClubSchema } from "@/lib/validation";

/**
 * @openapi
 * /api/auth/onboard-club:
 *   post:
 *     summary: Dedicated club onboarding
 *     description: Creates a new organization/club and its initial CLUB_ADMIN user. Generates a secure joinCode based on name and ID.
 *     tags:
 *       - Auth
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
 *               - organizationName
 *             properties:
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               organizationName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Club onboarded successfully
 *       400:
 *         description: Validation error or organization already exists
 */
export async function POST(request: Request) {
    try {
        let body;
        try {
            const text = await request.text();
            body = text ? JSON.parse(text) : {};
        } catch (e) {
            return NextResponse.json({ error: "Invalid JSON input" }, { status: 400 });
        }

        const result = onboardClubSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { email, username, password, organizationName } = result.data;

        // Check if org name or user already exists
        const existingOrg = await prisma.organization.findUnique({
            where: { name: organizationName }
        });

        if (existingOrg) {
            return NextResponse.json({ error: "Organization name already taken" }, { status: 400 });
        }

        const existingUser = await prisma.user.findFirst({
            where: { OR: [{ email }, { username }] }
        });

        if (existingUser) {
            return NextResponse.json({ error: "Email or username already in use" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const slug = organizationName.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "");

        const transaction = await prisma.$transaction(async (tx) => {
            // 1. Create Organization
            const org = await tx.organization.create({
                data: {
                    name: organizationName,
                    slug
                }
            });

            // 2. Generate joinCode using ID
            const joinCode = `${slug}-${org.id}`.toUpperCase();

            // 3. Update Organization with joinCode
            const updatedOrg = await tx.organization.update({
                where: { id: org.id },
                data: { joinCode }
            });

            // 4. Create User
            const user = await tx.user.create({
                data: {
                    email,
                    username,
                    password: hashedPassword,
                    role: "CLUB_ADMIN",
                    organizationId: org.id
                }
            });

            return { user, org: updatedOrg };
        });

        return NextResponse.json({
            message: "Club onboarded successfully",
            organization: {
                id: transaction.org.id,
                name: transaction.org.name,
                slug: transaction.org.slug,
                joinCode: transaction.org.joinCode
            },
            admin: {
                id: transaction.user.id,
                email: transaction.user.email,
                username: transaction.user.username
            }
        });
    } catch (error) {
        console.error("Club onboarding error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

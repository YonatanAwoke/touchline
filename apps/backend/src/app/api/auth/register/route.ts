import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import bcrypt from "bcryptjs";
import { registerSchema } from "@/lib/validation";

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new organization and club admin
 *     description: Creates a new organization/club and its initial CLUB_ADMIN user.
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
 *         description: Organization and Admin registered successfully
 *       400:
 *         description: Validation error or user/org already exists
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

        // 1. Validate input
        const result = registerSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { email, username, password, organizationName } = result.data;

        // 2. Check if user or organization exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { username }
                ]
            },
        });

        if (existingUser) {
            const field = existingUser.email === email ? "email" : "username";
            return NextResponse.json(
                { error: `User with this ${field} already exists` },
                { status: 400 }
            );
        }

        const existingOrg = await prisma.organization.findUnique({
            where: { name: organizationName }
        });

        if (existingOrg) {
            return NextResponse.json(
                { error: "Organization with this name already exists" },
                { status: 400 }
            );
        }

        // 3. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Create Organization and Admin User in a transaction
        const transaction = await prisma.$transaction(async (tx) => {
            // Create Organization with slug
            const slug = organizationName.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "");
            const org = await tx.organization.create({
                data: {
                    name: organizationName,
                    slug
                }
            });

            // Create User (Defaulting to CLUB_ADMIN as the creator)
            const user = await tx.user.create({
                data: {
                    email,
                    username,
                    password: hashedPassword,
                    role: "CLUB_ADMIN",
                    organizationId: org.id
                }
            });

            return { user, org };
        });

        return NextResponse.json({
            message: "Organization registered successfully",
            user: {
                id: transaction.user.id,
                email: transaction.user.email,
                username: transaction.user.username,
                role: transaction.user.role,
                organizationId: transaction.org.id,
                organizationName: transaction.org.name
            },
        });
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

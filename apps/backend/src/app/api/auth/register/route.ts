import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import bcrypt from "bcryptjs";
import { registerSchema } from "@/lib/validation";

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new standard user (Coach, Analyst, Player)
 *     description: Allows users to join an existing organization using a slug and a secure joinCode.
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
 *               - organizationSlug
 *               - joinCode
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               organizationSlug:
 *                 type: string
 *               joinCode:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [COACH, ANALYST, PLAYER]
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or invalid join credentials
 *       404:
 *         description: Organization not found
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

        const result = registerSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { email, username, password, organizationSlug, joinCode, role } = result.data;

        // 1. Verify Organization and Join Code
        const org = await prisma.organization.findUnique({
            where: { slug: organizationSlug }
        });

        if (!org) {
            return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        if (org.joinCode !== joinCode) {
            return NextResponse.json({ error: "Invalid join code for this organization" }, { status: 400 });
        }

        // 2. Check if user already exists
        const existingUser = await prisma.user.findFirst({
            where: { OR: [{ email }, { username }] }
        });

        if (existingUser) {
            return NextResponse.json({ error: "Email or username already in use" }, { status: 400 });
        }

        // 3. Create User
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
                role,
                organizationId: org.id
            },
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                organizationId: true
            }
        });

        return NextResponse.json({
            message: "User registered successfully",
            user
        }, { status: 201 });

    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

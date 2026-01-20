import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import bcrypt from "bcryptjs";
import { registerSchema } from "@/lib/validation";

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new coach
 *     description: Creates a new user with the COACH role.
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
 *             properties:
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or user already exists
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // 1. Validate input
        const result = registerSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { email, username, password } = result.data;

        // 2. Check for existing user
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

        // 3. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Create user
        const user = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
                role: "COACH",
                coachProfile: {
                    create: {},
                },
            },
            include: {
                coachProfile: true,
            },
        });

        return NextResponse.json({
            message: "User registered successfully",
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role,
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

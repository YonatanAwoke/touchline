import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { signJWT, signRefreshToken } from "@/lib/auth";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/lib/validation";

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login for coaches
 *     description: Verifies credentials (email or username), tracks attempts, issues access and refresh tokens.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *             required:
 *               - password
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account locked
 *       400:
 *         description: Validation error
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // 1. Validate input
        const result = loginSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { email, username, password } = result.data;

        // 2. Find user
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: email || undefined },
                    { username: username || undefined }
                ]
            },
            include: { coachProfile: true },
        });

        if (!user) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }

        // 3. Check for Lockout
        if (user.lockoutUntil && user.lockoutUntil > new Date()) {
            return NextResponse.json(
                { error: "Account locked. Please try again later.", lockoutUntil: user.lockoutUntil },
                { status: 403 }
            );
        }

        // 4. Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            // Increment failed attempts
            const failedAttempts = user.failedLoginAttempts + 1;
            let lockoutUntil = null;

            if (failedAttempts >= 5) {
                lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
            }

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    failedLoginAttempts: failedAttempts,
                    lockoutUntil
                }
            });

            return NextResponse.json(
                {
                    error: "Invalid credentials",
                    attemptsRemaining: Math.max(0, 5 - failedAttempts)
                },
                { status: 401 }
            );
        }

        // 5. Successful login - Reset attempts
        await prisma.user.update({
            where: { id: user.id },
            data: {
                failedLoginAttempts: 0,
                lockoutUntil: null
            }
        });

        // 6. Generate Tokens
        const accessToken = await signJWT({
            userId: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            coachId: user.coachProfile?.id,
        });

        const refreshTokenString = await signRefreshToken({});
        const hashedRefreshToken = await bcrypt.hash(refreshTokenString, 10);

        // Store hashed refresh token
        await prisma.refreshToken.create({
            data: {
                hashedToken: hashedRefreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            }
        });

        // 7. Set cookies
        const cookieStore = await cookies();

        cookieStore.set("token", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 15 * 60, // 15 mins
            path: "/",
        });

        cookieStore.set("refreshToken", refreshTokenString, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: "/",
        });

        cookieStore.set("userId", user.id.toString(), {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: "/",
        });

        return NextResponse.json({
            message: "Login successful",
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

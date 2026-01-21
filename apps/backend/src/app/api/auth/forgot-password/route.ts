import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import crypto from "crypto";

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset
 *     description: Generates a reset token and "sends" it (simulated).
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
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset email sent
 *       404:
 *         description: User not found
 */
export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // For security, you might want to return 200 even if user not found
            // to avoid email enumeration. But for this impl, we'll return 404.
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Generate token
        const resetToken = crypto.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 3600000); // 1 hour

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: resetToken,
                resetPasswordExpires: expires,
            },
        });

        // SIMULATED: Logging the token instead of sending email
        console.log(`[PASS_RESET] Token for ${email}: ${resetToken}`);

        return NextResponse.json({
            message: "Password reset token generated (simulated)",
            // In a real app, don't return the token in the response!
            token: resetToken
        });
    } catch (error) {
        console.error("Forgot password error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

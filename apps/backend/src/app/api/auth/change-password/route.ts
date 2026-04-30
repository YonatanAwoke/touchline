import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/lib/security";

/**
 * @openapi
 * /api/auth/change-password:
 *   post:
 *     summary: Change current user password
 *     description: Validates the current password and updates the user's password.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid input or incorrect current password
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function POST(request: Request) {
    try {
        const auth = await requireAuth();
        if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const { currentPassword, newPassword } = await request.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: "Current and new password are required" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: auth.session.userId },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                // optionally clear lockout tokens if needed, but not strictly necessary here
            },
        });

        return NextResponse.json({ message: "Password has been changed successfully" });
    } catch (error) {
        console.error("Change password error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

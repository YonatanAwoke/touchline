import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@touchline/database";
import bcrypt from "bcryptjs";

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Logout and revoke refresh tokens
 *     description: Clears cookies and revokes the current refresh token from the database.
 *     tags:
 *       - Auth
 *     responses:
 *       200:
 *         description: Logout successful
 */
export async function POST() {
    try {
        const cookieStore = await cookies();
        const refreshTokenString = cookieStore.get("refreshToken")?.value;
        const userIdCookie = cookieStore.get("userId")?.value;

        if (refreshTokenString && userIdCookie) {
            const userId = parseInt(userIdCookie);

            // Find and delete the current refresh token
            const dbTokens = await prisma.refreshToken.findMany({
                where: { userId },
            });

            for (const dbToken of dbTokens) {
                const isValid = await bcrypt.compare(refreshTokenString, dbToken.hashedToken);
                if (isValid) {
                    await prisma.refreshToken.delete({ where: { id: dbToken.id } });
                    break;
                }
            }
        }

        // Clear cookies
        cookieStore.delete("token");
        cookieStore.delete("refreshToken");
        cookieStore.delete("userId");

        return NextResponse.json({ message: "Logout successful" });
    } catch (error) {
        console.error("Logout error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

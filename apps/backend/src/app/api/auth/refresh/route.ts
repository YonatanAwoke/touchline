import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { signJWT, signRefreshToken } from "@/lib/auth";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export async function POST() {
    try {
        const cookieStore = await cookies();
        const refreshTokenString = cookieStore.get("refreshToken")?.value;

        if (!refreshTokenString) {
            return NextResponse.json({ error: "No refresh token" }, { status: 401 });
        }

        const userIdCookie = cookieStore.get("userId")?.value;
        if (!userIdCookie) {
            return NextResponse.json({ error: "Missing session info" }, { status: 401 });
        }
        const userId = parseInt(userIdCookie);

        const dbTokens = await prisma.refreshToken.findMany({
            where: { userId },
        });

        let validToken = null;
        for (const dbToken of dbTokens) {
            const isValid = await bcrypt.compare(refreshTokenString, dbToken.hashedToken);
            if (isValid && dbToken.expiresAt > new Date()) {
                validToken = dbToken;
                break;
            }
        }

        if (!validToken) {
            return NextResponse.json({ error: "Invalid or expired refresh token" }, { status: 401 });
        }

        // 2. Token Rotation: Delete old token
        await prisma.refreshToken.delete({ where: { id: validToken.id } });

        // 3. Issue new tokens
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { coachProfile: true }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 401 });
        }

        const accessToken = await signJWT({
            userId: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            organizationId: user.organizationId,
            coachId: user.coachProfile?.id,
        });

        const newRefreshTokenString = await signRefreshToken({});
        const hashedRefreshToken = await bcrypt.hash(newRefreshTokenString, 10);

        await prisma.refreshToken.create({
            data: {
                hashedToken: hashedRefreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        });

        // 4. Update cookies
        cookieStore.set("token", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 15 * 60,
            path: "/",
        });

        cookieStore.set("refreshToken", newRefreshTokenString, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60,
            path: "/",
        });

        cookieStore.set("userId", user.id.toString(), {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: "/",
        });

        return NextResponse.json({ message: "Token refreshed" });
    } catch (error) {
        console.error("Refresh error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

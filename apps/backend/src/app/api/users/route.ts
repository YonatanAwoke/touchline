import { NextResponse } from "next/server";
import prisma from "@touchline/database";

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Retrieve all users
 *     description: Returns a list of all registered users (sanitized).
 *     tags:
 *       - Users
 *     responses:
 *       200:
 *         description: List of users fetched successfully
 *       500:
 *         description: Internal server error
 */
export async function GET() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                createdAt: true,
            },
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error("Fetch users error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

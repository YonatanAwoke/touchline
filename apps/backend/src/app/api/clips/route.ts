import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth } from "@/lib/security";
import { videoClipCreateSchema } from "@/lib/validation";

/**
 * @openapi
 * /api/clips:
 *   post:
 *     summary: Create a new video clip
 *     tags:
 *       - Clips
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - videoId
 *               - startSec
 *               - endSec
 *               - organizationId
 *             properties:
 *               videoId:
 *                 type: integer
 *               playerId:
 *                 type: integer
 *               startSec:
 *                 type: integer
 *               endSec:
 *                 type: integer
 *               label:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               createdBy:
 *                 type: string
 *                 enum: [MANUAL, AI]
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Clip created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
export async function POST(request: Request) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    try {
        let body;
        try {
            const text = await request.text();
            body = text ? JSON.parse(text) : {};
        } catch (e) {
            return NextResponse.json({ error: "Invalid JSON input" }, { status: 400 });
        }

        const result = videoClipCreateSchema.safeParse(body);
        if (!result.success) return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });

        const data = result.data;

        // Verify video exists and belongs to organization
        const video = await prisma.video.findUnique({ where: { id: data.videoId } });
        if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

        if (session.role !== "SUPER_ADMIN" && video.organizationId !== session.organizationId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Verify player if provided
        if (data.playerId) {
            const player = await prisma.player.findUnique({
                where: { id: data.playerId },
                include: { user: true }
            });
            if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
            if (session.role !== "SUPER_ADMIN" && player.user.organizationId !== session.organizationId) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        const clip = await prisma.videoClip.create({
            data: {
                videoId: data.videoId,
                playerId: data.playerId,
                startSec: data.startSec,
                endSec: data.endSec,
                label: data.label,
                tags: data.tags,
                createdBy: data.createdBy as any,
                metadata: data.metadata as any,
                organizationId: video.organizationId,
            },
            include: {
                video: true,
                player: true,
            }
        });

        return NextResponse.json(clip, { status: 201 });
    } catch (error) {
        console.error("Create clip error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * @openapi
 * /api/clips:
 *   get:
 *     summary: List video clips
 *     tags:
 *       - Clips
 *     parameters:
 *       - in: query
 *         name: videoId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: playerId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of clips
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: Request) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    try {
        const url = new URL(request.url);
        const params = url.searchParams;
        const skip = parseInt(params.get("skip") || "0", 10) || 0;
        const take = Math.min(parseInt(params.get("limit") || "25", 10) || 25, 100);
        const videoId = params.get("videoId");
        const playerId = params.get("playerId");

        const where: any = {};

        // Scope to organization
        if (session.role !== "SUPER_ADMIN") {
            where.organizationId = session.organizationId;
        }

        if (videoId) where.videoId = Number(videoId);
        if (playerId) where.playerId = Number(playerId);

        const [items, total] = await prisma.$transaction([
            prisma.videoClip.findMany({
                where,
                include: {
                    video: true,
                    player: true,
                },
                skip,
                take,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.videoClip.count({ where })
        ]);

        return NextResponse.json({ items, total, skip, limit: take });
    } catch (error) {
        console.error("List clips error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

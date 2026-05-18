import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth } from "@/lib/security";
import { videoCreateSchema } from "@/lib/validation";

/**
 * @openapi
 * /api/videos:
 *   post:
 *     summary: Create a new video
 *     tags:
 *       - Videos
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - storagePath
 *             properties:
 *               storagePath:
 *                 type: string
 *               originalName:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [TRAINING, MATCH, OTHER]
 *               status:
 *                 type: string
 *                 enum: [PENDING, PROCESSING, COMPLETED, FAILED]
 *               durationSec:
 *                 type: integer
 *               fps:
 *                 type: integer
 *               width:
 *                 type: integer
 *               height:
 *                 type: integer
 *               sessionId:
 *                 type: integer
 *               matchId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Video created successfully
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

        const result = videoCreateSchema.safeParse(body);
        if (!result.success) return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });

        const data = result.data;

        // Auto-infer organizationId from session
        const organizationId = session.organizationId;
        if (!organizationId) {
            return NextResponse.json({ error: "User must belong to an organization" }, { status: 400 });
        }

        // Verify session/match if provided
        if (data.sessionId) {
            const sessionExists = await prisma.session.findUnique({ where: { id: data.sessionId } });
            if (!sessionExists) return NextResponse.json({ error: "Session not found" }, { status: 404 });
            if (session.role !== "SUPER_ADMIN" && sessionExists.organizationId !== session.organizationId) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        if (data.matchId) {
            const match = await prisma.match.findUnique({ where: { id: data.matchId }, include: { team: true } });
            if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
            if (session.role !== "SUPER_ADMIN" && match.team.organizationId !== session.organizationId) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        // Normalize foreign keys: treat 0 as null
        const sessionId = data.sessionId && data.sessionId > 0 ? data.sessionId : null;
        const matchId = data.matchId && data.matchId > 0 ? data.matchId : null;

        const video = await prisma.video.create({
            data: {
                storagePath: data.storagePath,
                originalName: data.originalName,
                type: data.type as any,
                status: data.status as any,
                durationSec: data.durationSec,
                fps: data.fps,
                width: data.width,
                height: data.height,
                organizationId: organizationId,
                sessionId: sessionId,
                matchId: matchId,
            },
        });

        return NextResponse.json(video, { status: 201 });
    } catch (error) {
        console.error("Create video error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * @openapi
 * /api/videos:
 *   get:
 *     summary: List videos
 *     tags:
 *       - Videos
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TRAINING, MATCH, OTHER]
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: matchId
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
 *         description: List of videos
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
        const type = params.get("type");
        const sessionId = params.get("sessionId");
        const matchId = params.get("matchId");

        const where: any = {};

        // Scope to organization
        if (session.role !== "SUPER_ADMIN") {
            where.organizationId = session.organizationId;
        }

        if (type) where.type = type;
        if (sessionId) where.sessionId = Number(sessionId);
        if (matchId) where.matchId = Number(matchId);

        // Exclude videos uploaded for player examinations
        where.playerAnalyses = {
            none: {}
        };

        const [items, total] = await prisma.$transaction([
            prisma.video.findMany({
                where,
                include: {
                    session: true,
                    match: true,
                    clips: true,
                    analysisJobs: true,
                },
                skip,
                take,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.video.count({ where })
        ]);

        return NextResponse.json({ items, total, skip, limit: take });
    } catch (error) {
        console.error("List videos error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * DELETE /api/videos?id=N — delete a video and its file
 */
export async function DELETE(request: Request) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    try {
        const url = new URL(request.url);
        const idParam = url.searchParams.get("id");
        if (!idParam) return NextResponse.json({ error: "id is required" }, { status: 400 });
        const id = Number(idParam);

        const video = await prisma.video.findUnique({ where: { id } });
        if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });
        if (session.role !== "SUPER_ADMIN" && video.organizationId !== session.organizationId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Delete from DB (cascade handles clips / analysis jobs via FK)
        await prisma.video.delete({ where: { id } });

        // Attempt to delete file from disk (non-blocking)
        try {
            const { unlink } = await import("fs/promises");
            const { getStoragePath } = await import("@/lib/upload");
            await unlink(getStoragePath(video.storagePath));
        } catch (_) { /* ignore if file not found */ }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete video error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

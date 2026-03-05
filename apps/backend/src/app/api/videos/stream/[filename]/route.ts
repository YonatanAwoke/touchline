import { NextResponse } from "next/server";
import { createReadStream, statSync } from "fs";
import { requireAuth } from "@/lib/security";
import { getStoragePath } from "@/lib/upload";
import prisma from "@touchline/database";

/**
 * @openapi
 * /api/videos/stream/{filename}:
 *   get:
 *     summary: Stream a video file
 *     tags:
 *       - Videos
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Video stream
 *       404:
 *         description: Video not found
 *       403:
 *         description: Forbidden
 */
export async function GET(
    request: Request,
    { params }: { params: { filename: string } | Promise<{ filename: string }> }
) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    try {
        const resolvedParams = await params as any;
        const filename = resolvedParams.filename;

        // Find video in database
        const video = await prisma.video.findFirst({
            where: { storagePath: filename },
        });

        if (!video) {
            return NextResponse.json({ error: "Video not found" }, { status: 404 });
        }

        // Verify organization access
        if (session.role !== "SUPER_ADMIN" && video.organizationId !== session.organizationId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const filePath = getStoragePath(filename);
        const stat = statSync(filePath);
        const fileSize = stat.size;

        // Parse range header for video seeking
        const range = request.headers.get("range");

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = end - start + 1;

            const stream = createReadStream(filePath, { start, end });

            return new Response(stream as any, {
                status: 206,
                headers: {
                    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                    "Accept-Ranges": "bytes",
                    "Content-Length": chunkSize.toString(),
                    "Content-Type": "video/mp4",
                },
            });
        } else {
            const stream = createReadStream(filePath);

            return new Response(stream as any, {
                status: 200,
                headers: {
                    "Content-Length": fileSize.toString(),
                    "Content-Type": "video/mp4",
                },
            });
        }
    } catch (error) {
        console.error("Stream video error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

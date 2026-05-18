import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth } from "@/lib/security";
import { playerAnalysisCreateSchema } from "@/lib/validation";
import { uploadToSupabase } from "@/lib/supabase";
import { queueAnalysisJob } from "@/lib/queue";
import { sanitizeFilename } from "@/lib/upload";

// Allow large video uploads
export const maxDuration = 300; 
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    try {
        const contentType = request.headers.get("content-type") || "";
        let body: any;
        let videoId: number | undefined;

        if (contentType.includes("multipart/form-data")) {
            const formData = await request.formData();
            const videoFile = formData.get("video") as File;
            
            body = {
                title: formData.get("title"),
                date: formData.get("date"),
                playerId: Number(formData.get("playerId")),
                sessionId: formData.get("sessionId") ? Number(formData.get("sessionId")) : undefined,
                notes: formData.get("notes"),
                inputMode: "video",
                analysisData: {} 
            };

            if (videoFile) {
                const arrayBuffer = await videoFile.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                
                const ext = videoFile.name.split('.').pop();
                const safeName = sanitizeFilename(videoFile.name.replace(`.${ext}`, ''));
                const filename = `player-analyses/${Date.now()}_${safeName}.${ext}`;
                
                // Upload to Supabase Storage
                console.log(`Uploading ${videoFile.name} to Supabase Storage: ${filename}`);
                await uploadToSupabase("videos", filename, buffer, videoFile.type);

                // Create a Video record
                const video = await prisma.video.create({
                    data: {
                        storagePath: filename, 
                        originalName: videoFile.name,
                        type: "TRAINING",
                        status: "PROCESSING",
                        organizationId: session.organizationId,
                    }
                });
                videoId = video.id;
                body.videoId = videoId;
            }
        } else {
            body = await request.json();
            
            // Handle pre-uploaded video via signed URL
            if (body.videoPath) {
                const video = await prisma.video.create({
                    data: {
                        storagePath: body.videoPath,
                        originalName: body.originalName || body.videoPath.split('/').pop() || "video.mp4",
                        type: "TRAINING",
                        status: "PROCESSING",
                        organizationId: session.organizationId,
                    }
                });
                videoId = video.id;
                body.videoId = videoId;
                body.inputMode = "video";
            }
        }

        const result = playerAnalysisCreateSchema.safeParse({ ...body, organizationId: session.organizationId });
        if (!result.success) return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });

        const data = result.data;
        
        // Create the PlayerAnalysis record
        const analysis = await prisma.playerAnalysis.create({
            data: {
                title: data.title,
                date: new Date(data.date),
                playerId: data.playerId,
                sessionId: data.sessionId,
                notes: data.notes,
                inputMode: data.inputMode,
                status: data.inputMode === "video" ? "QUEUED" : "COMPLETED",
                videoId: data.videoId,
                analysisData: data.analysisData as any,
                selectedMetrics: data.selectedMetrics,
                organizationId: session.organizationId,
            }
        });

        // If it's a video, queue the analysis job
        if (data.inputMode === "video" && videoId) {
            const video = await prisma.video.findUnique({ where: { id: videoId } });
            if (video) {
                await queueAnalysisJob({
                    videoId: video.id,
                    storagePath: video.storagePath, // This is the Supabase path
                    modelVersion: "v1-yolo-pose",
                    organizationId: session.organizationId,
                    playerAnalysisId: analysis.id
                });
            }
        }

        return NextResponse.json(analysis, { status: 201 });
    } catch (error: any) {
        console.error("Create player analysis error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

/**
 * @openapi
 * /api/examinations/player:
 *   get:
 *     summary: List player analyses
 *     tags:
 *       - Examinations
 *     parameters:
 *       - in: query
 *         name: playerId
 *         schema:
 *           type: integer
 */
export async function GET(request: Request) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    const url = new URL(request.url);
    const playerId = url.searchParams.get("playerId");

    try {
        const where: any = { organizationId: session.organizationId };
        if (playerId) where.playerId = Number(playerId);

        const items = await prisma.playerAnalysis.findMany({
            where,
            include: {
                player: {
                    include: {
                        user: { select: { firstName: true, lastName: true, username: true } }
                    }
                }
            },
            orderBy: { date: 'desc' }
        });
        return NextResponse.json({ items });
    } catch (error) {
        console.error("List player analyses error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

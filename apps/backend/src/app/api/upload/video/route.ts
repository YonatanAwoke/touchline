import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import prisma from "@touchline/database";
import { requireAuth } from "@/lib/security";
import {
    initializeUploadDir,
    generateVideoFilename,
    getStoragePath,
    isValidVideoFormat,
    extractVideoMetadata,
    uploadConfig,
    isCloudStorage,
} from "@/lib/upload";
import { uploadToSupabase } from "@/lib/supabase";
import { queueAnalysisJob } from "@/lib/queue";

/**
 * @openapi
 * /api/upload/video:
 *   post:
 *     summary: Upload a video file
 *     tags:
 *       - Upload
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               sessionId:
 *                 type: integer
 *               matchId:
 *                 type: integer
 *               type:
 *                 type: string
 *                 enum: [TRAINING, MATCH, OTHER]
 *     responses:
 *       201:
 *         description: Video uploaded successfully
 *       400:
 *         description: Invalid file or missing required fields
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: File too large
 *       500:
 *         description: Internal server error
 */
export async function POST(request: Request) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    try {
        // Initialize upload directory
        await initializeUploadDir();

        // Parse multipart form data
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const sessionId = formData.get("sessionId") ? parseInt(formData.get("sessionId") as string) : null;
        const matchId = formData.get("matchId") ? parseInt(formData.get("matchId") as string) : null;
        const type = (formData.get("type") as string) || "OTHER";

        // Validate file
        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Validate file size
        if (file.size > uploadConfig.MAX_FILE_SIZE) {
            return NextResponse.json({
                error: `File too large. Maximum size is ${uploadConfig.MAX_FILE_SIZE / 1024 / 1024}MB`
            }, { status: 413 });
        }

        // Validate file format
        if (!isValidVideoFormat(file.name)) {
            return NextResponse.json({
                error: `Invalid file format. Allowed formats: ${uploadConfig.ALLOWED_FORMATS.join(", ")}`
            }, { status: 400 });
        }

        // Validate session or match association
        const hasSession = sessionId && sessionId > 0;
        const hasMatch = matchId && matchId > 0;

        if (!hasSession && !hasMatch) {
            return NextResponse.json({
                error: "Video must be associated with either a session or a match"
            }, { status: 400 });
        }

        // Get organization ID
        const organizationId = session.organizationId;
        if (!organizationId) {
            return NextResponse.json({ error: "User must belong to an organization" }, { status: 400 });
        }

        // Verify session/match ownership
        if (hasSession) {
            const sessionExists = await prisma.session.findUnique({ where: { id: sessionId } });
            if (!sessionExists) {
                return NextResponse.json({ error: "Session not found" }, { status: 404 });
            }
            if (session.role !== "SUPER_ADMIN" && sessionExists.organizationId !== organizationId) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        if (hasMatch) {
            const match = await prisma.match.findUnique({
                where: { id: matchId },
                include: { team: true }
            });
            if (!match) {
                return NextResponse.json({ error: "Match not found" }, { status: 404 });
            }
            if (session.role !== "SUPER_ADMIN" && match.team.organizationId !== organizationId) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        // Generate filename and save file
        const filename = generateVideoFilename(organizationId, file.name);
        const storagePath = getStoragePath(filename);

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        if (isCloudStorage) {
            console.log(`[Upload] Saving to Supabase storage: ${filename}`);
            await uploadToSupabase("videos", filename, buffer, file.type);
        } else {
            console.log(`[Upload] Saving to local storage: ${storagePath}`);
            await writeFile(storagePath, buffer);
        }

        // Extract video metadata (only if local)
        const metadata = !isCloudStorage 
            ? await extractVideoMetadata(storagePath)
            : { durationSec: null, fps: null, width: null, height: null };

        // Create video record in database
        const video = await prisma.video.create({
            data: {
                storagePath: filename, // Store relative path
                originalName: file.name,
                type: type as any,
                status: "PENDING",
                durationSec: metadata.durationSec,
                fps: metadata.fps,
                width: metadata.width,
                height: metadata.height,
                organizationId: organizationId,
                sessionId: hasSession ? sessionId : null,
                matchId: hasMatch ? matchId : null,
            },
        });

        // 8. Queue Analysis Job automatically
        try {
            await queueAnalysisJob({
                videoId: video.id,
                storagePath: filename,
                modelVersion: "v1",
                organizationId: organizationId,
            });
            console.log(`[Upload] Analysis job queued for video ${video.id}`);
        } catch (queueError) {
            console.error("[Upload] Failed to queue analysis job:", queueError);
            // Don't fail the upload if queuing fails, but log it
        }

        return NextResponse.json({
            message: "Video uploaded successfully",
            video: {
                id: video.id,
                filename: filename,
                originalName: file.name,
                size: file.size,
                metadata: metadata,
            }
        }, { status: 201 });

    } catch (error) {
        console.error("Upload video error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

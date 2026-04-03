import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth } from "@/lib/security";
import { analysisJobCreateSchema } from "@/lib/validation";
import { queueAnalysisJob } from "@/lib/queue";

/**
 * @openapi
 * /api/analysis:
 *   post:
 *     summary: Create a new analysis job
 *     tags:
 *       - Analysis
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - videoId
 *               - modelVersion
 *             properties:
 *               videoId:
 *                 type: integer
 *               modelVersion:
 *                 type: string
 *     responses:
 *       201:
 *         description: Analysis job created successfully
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

        const result = analysisJobCreateSchema.safeParse(body);
        if (!result.success) return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });

        const data = result.data;

        // Verify video exists and belongs to organization
        const video = await prisma.video.findUnique({ where: { id: data.videoId } });
        if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

        if (session.role !== "SUPER_ADMIN" && video.organizationId !== session.organizationId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const job = await prisma.analysisJob.create({
            data: {
                videoId: data.videoId,
                modelVersion: data.modelVersion,
                status: "QUEUED",
            },
            include: {
                video: true,
            }
        });

        // Queue the job for processing
        try {
            const queueJobId = await queueAnalysisJob({
                videoId: video.id,
                storagePath: video.storagePath,
                modelVersion: data.modelVersion,
                organizationId: video.organizationId,
            });

            console.log(`Analysis job ${job.id} queued with ID: ${queueJobId}`);
        } catch (queueError) {
            console.error("Error queuing job:", queueError);
            await prisma.analysisJob.update({
                where: { id: job.id },
                data: { status: "FAILED" },
            });
            return NextResponse.json({
                error: "Failed to queue analysis job. Please try again."
            }, { status: 500 });
        }

        return NextResponse.json(job, { status: 201 });
    } catch (error) {
        console.error("Create analysis job error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * @openapi
 * /api/analysis:
 *   get:
 *     summary: List analysis jobs
 *     tags:
 *       - Analysis
 *     parameters:
 *       - in: query
 *         name: videoId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [QUEUED, PROCESSING, COMPLETED, FAILED]
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
 *         description: List of analysis jobs
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
        const status = params.get("status");

        const where: any = {};

        // Scope to organization via video
        if (session.role !== "SUPER_ADMIN") {
            where.video = { organizationId: session.organizationId };
        }

        if (videoId) where.videoId = Number(videoId);
        if (status) where.status = status;

        const [items, total] = await prisma.$transaction([
            prisma.analysisJob.findMany({
                where,
                include: {
                    video: true,
                    results: true,
                },
                skip,
                take,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.analysisJob.count({ where })
        ]);

        return NextResponse.json({ items, total, skip, limit: take });
    } catch (error) {
        console.error("List analysis jobs error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * DELETE /api/analysis?id=N — delete an analysis job
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

        const job = await prisma.analysisJob.findUnique({
            where: { id },
            include: { video: true },
        });
        if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
        if (session.role !== "SUPER_ADMIN" && job.video.organizationId !== session.organizationId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.analysisJob.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete analysis job error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

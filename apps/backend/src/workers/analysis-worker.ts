import { Worker, Job } from "bullmq";
import { connection, type AnalysisJobData } from "../lib/queue";
import prisma from "@touchline/database";
import { getStoragePath } from "../lib/upload";

/**
 * Analysis Worker
 * Processes video analysis jobs from the queue
 */
const worker = new Worker<AnalysisJobData>(
    "analysis",
    async (job: Job<AnalysisJobData>) => {
        const { videoId, storagePath, modelVersion, organizationId } = job.data;

        console.log(`Processing analysis job ${job.id} for video ${videoId}`);

        try {
            // Update job status to PROCESSING
            await prisma.analysisJob.updateMany({
                where: { videoId, modelVersion },
                data: {
                    status: "PROCESSING",
                    startedAt: new Date(),
                },
            });

            // Get full file path
            const filePath = getStoragePath(storagePath);

            // TODO: Call Python AI service here
            // For now, simulate processing with a delay
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Mock results
            const mockResults = [
                {
                    type: "TRACKING" as const,
                    payload: {
                        players: [
                            { id: 1, positions: [[100, 200], [150, 250]] },
                        ],
                    },
                },
                {
                    type: "METRICS" as const,
                    payload: {
                        totalDistance: 5.2,
                        maxSpeed: 28.5,
                        sprints: 12,
                    },
                },
            ];

            // Find the analysis job
            const analysisJob = await prisma.analysisJob.findFirst({
                where: { videoId, modelVersion },
            });

            if (!analysisJob) {
                throw new Error("Analysis job not found");
            }

            // Store results in database
            await prisma.$transaction([
                ...mockResults.map(result =>
                    prisma.analysisResult.create({
                        data: {
                            analysisJobId: analysisJob.id,
                            type: result.type,
                            payload: result.payload as any,
                        },
                    })
                ),
                prisma.analysisJob.update({
                    where: { id: analysisJob.id },
                    data: {
                        status: "COMPLETED",
                        finishedAt: new Date(),
                    },
                }),
            ]);

            console.log(`Analysis job ${job.id} completed successfully`);

            return { success: true, resultsCount: mockResults.length };
        } catch (error) {
            console.error(`Analysis job ${job.id} failed:`, error);

            // Update job status to FAILED
            await prisma.analysisJob.updateMany({
                where: { videoId, modelVersion },
                data: {
                    status: "FAILED",
                    finishedAt: new Date(),
                },
            });

            throw error;
        }
    },
    {
        connection,
        concurrency: 2,
        limiter: {
            max: 10,
            duration: 60000, // 10 jobs per minute
        },
    }
);

worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
});

worker.on("error", (err) => {
    console.error("Worker error:", err);
});

console.log("Analysis worker started");

export default worker;

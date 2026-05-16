import { Worker, Job } from "bullmq";
import { connection, type AnalysisJobData } from "../lib/queue";
import prisma from "@touchline/database";
import path from "path";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import { downloadFromSupabase } from "../lib/supabase";
import { mkdir } from "fs/promises";

/**
 * Analysis Worker
 * Processes video analysis jobs from the queue by calling the external AI Pipeline
 */
const worker = new Worker<AnalysisJobData>(
    "analysis",
    async (job: Job<AnalysisJobData>) => {
        const { videoId, storagePath, playerAnalysisId, organizationId } = job.data;

        console.log(`Processing analysis job ${job.id} for video ${videoId}`);

        let tempFilePath = "";

        try {
            // 1. Update statuses to PROCESSING
            if (playerAnalysisId) {
                await prisma.playerAnalysis.update({
                    where: { id: playerAnalysisId },
                    data: { status: "PROCESSING" }
                });
            }
            
            await prisma.video.update({
                where: { id: videoId },
                data: { status: "PROCESSING" }
            });

            // 2. Download from Supabase Storage to local temp
            console.log(`Downloading video from Supabase: ${storagePath}`);
            const videoData = await downloadFromSupabase("videos", storagePath);
            const videoBuffer = Buffer.from(await videoData.arrayBuffer());

            const uploadDir = path.join(process.cwd(), "uploads", "temp");
            await mkdir(uploadDir, { recursive: true });
            
            const filename = path.basename(storagePath);
            tempFilePath = path.join(uploadDir, filename);
            fs.writeFileSync(tempFilePath, videoBuffer);

            // 3. Call External AI Pipeline (Hugging Face / FastAPI)
            const aiPipelineUrl = process.env.AI_PIPELINE_URL || "http://localhost:7860";
            console.log(`Sending video to AI Pipeline at ${aiPipelineUrl}/analyze`);
            
            const form = new FormData();
            form.append("file", fs.createReadStream(tempFilePath));

            const response = await axios.post(`${aiPipelineUrl}/analyze`, form, {
                headers: { ...form.getHeaders() },
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                timeout: 1200000 // 20 minute timeout for long videos
            });

            const analysisResults = response.data;

            if (analysisResults.error) {
                throw new Error(analysisResults.error);
            }

            // 4. Update database with results
            await prisma.$transaction(async (tx) => {
                // Update PlayerAnalysis
                if (playerAnalysisId) {
                    await tx.playerAnalysis.update({
                        where: { id: playerAnalysisId },
                        data: {
                            analysisData: analysisResults,
                            status: "COMPLETED",
                            updatedAt: new Date()
                        }
                    });
                }

                // Update Video
                await tx.video.update({
                    where: { id: videoId },
                    data: { status: "COMPLETED" }
                });
            });

            console.log(`Analysis job ${job.id} completed successfully`);
            return { success: true };

        } catch (error: any) {
            console.error(`Analysis job ${job.id} failed:`, error.message);

            // Update statuses to FAILED
            if (playerAnalysisId) {
                await prisma.playerAnalysis.update({
                    where: { id: playerAnalysisId },
                    data: { status: "FAILED" }
                });
            }

            await prisma.video.update({
                where: { id: videoId },
                data: { status: "FAILED" }
            });

            throw error;
        } finally {
            // 5. Cleanup temp file
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath);
                } catch (err) {
                    console.warn(`Could not delete temp file ${tempFilePath}:`, err);
                }
            }
        }
    },
    {
        connection,
        concurrency: 1, // Only process one video at a time to save memory
        limiter: {
            max: 5,
            duration: 60000,
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

console.log("Analysis worker started and ready for HF pipeline");

// Health check HTTP server for Render (Web Service requires an open port)
const PORT = parseInt(process.env.PORT || "10000", 10);
Bun.serve({
    port: PORT,
    fetch(req) {
        const url = new URL(req.url);
        if (url.pathname === "/health") {
            return new Response(JSON.stringify({ status: "ok", worker: "analysis" }), {
                headers: { "Content-Type": "application/json" },
            });
        }
        return new Response("Analysis Worker Running", { status: 200 });
    },
});
console.log(`Health check server listening on port ${PORT}`);

export default worker;

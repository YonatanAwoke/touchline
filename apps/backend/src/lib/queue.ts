import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Create Redis connection
const connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
});

// Job data interface
export interface AnalysisJobData {
    videoId: number;
    storagePath: string;
    modelVersion: string;
    organizationId: number;
}

// Create analysis queue
export const analysisQueue = new Queue<AnalysisJobData>("analysis", {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 5000,
        },
        removeOnComplete: {
            age: 24 * 3600, // Keep completed jobs for 24 hours
            count: 1000,
        },
        removeOnFail: {
            age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
    },
});

/**
 * Add analysis job to queue
 */
export async function queueAnalysisJob(data: AnalysisJobData): Promise<string> {
    const job = await analysisQueue.add("analyze-video", data, {
        jobId: `analysis-${data.videoId}-${Date.now()}`,
    });
    return job.id!;
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string) {
    const job = await analysisQueue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    const progress = job.progress;

    return {
        id: job.id,
        state,
        progress,
        data: job.data,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason,
    };
}

/**
 * Cancel a job
 */
export async function cancelJob(jobId: string): Promise<boolean> {
    const job = await analysisQueue.getJob(jobId);
    if (!job) return false;

    try {
        await job.remove();
        return true;
    } catch (error) {
        console.error("Error canceling job:", error);
        return false;
    }
}

export { connection };

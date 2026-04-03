import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import ffmpeg from "fluent-ffmpeg";

// Configure local FFmpeg if available
const localBinPath = path.resolve(__dirname, "../../bin");
const localFfmpegPath = path.join(localBinPath, "ffmpeg");
const localFfprobePath = path.join(localBinPath, "ffprobe");

if (existsSync(localFfmpegPath)) {
    console.log("Using local FFmpeg binary:", localFfmpegPath);
    ffmpeg.setFfmpegPath(localFfmpegPath);
}

if (existsSync(localFfprobePath)) {
    console.log("Using local FFprobe binary:", localFfprobePath);
    ffmpeg.setFfprobePath(localFfprobePath);
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads/videos";
const MAX_FILE_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE || "524288000"); // 500MB default

// Allowed video formats
const ALLOWED_FORMATS = [".mp4", ".mov", ".avi", ".mkv", ".webm"];

/**
 * Initialize upload directory
 */
export async function initializeUploadDir() {
    if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true });
    }
}

/**
 * Generate unique filename for video
 */
export function generateVideoFilename(organizationId: number, originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const uuid = randomUUID().split("-")[0];
    return `${organizationId}_${timestamp}_${uuid}${ext}`;
}

/**
 * Get full storage path for a filename
 */
export function getStoragePath(filename: string): string {
    return path.join(UPLOAD_DIR, filename);
}

/**
 * Validate file format
 */
export function isValidVideoFormat(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return ALLOWED_FORMATS.includes(ext);
}

/**
 * Extract video metadata using ffprobe
 */
export async function extractVideoMetadata(filePath: string): Promise<{
    durationSec: number | null;
    fps: number | null;
    width: number | null;
    height: number | null;
}> {
    const nullResult = { durationSec: null, fps: null, width: null, height: null };

    return new Promise((resolve) => {
        try {
            ffmpeg.ffprobe(filePath, (err, metadata) => {
                if (err) {
                    console.warn("FFprobe unavailable or failed — metadata skipped:", err.message);
                    return resolve(nullResult);
                }

                const videoStream = metadata.streams.find(s => s.codec_type === "video");
                const durationSec = metadata.format.duration
                    ? Math.round(metadata.format.duration)
                    : null;
                const fps = videoStream?.r_frame_rate
                    ? eval(videoStream.r_frame_rate)   // e.g. "30/1" → 30
                    : null;
                const width = videoStream?.width ?? null;
                const height = videoStream?.height ?? null;

                resolve({
                    durationSec,
                    fps: fps ? Math.round(fps) : null,
                    width,
                    height,
                });
            });
        } catch (outerErr) {
            console.warn("FFprobe threw synchronously — metadata skipped:", outerErr);
            resolve(nullResult);
        }
    });
}

/**
 * Delete video file from storage
 */
export async function deleteVideoFile(storagePath: string): Promise<void> {
    const { unlink } = await import("fs/promises");
    try {
        await unlink(storagePath);
    } catch (error) {
        console.error("Error deleting video file:", error);
    }
}

/**
 * Get video URL for playback
 */
export function getVideoUrl(storagePath: string): string {
    const filename = path.basename(storagePath);
    return `/api/videos/stream/${filename}`;
}

export const uploadConfig = {
    UPLOAD_DIR,
    MAX_FILE_SIZE,
    ALLOWED_FORMATS,
};

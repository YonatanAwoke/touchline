import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth } from "@/lib/security";
import { playerAnalysisCreateSchema } from "@/lib/validation";
import { writeFile } from "fs/promises";
import path from "path";
import { spawn } from "child_process";

// Allow large video uploads and opt out of static caching for this route
export const maxDuration = 300; // 5 minutes for long analysis jobs
export const dynamic = "force-dynamic";

/**
 * @openapi
 * /api/examinations/player:
 *   post:
 *     summary: Create a new player analysis
 *     tags:
 *       - Examinations
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, date, playerId, analysisData]
 *     responses:
 *       201:
 *         description: Player analysis created
 */
export async function POST(request: Request) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    try {
        const contentType = request.headers.get("content-type") || "";
        let body: any;

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
                analysisData: {} // Placeholder to be filled by Python
            };

            if (videoFile) {
                const arrayBuffer = await videoFile.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const tempPath = path.join(process.cwd(), "uploads", "temp", `${Date.now()}_${videoFile.name}`);
                await writeFile(tempPath, buffer);

                // Run Python Analysis
                const pythonPath = path.join(process.cwd(), "python_venv", "bin", "python3");
                const scriptPath = path.join(process.cwd(), "scripts", "analyze_player.py");
                
                const pythonProcess = spawn(pythonPath, [scriptPath, tempPath]);
                
                let analysisOutput = "";
                let errorOutput = "";

                await new Promise((resolve, reject) => {
                    pythonProcess.stdout.on("data", (data) => { analysisOutput += data.toString(); });
                    pythonProcess.stderr.on("data", (data) => { errorOutput += data.toString(); });
                    pythonProcess.on("close", (code) => {
                        if (code === 0) resolve(analysisOutput);
                        else reject(new Error(errorOutput || `Python process exited with code ${code}`));
                    });
                });

                const jsonStartIndex = analysisOutput.indexOf('{');
                if (jsonStartIndex === -1) throw new Error("Could not parse AI analysis results. Output: " + analysisOutput);
                const cleanJson = analysisOutput.substring(jsonStartIndex);
                
                body.analysisData = JSON.parse(cleanJson);
                if (body.analysisData.error) throw new Error(body.analysisData.error);
            }
        } else {
            body = await request.json();
        }

        const result = playerAnalysisCreateSchema.safeParse({ ...body, organizationId: session.organizationId });
        if (!result.success) return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });

        const data = result.data;
        const analysis = await prisma.playerAnalysis.create({
            data: {
                title: data.title,
                date: new Date(data.date),
                playerId: data.playerId,
                sessionId: data.sessionId,
                notes: data.notes,
                inputMode: data.inputMode,
                videoId: data.videoId,
                analysisData: data.analysisData,
                organizationId: session.organizationId,
            }
        });

        return NextResponse.json(analysis, { status: 201 });
    } catch (error: any) {
        console.error("Create player analysis error details:", error?.message, "Meta:", error?.meta, "Code:", error?.code);
        return NextResponse.json({ error: error.message || "Internal server error", details: error?.meta }, { status: 500 });
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

import { NextResponse } from "next/server";
import prisma from "@touchline/database";

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const secret = url.searchParams.get("secret");
    const jobId = url.searchParams.get("jobId");

    if (!secret || secret !== process.env.AI_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

    const body = await request.json().catch(() => null);

    // Persist results if provided
    // Expected body: { status: 'done', results: [ { type, payload }, ... ] }
    const status = body?.status ?? "completed";
    const results = Array.isArray(body?.results) ? body.results : [];

    // Associate by jobId (bull job id). We stored jobId as string when creating the job.
    // Try to find analysis job(s) by matching queued_remote state and job id metadata is not stored in DB
    // We'll update analysisJob by a best-effort match using jobId->videoId mapping if provided

    // If HF includes 'videoId' or 'analysisJobId' in payload, use it. Otherwise, try to match by jobId as integer
    const analysisJobId = body?.analysisJobId ?? body?.job?.analysisJobId ?? null;

    if (analysisJobId) {
      // create results and mark completed
      const tx: any[] = [];
      for (const r of results) {
        tx.push(prisma.analysisResult.create({ data: { analysisJobId: Number(analysisJobId), type: r.type, payload: r.payload } }));
      }
      tx.push(prisma.analysisJob.update({ where: { id: Number(analysisJobId) }, data: { status: status.toUpperCase(), finishedAt: new Date(), rawPayload: body } }));
      await prisma.$transaction(tx);
      return NextResponse.json({ ok: true });
    }

    // fallback: update any analysisJob in QUEUED_REMOTE and leave a note
    await prisma.analysisJob.updateMany({ where: { status: "QUEUED_REMOTE" }, data: { status: status.toUpperCase(), finishedAt: new Date(), rawPayload: body } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("AI webhook error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

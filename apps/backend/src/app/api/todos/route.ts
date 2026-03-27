import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth } from "@/lib/security";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get("matchId");
    const sessionId = searchParams.get("sessionId");

    const where: any = { userId: auth.session.userId };
    if (matchId) {
      const vid = Number(matchId);
      if (!isNaN(vid)) where.matchId = vid;
    }
    if (sessionId) {
      const sid = Number(sessionId);
      if (!isNaN(sid)) where.sessionId = sid;
    }
    if (!matchId && !sessionId && searchParams.has("general")) {
      where.matchId = null;
      where.sessionId = null;
    }

    const todos = await prisma.todo.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ items: todos });
  } catch (error: any) {
    console.error("[TodoGET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { text, matchId, sessionId } = await request.json();

    const mId = matchId ? Number(matchId) : undefined;
    const sId = sessionId ? Number(sessionId) : undefined;

    const todo = await prisma.todo.create({
      data: {
        text,
        userId: auth.session.userId,
        matchId: (mId && !isNaN(mId)) ? mId : undefined,
        sessionId: (sId && !isNaN(sId)) ? sId : undefined,
      },
    });
    return NextResponse.json(todo);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

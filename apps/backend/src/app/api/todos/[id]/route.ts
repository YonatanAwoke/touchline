import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth } from "@/lib/security";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idStr } = await params;
  const id = Number(idStr);
  try {
    const { text, done } = await request.json();
    const todo = await prisma.todo.update({
      where: { id, userId: auth.session.userId },
      data: {
        ...(text !== undefined && { text }),
        ...(done !== undefined && { done }),
      },
    });
    return NextResponse.json(todo);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idStr } = await params;
  const id = Number(idStr);
  try {
    await prisma.todo.delete({
      where: { id, userId: auth.session.userId },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

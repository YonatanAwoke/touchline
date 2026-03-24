import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth, requireRole } from "@/lib/security";
import { playerUpdateSchema } from "@/lib/validation";

async function resolveParams(params: any) {
  // params can be an object or a Promise (App Router behavior); handle both
  if (!params) return null;
  if (typeof (params as any).then === "function") return await params;
  return params;
}

export async function GET(request: Request, { params }: { params: any }) {
  const auth = await requireAuth();
  if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { session } = auth;

  const resolved = await resolveParams(params);
  const id = Number(resolved?.id ?? resolved?.params?.id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });

  try {
    const player = await prisma.player.findUnique({ where: { id }, include: { user: true, team: true } });
    if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

    // allow SUPER_ADMIN or same organization
    if (session.role !== "SUPER_ADMIN" && player.user.organizationId !== session.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(player);
  } catch (error) {
    console.error("Get player error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: any }) {
  const auth = await requireAuth();
  if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { session } = auth;

  const resolved = await resolveParams(params);
  const id = Number(resolved?.id ?? resolved?.params?.id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });

  try {
    const player = await prisma.player.findUnique({ where: { id }, include: { user: true } });
    if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

    // permission checks: owner, club admin of same org, super admin, or coach of player's team
    const isSelf = session.userId === player.userId;
    const isClubAdmin = session.role === "CLUB_ADMIN" && player.user.organizationId === session.organizationId;
    const isSuperAdmin = session.role === "SUPER_ADMIN";

    let body: any = {};
    try {
      const text = await request.text();
      body = text ? JSON.parse(text) : {};
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = playerUpdateSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });

    if (!isSuperAdmin && !isClubAdmin && !isSelf) {
      if (!session.coachId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (!player.teamId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const team = await prisma.team.findUnique({ where: { id: player.teamId } });
      if (!team || team.coachId !== session.coachId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allowed = [
      "teamId",
      "phone",
      "address",
      "city",
      "country",
      "postalCode",
      "birthdate",
      "nationality",
      "position",
      "secondaryPositions",
      "heightCm",
      "weightKg",
      "dominantFoot",
      "bio",
      "attributes",
      "isActive",
      "profileVisibility",
    ];

    const updateData: any = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(result.data, key)) {
        updateData[key] = (result.data as any)[key];
      }
    }

    if (updateData.birthdate) updateData.birthdate = updateData.birthdate ? new Date(updateData.birthdate) : null;

    // validate team org match if teamId provided
    if (typeof updateData.teamId !== "undefined" && updateData.teamId !== null) {
      const team = await prisma.team.findUnique({ where: { id: updateData.teamId } });
      if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
      const user = await prisma.user.findUnique({ where: { id: player.userId } });
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
      if (team.organizationId !== user.organizationId) return NextResponse.json({ error: "Team and user organization mismatch" }, { status: 400 });
    }

    const userSafeSelect = {
      id: true,
      email: true,
      username: true,
      role: true,
      organizationId: true,
      createdAt: true,
      updatedAt: true,
    };

    const updated = await prisma.player.update({ where: { id }, data: updateData, include: { user: { select: userSafeSelect }, team: true } });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update player error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: any }) {
  const auth = await requireAuth();
  if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { session } = auth;

  const resolved = await resolveParams(params);
  const id = Number(resolved?.id ?? resolved?.params?.id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });

  const roleCheck = requireRole(["SUPER_ADMIN", "CLUB_ADMIN"])(session as any);
  if ((roleCheck as any).error) return NextResponse.json({ error: (roleCheck as any).error }, { status: (roleCheck as any).status });

  try {
    const player = await prisma.player.findUnique({ where: { id } });
    if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

    if (session.role !== "SUPER_ADMIN") {
      const user = await prisma.user.findUnique({ where: { id: player.userId } });
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
      if (user.organizationId !== session.organizationId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.player.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Delete player error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


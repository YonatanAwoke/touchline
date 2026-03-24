import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import { requireAuth } from "@/lib/security";

/**
 * @openapi
 * /api/formations/{id}:
 *   patch:
 *     summary: Update a formation
 *     tags:
 *       - Formations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               positions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     role:
 *                       type: string
 *                     x:
 *                       type: number
 *                     y:
 *                       type: number
 *                     playerId:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Formation updated
 *       404:
 *         description: Formation not found
 *       500:
 *         description: Internal server error
 */
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } | Promise<{ id: string }> }
) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const resolvedParams = await params as any;
        const id = parseInt(resolvedParams.id);
        const body = await request.json();
        const { name, isActive, positions, template } = body;

        const formation = await prisma.$transaction(async (tx) => {
            const existing = await tx.formation.findUnique({ where: { id } });
            if (!existing) throw new Error("Formation not found");

            if (isActive && !existing.isActive) {
                await tx.formation.updateMany({
                    where: { teamId: existing.teamId },
                    data: { isActive: false }
                });
            }

            // Update formation basic info
            const updated = await tx.formation.update({
                where: { id },
                data: {
                    ...(name ? { name } : {}),
                    ...(template ? { template } : {}),
                    ...(isActive !== undefined ? { isActive } : {}),
                }
            });

            // Update positions if provided
            if (positions) {
                await tx.formationPosition.deleteMany({
                    where: { formationId: id }
                });

                for (const p of positions) {
                    await tx.formationPosition.create({
                        data: {
                            formationId: id,
                            role: p.role,
                            x: p.x,
                            y: p.y,
                            playerId: p.playerId || null
                        }
                    });
                }
            }

            return tx.formation.findUnique({
                where: { id },
                include: { positions: true }
            });
        });

        return NextResponse.json(formation);
    } catch (error: any) {
        if (error.message === "Formation not found") {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }
        console.error("Update formation error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * @openapi
 * /api/formations/{id}:
 *   delete:
 *     summary: Delete a formation
 *     tags:
 *       - Formations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Deleted
 *       500:
 *         description: Internal server error
 */
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } | Promise<{ id: string }> }
) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const resolvedParams = await params as any;
        const id = parseInt(resolvedParams.id);
        await prisma.formation.delete({ where: { id } });
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("Delete formation error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

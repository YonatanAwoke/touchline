import { NextResponse } from 'next/server';
import prisma from '@touchline/database';

/**
 * @openapi
 * /api/sessions:
 *   get:
 *     summary: List all training sessions
 *     tags:
 *       - Sessions
 *     responses:
 *       200:
 *         description: List of sessions
 */
export async function GET() {
    try {
        const sessions = await prisma.session.findMany({
            include: {
                _count: {
                    select: { videos: true }
                }
            },
            orderBy: {
                date: 'desc'
            }
        });

        return NextResponse.json(sessions);
    } catch (error) {
        console.error("Failed to fetch sessions:", error);
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, date, coachId } = body;

        if (!title || !date || !coachId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const session = await prisma.session.create({
            data: {
                title,
                date: new Date(date),
                coachId,
            }
        });

        return NextResponse.json(session);
    } catch (error) {
        console.error("Failed to create session:", error);
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
}

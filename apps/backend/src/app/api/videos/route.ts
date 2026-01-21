import { NextResponse } from 'next/server';
import prisma from '@touchline/database';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { sessionId, videoUrl } = body;

        if (!sessionId || !videoUrl) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // 1. Create a video record in the database with PENDING status
        const video = await prisma.video.create({
            data: {
                sessionId,
                url: videoUrl,
                status: 'PENDING',
            },
        });

        // 2. Trigger the AI pipeline (Simulated with a detached child process for now)
        // In a real production app, use a queue like BullMQ or a separate worker
        import('child_process').then(({ spawn }) => {
            const pythonProcess = spawn('python3', [
                '../../services/ai-pipeline/processor.py',
                video.id,
                videoUrl
            ]);

            pythonProcess.unref(); // Allow the parent process to exit independently
        });

        return NextResponse.json({
            message: 'Video upload initiated and processing started',
            videoId: video.id,
            status: 'PENDING',
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to process request' },
            { status: 500 }
        );
    }
}

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/security";
import { createSignedUploadUrl } from "@/lib/supabase";
import { sanitizeFilename } from "@/lib/upload";

export async function POST(request: Request) {
    const auth = await requireAuth();
    if (!auth.session) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { session } = auth;

    try {
        const { filename, contentType } = await request.json();

        if (!filename) {
            return NextResponse.json({ error: "Filename is required" }, { status: 400 });
        }

        const ext = filename.split('.').pop();
        const safeName = sanitizeFilename(filename.replace(`.${ext}`, ''));
        const storagePath = `player-analyses/${Date.now()}_${safeName}.${ext}`;

        const { signedUrl, token } = await createSignedUploadUrl("videos", storagePath);

        return NextResponse.json({
            signedUrl,
            token,
            storagePath,
            filename: storagePath
        });

    } catch (error: any) {
        console.error("Create signed upload URL error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

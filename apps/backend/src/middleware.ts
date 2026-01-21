import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || "super-secret-key-change-this-in-production"
);

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Allow public routes
    if (
        pathname.includes('/api/auth') ||
        pathname.includes('/api/docs') ||
        pathname === '/'
    ) {
        return NextResponse.next();
    }

    // 2. Check for token
    const token = request.cookies.get('token')?.value;

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 3. Verify token
        await jwtVerify(token, secret);
        return NextResponse.next();
    } catch (error) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}

export const config = {
    matcher: ['/api/:path*'],
};

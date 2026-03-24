import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import crypto from "crypto";

const secret = new TextEncoder().encode(
    process.env.JWT_SECRET
);

export async function signJWT(payload: any) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1d") // Longer-lived token for dev
        .sign(secret);
}

export async function signRefreshToken(payload: any) {
    // Opaque token - just a random string
    const token = crypto.randomUUID();
    return token;
}

export async function verifyJWT(token: string) {
    try {
        const { payload } = await jwtVerify(token, secret);
        return payload;
    } catch (error) {
        return null;
    }
}

export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;
    return await verifyJWT(token);
}

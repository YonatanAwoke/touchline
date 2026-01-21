import { NextResponse } from "next/server";
import { getSession } from "./auth";
import { Role } from "@touchline/database";

export interface Session {
    userId: number;
    email: string;
    username: string;
    role: Role;
    organizationId: number;
    coachId?: number;
}

export type AuthResult =
    | { session: Session; error?: never; status?: never }
    | { session?: never; error: string; status: number };

export async function requireAuth(): Promise<AuthResult> {
    const session = await getSession() as any;
    if (!session) {
        return { error: "Unauthorized", status: 401 };
    }
    return {
        session: {
            userId: session.userId,
            email: session.email,
            username: session.username,
            role: session.role,
            organizationId: session.organizationId,
            coachId: session.coachId,
        }
    } as AuthResult;
}

export function requireRole(allowedRoles: Role[]) {
    return (user: any) => {
        if (!user || !allowedRoles.includes(user.role)) {
            return { error: "Forbidden", status: 403 };
        }
        return { success: true };
    };
}

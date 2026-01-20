import { NextResponse } from "next/server";
import { getSession } from "./auth";
import { Role } from "@touchline/database";

export async function requireAuth() {
    const session = await getSession();
    if (!session) {
        return { error: "Unauthorized", status: 401 };
    }
    return { session };
}

export function requireRole(allowedRoles: Role[]) {
    return (user: any) => {
        if (!user || !allowedRoles.includes(user.role)) {
            return { error: "Forbidden", status: 403 };
        }
        return { success: true };
    };
}

import { z } from "zod";

/**
 * Schema for dedicated Club Onboarding (Creating Org + CLUB_ADMIN)
 */
export const onboardClubSchema = z.object({
    email: z.string().email("Invalid email address"),
    username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be at most 20 characters"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
});

/**
 * Schema for Standard User Registration (Joining an existing Org)
 */
export const registerSchema = z.object({
    email: z.string().email("Invalid email address"),
    username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be at most 20 characters"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    organizationSlug: z.string().min(1, "Organization slug is required"),
    joinCode: z.string().min(1, "Join code is required"),
    role: z.enum(["COACH", "ANALYST", "PLAYER"]),
});

/**
 * Phone number validation regex
 */
const phoneRegex = /^[\+\d\s-\(\)]{7,20}$/;

/**
 * Schema for Organization creation (SUPER_ADMIN)
 */
export const organizationSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    contactEmail: z.string().email("Invalid contact email").optional().nullable().or(z.literal("")).or(z.literal(null)),
    contactPhone: z.string()
        .regex(phoneRegex, "Invalid phone number format")
        .optional()
        .nullable()
        .or(z.literal(""))
        .or(z.literal(null)),
});

/**
 * Schema for Coach profile management
 */
export const coachProfileSchema = z.object({
    userId: z.number().int().optional(),
    bio: z.string().optional().nullable(),
    specialty: z.array(z.string()).optional().default([]),
    licenseLevel: z.array(z.string()).optional().default([]),
});

/**
 * Schema for Team creation and updates
 */
export const teamCreateSchema = z.object({
    name: z.string().min(1, "Name must be at least 1 character"),
    organizationId: z.number().int(),
    coachId: z.number().int().optional(),
});

export const teamUpdateSchema = z.object({
    name: z.string().min(1).optional(),
    coachId: z.number().int().optional(),
});

export const loginSchema = z.object({
    email: z.string().email("Invalid email address").optional(),
    username: z.string().min(3).optional(),
    password: z.string().min(1, "Password is required"),
}).refine(data => data.email || data.username, {
    message: "Either email or username must be provided",
    path: ["email", "username"],
});

export type OnboardClubInput = z.infer<typeof onboardClubSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OrganizationInput = z.infer<typeof organizationSchema>;
export type CoachProfileInput = z.infer<typeof coachProfileSchema>;

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

/**
 * Player create/update schemas
 */
export const playerCreateSchema = z.object({
    userId: z.number().int().optional(),
    teamId: z.number().int().optional().nullable(),
    phone: z.string().regex(phoneRegex, "Invalid phone number format").optional().nullable(),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    postalCode: z.string().optional().nullable(),
    birthdate: z.string().optional().nullable(), // ISO date string
    nationality: z.string().optional().nullable(),
    position: z.enum(["GK","CB","LB","RB","LWB","RWB","DM","CM","AM","LM","RM","LW","RW","ST","CF"]).optional().nullable(),
    secondaryPositions: z.array(z.string()).optional().default([]),
    heightCm: z.number().int().optional().nullable(),
    weightKg: z.number().int().optional().nullable(),
    dominantFoot: z.enum(["LEFT", "RIGHT", "BOTH"]).optional().nullable(),
    bio: z.string().optional().nullable(),
    attributes: z.record(z.string(), z.any()).optional().nullable(),
    isActive: z.boolean().optional(),
    profileVisibility: z.enum(["PUBLIC", "INTERNAL", "PRIVATE"]).optional().nullable(),
});

export const createUserSchema = z.object({
    email: z.string().email("Invalid email address"),
    username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be at most 20 characters"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    organizationSlug: z.string().min(1),
    joinCode: z.string().min(1),
    role: z.enum(["PLAYER", "COACH"]),
});

// Allow player creation either by existing userId OR by providing a createUser payload
export const playerCreatePayloadSchema = playerCreateSchema.extend({
    createUser: createUserSchema.optional(),
});

export const playerUpdateSchema = z.object({
    teamId: z.number().int().optional().nullable(),
    phone: z.string().regex(phoneRegex, "Invalid phone number format").optional().nullable(),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    postalCode: z.string().optional().nullable(),
    birthdate: z.string().optional().nullable(),
    nationality: z.string().optional().nullable(),
    position: z.enum(["GK","CB","LB","RB","LWB","RWB","DM","CM","AM","LM","RM","LW","RW","ST","CF"]).optional().nullable(),
    secondaryPositions: z.array(z.string()).optional(),
    heightCm: z.number().int().optional().nullable(),
    weightKg: z.number().int().optional().nullable(),
    dominantFoot: z.enum(["LEFT", "RIGHT", "BOTH"]).optional().nullable(),
    bio: z.string().optional().nullable(),
    attributes: z.record(z.string(), z.any()).optional().nullable(),
    isActive: z.boolean().optional(),
    profileVisibility: z.enum(["PUBLIC", "INTERNAL", "PRIVATE"]).optional().nullable(),
});

export type PlayerCreateInput = z.infer<typeof playerCreateSchema>;
export type PlayerUpdateInput = z.infer<typeof playerUpdateSchema>;

/**
 * Session and Participant schemas
 */
export const sessionCreateSchema = z.object({
    title: z.string().min(1),
    date: z.string(), // ISO date
    organizationId: z.number().int(),
    teamId: z.number().int().optional().nullable(),
    coachId: z.number().int(),
    type: z.enum(["TECHNICAL", "TACTICAL", "FITNESS", "RECOVERY"]).optional(),
    duration: z.number().int().optional().nullable(),
    intensity: z.number().int().min(0).max(10).optional().nullable(),
    venue: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

export const sessionUpdateSchema = z.object({
    title: z.string().min(1).optional(),
    date: z.string().optional(),
    type: z.enum(["TECHNICAL", "TACTICAL", "FITNESS", "RECOVERY"]).optional(),
    duration: z.number().int().optional().nullable(),
    intensity: z.number().int().min(0).max(10).optional().nullable(),
    status: z.enum(["PLANNED", "ONGOING", "COMPLETED", "CANCELLED"]).optional(),
    venue: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

export const participantCreateSchema = z.object({
    playerId: z.number().int(),
    role: z.string().optional().nullable(),
    attendanceStatus: z.enum(["PENDING", "PRESENT", "ABSENT", "EXCUSED"]).optional(),
    joinedAt: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

export const participantUpdateSchema = z.object({
    role: z.string().optional().nullable(),
    attendanceStatus: z.enum(["PENDING", "PRESENT", "ABSENT", "EXCUSED"]).optional(),
    joinedAt: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

export type SessionCreateInput = z.infer<typeof sessionCreateSchema>;
export type SessionUpdateInput = z.infer<typeof sessionUpdateSchema>;
export type ParticipantCreateInput = z.infer<typeof participantCreateSchema>;
export type ParticipantUpdateInput = z.infer<typeof participantUpdateSchema>;

/**
 * Video create schema
 */
export const videoCreateSchema = z.object({
    storagePath: z.string().min(1),
    originalName: z.string().optional().nullable(),
    type: z.enum(["TRAINING", "MATCH", "OTHER"]).optional(),
    status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]).optional(),
    durationSec: z.number().int().optional().nullable(),
    fps: z.number().int().optional().nullable(),
    width: z.number().int().optional().nullable(),
    height: z.number().int().optional().nullable(),
    sessionId: z.number().int().optional().nullable(),
    matchId: z.number().int().optional().nullable(),
});

export type VideoCreateInput = z.infer<typeof videoCreateSchema>;

/**
 * Analysis job create schema
 */
export const analysisJobCreateSchema = z.object({
    videoId: z.number().int(),
    modelVersion: z.string().min(1),
});

export type AnalysisJobCreateInput = z.infer<typeof analysisJobCreateSchema>;

/**
 * Video clip create schema
 */
export const videoClipCreateSchema = z.object({
    videoId: z.number().int(),
    playerId: z.number().int().optional().nullable(),
    startSec: z.number().int(),
    endSec: z.number().int(),
    label: z.string().optional().nullable(),
    tags: z.array(z.string()).optional().default([]),
    createdBy: z.enum(["MANUAL", "AI"]).optional().default("MANUAL"),
    organizationId: z.number().int(),
    metadata: z.record(z.string(), z.any()).optional().nullable(),
});

export type VideoClipCreateInput = z.infer<typeof videoClipCreateSchema>;

/**
 * Match schemas
 */
export const scorerSchema = z.object({
    playerId: z.number().int().optional().nullable(),
    playerName: z.string().optional().nullable(),
    minute: z.string().optional().nullable(),
    isHomeTeam: z.boolean().default(true),
    goalCount: z.number().int().default(1),
});

export const matchResultSchema = z.object({
    homeScore: z.number().int().default(0),
    awayScore: z.number().int().default(0),
    homePenalties: z.number().int().optional().nullable(),
    awayPenalties: z.number().int().optional().nullable(),
    details: z.string().optional().nullable(),
    scorers: z.array(scorerSchema).default([]),
});

export const matchCreateSchema = z.object({
    teamId: z.number().int(),
    opponent: z.string().min(1),
    matchDate: z.string(), // ISO date
    competition: z.enum(["LEAGUE", "CUP", "FRIENDLY", "OTHER"]).optional(),
    venue: z.string().optional().nullable(),
    tacticalBoardId: z.number().int().optional().nullable(),
    result: matchResultSchema.optional(),
});

export const matchUpdateSchema = z.object({
    opponent: z.string().min(1).optional(),
    matchDate: z.string().optional(),
    competition: z.enum(["LEAGUE", "CUP", "FRIENDLY", "OTHER"]).optional(),
    venue: z.string().optional().nullable(),
    tacticalBoardId: z.number().int().optional().nullable(),
    result: matchResultSchema.optional(),
});

export type MatchCreateInput = z.infer<typeof matchCreateSchema>;
export type MatchUpdateInput = z.infer<typeof matchUpdateSchema>;
export type MatchResultInput = z.infer<typeof matchResultSchema>;
export type ScorerInput = z.infer<typeof scorerSchema>;

/**
 * Tactical Board schemas
 */
export const tacticalBoardCreateSchema = z.object({
    name: z.string().min(1, "Name is required"),
    teamId: z.number().int(),
    formationId: z.number().int().optional().nullable(),
    formationData: z.any().optional(),
    annotations: z.array(z.any()).optional().default([]),
    instructions: z.array(z.any()).optional().default([]),
    organizationId: z.number().int(),
});

export const tacticalBoardUpdateSchema = z.object({
    name: z.string().min(1).optional(),
    formationId: z.number().int().optional().nullable(),
    formationData: z.any().optional(),
    annotations: z.array(z.any()).optional(),
    instructions: z.array(z.any()).optional(),
});

export type TacticalBoardCreateInput = z.infer<typeof tacticalBoardCreateSchema>;
export type TacticalBoardUpdateInput = z.infer<typeof tacticalBoardUpdateSchema>;

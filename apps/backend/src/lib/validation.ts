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
 * Player Analysis schemas
 */
export const playerAnalysisCreateSchema = z.object({
    title: z.string().min(1),
    date: z.string(), // ISO date
    playerId: z.number().int(),
    sessionId: z.number().int().optional().nullable(),
    notes: z.string().optional().nullable(),
    inputMode: z.enum(["manual", "video"]).default("manual"),
    videoId: z.number().int().optional().nullable(),
    analysisData: z.record(z.string(), z.any()),
    selectedMetrics: z.array(z.string()).optional().default([]),
    organizationId: z.number().int(),
});

export const playerAnalysisUpdateSchema = z.object({
    title: z.string().min(1).optional(),
    date: z.string().optional(),
    notes: z.string().optional().nullable(),
    analysisData: z.record(z.string(), z.any()).optional(),
});

/**
 * Match Analysis schemas
 */
export const matchAnalysisCreateSchema = z.object({
    title: z.string().min(1),
    date: z.string(),
    matchId: z.number().int().optional().nullable(),
    homeTeam: z.string().min(1),
    awayTeam: z.string().min(1),
    notes: z.string().optional().nullable(),
    inputMode: z.enum(["manual", "video"]).default("manual"),
    videoId: z.number().int().optional().nullable(),
    matchStats: z.record(z.string(), z.any()),
    matchEvents: z.array(z.any()),
    organizationId: z.number().int(),
});

export const matchAnalysisUpdateSchema = z.object({
    title: z.string().min(1).optional(),
    date: z.string().optional(),
    notes: z.string().optional().nullable(),
    matchStats: z.record(z.string(), z.any()).optional(),
    matchEvents: z.array(z.any()).optional(),
});

/**
 * Match schemas
 */
export const matchCreateSchema = z.object({
    date: z.string(),
    matchDate: z.string(),
    teamId: z.number().int(),
    opponent: z.string().min(1),
    competition: z.enum(["LEAGUE", "CUP", "FRIENDLY", "OTHER"]).optional(),
    venue: z.string().optional().nullable(),
    organizationId: z.number().int(),
    competitionId: z.number().int().optional().nullable(),
    tacticalBoardId: z.number().int().optional().nullable(),
    result: z.object({
        homeScore: z.number().int(),
        awayScore: z.number().int(),
        homePenalties: z.number().int().optional().nullable(),
        awayPenalties: z.number().int().optional().nullable(),
        details: z.string().optional().nullable(),
        scorers: z.array(z.object({
            playerId: z.number().int().optional().nullable(),
            playerName: z.string().optional().nullable(),
            minute: z.string().optional().nullable(),
            isHomeTeam: z.boolean(),
            goalCount: z.number().int().default(1)
        }))
    }).optional()
});

export const matchUpdateSchema = z.object({
    opponent: z.string().min(1).optional(),
    competition: z.enum(["LEAGUE", "CUP", "FRIENDLY", "OTHER"]).optional(),
    date: z.string().optional(), // Using 'date' to match matchCreateSchema
    matchDate: z.string().optional(), // Adding matchDate for code compatibility
    homeScore: z.number().int().optional(),
    awayScore: z.number().int().optional(),
    status: z.enum(["SCHEDULED", "LIVE", "FINISHED", "POSTPONED", "CANCELLED"]).optional(),
    venue: z.string().optional().nullable(),
    result: z.object({
        homeScore: z.number().int(),
        awayScore: z.number().int(),
        homePenalties: z.number().int().optional().nullable(),
        awayPenalties: z.number().int().optional().nullable(),
        details: z.string().optional().nullable(),
        scorers: z.array(z.object({
            playerId: z.number().int().optional().nullable(),
            playerName: z.string().optional().nullable(),
            minute: z.string().optional().nullable(),
            isHomeTeam: z.boolean(),
            goalCount: z.number().int().default(1)
        }))
    }).optional()
});

/**
 * Tactical Board schemas
 */
export const tacticalBoardCreateSchema = z.object({
    name: z.string().min(1),
    teamId: z.number().int(),
    formationId: z.number().int().optional().nullable(),
    formationData: z.record(z.string(), z.any()).optional().nullable(),
    annotations: z.array(z.any()).optional().default([]),
    instructions: z.array(z.any()).optional().default([]),
    organizationId: z.number().int(),
});

export const tacticalBoardUpdateSchema = z.object({
    name: z.string().min(1).optional(),
    formationId: z.number().int().optional().nullable(),
    formationData: z.record(z.string(), z.any()).optional().nullable(),
    annotations: z.array(z.any()).optional(),
    instructions: z.array(z.any()).optional(),
});

/**
 * Video Clip schemas
 */
export const videoClipCreateSchema = z.object({
    videoId: z.number().int(),
    title: z.string().min(1),
    startSec: z.number(),
    endSec: z.number(),
    playerId: z.number().int().optional().nullable(),
    label: z.string().optional().nullable(),
    tags: z.array(z.string()).optional().default([]),
    notes: z.string().optional().nullable(),
    createdBy: z.enum(["MANUAL", "AI"]).optional().default("MANUAL"),
    metadata: z.record(z.string(), z.any()).optional().default({}),
});

/**
 * Analysis job create schema
 */
export const analysisJobCreateSchema = z.object({
    videoId: z.number().int(),
    modelVersion: z.string().min(1),
});

export type AnalysisJobCreateInput = z.infer<typeof analysisJobCreateSchema>;

export type PlayerAnalysisCreateInput = z.infer<typeof playerAnalysisCreateSchema>;
export type MatchAnalysisCreateInput = z.infer<typeof matchAnalysisCreateSchema>;
export type MatchCreateInput = z.infer<typeof matchCreateSchema>;
export type TacticalBoardCreateInput = z.infer<typeof tacticalBoardCreateSchema>;

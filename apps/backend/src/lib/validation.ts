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
    userId: z.number().int(),
    teamId: z.number().int().optional().nullable(),
    phone: z.string().regex(phoneRegex, "Invalid phone number format").optional().nullable(),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    postalCode: z.string().optional().nullable(),
    birthdate: z.string().optional().nullable(), // ISO date string
    nationality: z.string().optional().nullable(),
    position: z.string().optional().nullable(),
    secondaryPositions: z.array(z.string()).optional().default([]),
    heightCm: z.number().int().optional().nullable(),
    weightKg: z.number().int().optional().nullable(),
    dominantFoot: z.enum(["LEFT", "RIGHT", "BOTH"]).optional().nullable(),
    bio: z.string().optional().nullable(),
    attributes: z.record(z.string(), z.any()).optional().nullable(),
    isActive: z.boolean().optional(),
    profileVisibility: z.enum(["PUBLIC", "INTERNAL", "PRIVATE"]).optional().nullable(),
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
    position: z.string().optional().nullable(),
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

export type ParticipantUpdateInput = z.infer<typeof participantUpdateSchema>;

/**
 * Match schemas
 */
export const scorerSchema = z.object({
    playerId: z.number().int().optional().nullable(),
    playerName: z.string().optional().nullable(),
    minute: z.string().regex(/^(\d{1,3})(?:\+(\d{1,2}))?$/, "Invalid minute format (e.g., '45', '45+2', '120+1')").optional().nullable(),
    isHomeTeam: z.boolean().default(true),
    goalCount: z.number().int().min(1).default(1),
}).refine(data => {
    if (data.isHomeTeam) return !!data.playerId;
    return !!data.playerName;
}, {
    message: "Home scorers must have a playerId, away scorers must have a playerName",
    path: ["playerId", "playerName"]
});

export const matchResultSchema = z.object({
    homeScore: z.number().int().min(0).default(0),
    awayScore: z.number().int().min(0).default(0),
    homePenalties: z.number().int().min(0).optional().nullable(),
    awayPenalties: z.number().int().min(0).optional().nullable(),
    details: z.string().optional().nullable(),
    scorers: z.array(scorerSchema).optional().default([]),
}).refine(data => {
    const homeGoalsSum = data.scorers
        .filter(s => s.isHomeTeam)
        .reduce((sum, s) => sum + (s.goalCount || 0), 0);

    const awayGoalsSum = data.scorers
        .filter(s => !s.isHomeTeam)
        .reduce((sum, s) => sum + (s.goalCount || 0), 0);

    const scoresMatchScorers = homeGoalsSum === data.homeScore && awayGoalsSum === data.awayScore;
    if (!scoresMatchScorers) return false;

    // Penalties check: only if draw
    const hasPenalties = (data.homePenalties !== undefined && data.homePenalties !== null) ||
        (data.awayPenalties !== undefined && data.awayPenalties !== null);

    if (hasPenalties && data.homeScore !== data.awayScore) {
        return false;
    }

    return true;
}, {
    message: "The sum of goals must match scores, and penalties are only allowed if the scores are a draw",
    path: ["scorers", "homePenalties", "awayPenalties"]
});

export const matchCreateSchema = z.object({
    teamId: z.number().int(),
    opponent: z.string().min(1),
    competition: z.enum(["LEAGUE", "CUP", "FRIENDLY", "OTHER"]).optional().nullable(),
    venue: z.string().optional().nullable(),
    matchDate: z.string(), // ISO date
    result: matchResultSchema.optional(),
});

export const matchUpdateSchema = z.object({
    opponent: z.string().min(1).optional(),
    competition: z.enum(["LEAGUE", "CUP", "FRIENDLY", "OTHER"]).optional().nullable(),
    venue: z.string().optional().nullable(),
    matchDate: z.string().optional(),
    result: matchResultSchema.optional(),
});

export type MatchCreateInput = z.infer<typeof matchCreateSchema>;
export type MatchUpdateInput = z.infer<typeof matchUpdateSchema>;
export type MatchResultInput = z.infer<typeof matchResultSchema>;
export type ScorerInput = z.infer<typeof scorerSchema>;

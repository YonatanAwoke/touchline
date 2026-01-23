-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'CLUB_ADMIN', 'COACH', 'ANALYST', 'PLAYER');

-- CreateEnum
CREATE TYPE "DominantFoot" AS ENUM ('LEFT', 'RIGHT', 'BOTH');

-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PUBLIC', 'INTERNAL', 'PRIVATE');

-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('TECHNICAL', 'TACTICAL', 'FITNESS', 'RECOVERY');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PENDING', 'PRESENT', 'ABSENT', 'EXCUSED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "address" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "joinCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'COACH',
    "organizationId" INTEGER NOT NULL,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockoutUntil" TIMESTAMP(3),
    "resetPasswordToken" TEXT,
    "resetPasswordExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" SERIAL NOT NULL,
    "hashedToken" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coach" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "bio" TEXT,
    "specialty" TEXT[],
    "licenseLevel" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "teamId" INTEGER,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "birthdate" TIMESTAMP(3),
    "nationality" TEXT,
    "position" TEXT,
    "secondaryPositions" TEXT[],
    "heightCm" INTEGER,
    "weightKg" INTEGER,
    "dominantFoot" "DominantFoot",
    "bio" TEXT,
    "attributes" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "profileVisibility" "ProfileVisibility",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "coachId" INTEGER NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "coachId" INTEGER NOT NULL,
    "teamId" INTEGER,
    "type" "SessionType" NOT NULL DEFAULT 'TECHNICAL',
    "duration" INTEGER,
    "intensity" INTEGER,
    "status" "SessionStatus" NOT NULL DEFAULT 'PLANNED',
    "venue" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionParticipant" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "playerId" INTEGER,
    "coachId" INTEGER,
    "userId" INTEGER,
    "role" TEXT,
    "attendanceStatus" "AttendanceStatus" NOT NULL DEFAULT 'PENDING',
    "joinedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "status" "VideoStatus" NOT NULL DEFAULT 'PENDING',
    "sessionId" INTEGER NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Metric" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "playerId" INTEGER NOT NULL,
    "videoId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Metric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_name_key" ON "Organization"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_joinCode_key" ON "Organization"("joinCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetPasswordToken_key" ON "User"("resetPasswordToken");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_hashedToken_key" ON "RefreshToken"("hashedToken");

-- CreateIndex
CREATE UNIQUE INDEX "Coach_userId_key" ON "Coach"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_userId_key" ON "Player"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionParticipant_sessionId_playerId_key" ON "SessionParticipant"("sessionId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionParticipant_sessionId_coachId_key" ON "SessionParticipant"("sessionId", "coachId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionParticipant_sessionId_userId_key" ON "SessionParticipant"("sessionId", "userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coach" ADD CONSTRAINT "Coach_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionParticipant" ADD CONSTRAINT "SessionParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionParticipant" ADD CONSTRAINT "SessionParticipant_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionParticipant" ADD CONSTRAINT "SessionParticipant_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionParticipant" ADD CONSTRAINT "SessionParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;

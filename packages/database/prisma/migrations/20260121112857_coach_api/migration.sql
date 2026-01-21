/*
  Warnings:

  - Added the required column `updatedAt` to the `Coach` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Coach" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "licenseLevel" TEXT,
ADD COLUMN     "specialty" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

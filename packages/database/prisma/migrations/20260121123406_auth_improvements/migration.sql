/*
  Warnings:

  - A unique constraint covering the columns `[joinCode]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "joinCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_joinCode_key" ON "Organization"("joinCode");

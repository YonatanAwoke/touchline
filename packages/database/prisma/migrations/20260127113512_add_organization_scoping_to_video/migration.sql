/*
  Warnings:

  - Added the required column `organizationId` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `VideoClip` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "organizationId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "VideoClip" ADD COLUMN     "organizationId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoClip" ADD CONSTRAINT "VideoClip_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

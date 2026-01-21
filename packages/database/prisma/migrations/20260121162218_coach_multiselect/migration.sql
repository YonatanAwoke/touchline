/*
  Warnings:

  - The `licenseLevel` column on the `Coach` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `specialty` column on the `Coach` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Coach" DROP COLUMN "licenseLevel",
ADD COLUMN     "licenseLevel" TEXT[],
DROP COLUMN "specialty",
ADD COLUMN     "specialty" TEXT[];

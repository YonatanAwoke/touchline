-- AlterTable
ALTER TABLE "MatchResult" ADD COLUMN     "awayPenalties" INTEGER,
ADD COLUMN     "homePenalties" INTEGER;

-- AlterTable
ALTER TABLE "Scorer" ALTER COLUMN "minute" SET DATA TYPE TEXT;

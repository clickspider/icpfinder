-- The /next form is now three things: tools, biggest challenge, name + work email.
-- Additive only: older rows keep their answers, so the previous app version keeps working.
ALTER TABLE "Application" ADD COLUMN "tools" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Application" ADD COLUMN "challenge" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Application" ALTER COLUMN "productUrl" DROP NOT NULL;
ALTER TABLE "Application" ALTER COLUMN "profileUrl" DROP NOT NULL;
ALTER TABLE "Application" ALTER COLUMN "role" DROP NOT NULL;
ALTER TABLE "Application" ALTER COLUMN "salesTeam" DROP NOT NULL;
ALTER TABLE "Application" ALTER COLUMN "stage" DROP NOT NULL;
ALTER TABLE "Application" ALTER COLUMN "years" DROP NOT NULL;
ALTER TABLE "Application" ALTER COLUMN "agent" DROP NOT NULL;
ALTER TABLE "Application" ALTER COLUMN "firstWeek" DROP NOT NULL;

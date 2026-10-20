-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productUrl" TEXT NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "salesTeam" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "years" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "firstWeek" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "tier" TEXT NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Application_email_key" ON "Application"("email");

-- CreateIndex
CREATE INDEX "Application_tier_createdAt_idx" ON "Application"("tier", "createdAt");

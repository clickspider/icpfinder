-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seed" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "totalCostCents" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clientIpHash" TEXT,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Run_clientIpHash_createdAt_idx" ON "Run"("clientIpHash", "createdAt");

-- CreateIndex
CREATE INDEX "Event_runId_createdAt_idx" ON "Event"("runId", "createdAt");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

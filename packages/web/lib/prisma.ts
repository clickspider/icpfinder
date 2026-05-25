// SPDX-License-Identifier: MIT

import { PrismaClient } from "@prisma/client";
import { NoopRunRecorder, PrismaRunRecorder, type RunRecorder } from "./run-recorder";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  runRecorder?: RunRecorder;
};

/**
 * Returns a singleton PrismaClient when DATABASE_URL is configured,
 * else null. Lazy: never constructs Prisma in environments where no
 * URL is present (which would throw on import).
 */
const getPrisma = (): PrismaClient | null => {
  if (!process.env.DATABASE_URL) return null;
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }
  return globalForPrisma.prisma;
};

export const getRunRecorder = (): RunRecorder => {
  if (globalForPrisma.runRecorder) return globalForPrisma.runRecorder;
  const prisma = getPrisma();
  globalForPrisma.runRecorder = prisma ? new PrismaRunRecorder(prisma) : new NoopRunRecorder();
  return globalForPrisma.runRecorder;
};

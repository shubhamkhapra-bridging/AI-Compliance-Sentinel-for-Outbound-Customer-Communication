import { prisma } from "../db/client";

// Shared read queries for validation results, reused by the public API-key
// plane (validate.ts) and the first-party JWT dashboard plane
// (tenantSettings.ts). Always scoped by tenantId for isolation.

export async function listValidations(tenantId: string, limit: number, offset: number) {
  const [validations, total] = await Promise.all([
    prisma.emailValidation.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.emailValidation.count({ where: { tenantId } }),
  ]);
  return { validations, total };
}

export async function validationStats(tenantId: string, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [total, passed, recent] = await Promise.all([
    prisma.emailValidation.count({ where: { tenantId } }),
    prisma.emailValidation.count({ where: { tenantId, passed: true } }),
    prisma.emailValidation.findMany({
      where: { tenantId, createdAt: { gte: since } },
      select: { createdAt: true, passed: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const flagged = total - passed;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  // Bucket by day for the dashboard time-series.
  const byDay = new Map<string, { date: string; passed: number; flagged: number }>();
  for (const row of recent) {
    const date = row.createdAt.toISOString().slice(0, 10);
    const bucket = byDay.get(date) ?? { date, passed: 0, flagged: 0 };
    if (row.passed) bucket.passed += 1;
    else bucket.flagged += 1;
    byDay.set(date, bucket);
  }

  return { total, passed, flagged, passRate, series: Array.from(byDay.values()) };
}

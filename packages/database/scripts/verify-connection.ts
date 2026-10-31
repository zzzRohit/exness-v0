import { prisma } from "@exness/database";

try {
  const rows = await prisma.$queryRaw<{ result: number }[]>`SELECT 1 AS result`;

  if (rows[0]?.result !== 1) {
    throw new Error("The database connection check returned an unexpected result.");
  }

  console.log("Database connection verified.");
} finally {
  await prisma.$disconnect();
}
